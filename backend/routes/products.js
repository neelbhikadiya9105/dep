const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Approval = require('../models/Approval');
const Inventory = require('../models/Inventory');
const { protect, authorize, blockSuperuser } = require('../middleware/auth');

router.use(protect, blockSuperuser);

// Helper: generate SKU
function generateSKU() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let sku = 'SKU-';
  for (let i = 0; i < 6; i++) sku += chars[Math.floor(Math.random() * chars.length)];
  return sku;
}

// GET /api/products/lookup?barcode=VALUE
router.get('/lookup', async (req, res) => {
  try {
    const { barcode } = req.query;
    if (!barcode) return res.status(400).json({ message: 'barcode query param required' });
    const filter = { barcode };
    if (req.user.storeId) filter.storeId = req.user.storeId;
    const product = await Product.findOne(filter).populate('createdBy', 'name');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const filter = {};
    // Scope products to the user's store for data isolation
    if (req.user.storeId) {
      filter.storeId = req.user.storeId;
    }
    const products = await Product.find(filter).populate('createdBy', 'name');

    // When the user belongs to a store, use Inventory quantities so the UI
    // always reflects the stock that was actually decremented on each sale.
    if (req.user.storeId) {
      const inventoryRecords = await Inventory.find({
        storeId: req.user.storeId,
        productId: { $in: products.map((p) => p._id) },
      });
      const inventoryMap = {};
      for (const inv of inventoryRecords) {
        inventoryMap[inv.productId.toString()] = inv.quantity;
      }
      const enriched = products.map((p) => {
        const obj = p.toJSON();
        if (inventoryMap[p._id.toString()] !== undefined) {
          obj.quantity = inventoryMap[p._id.toString()];
        }
        return obj;
      });
      return res.json(enriched);
    }

    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/products
router.post('/', authorize('owner', 'manager'), async (req, res) => {
  try {
    // Always inject storeId from the auth token — never trust the request body
    const storeId = req.user.storeId || null;
    const data = { ...req.body, createdBy: req.user.id, storeId };
    if (!data.sku) {
      // auto-generate unique SKU
      let sku, exists;
      do {
        sku = generateSKU();
        exists = await Product.findOne({ sku });
      } while (exists);
      data.sku = sku;
    }
    const product = await Product.create(data);

    // Auto-create Inventory record so product appears immediately in inventory view
    if (storeId) {
      const Inventory = require('../models/Inventory');
      await Inventory.findOneAndUpdate(
        { productId: product._id, storeId },
        {
          $setOnInsert: {
            productId: product._id,
            storeId,
            quantity: req.body.quantity || 0,
            threshold: req.body.threshold || 10,
          },
        },
        { upsert: true, new: true }
      );
    }

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/products/:id
router.put('/:id', authorize('owner', 'manager'), async (req, res) => {
  try {
    // Ensure storeId cannot be changed via the body
    const updateData = { ...req.body };
    delete updateData.storeId;

    const product = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (req.user.role === 'owner') {
      await product.deleteOne();
      return res.json({ message: 'Product deleted' });
    }

    if (req.user.role === 'manager') {
      const approval = await Approval.create({
        action: 'delete_product',
        description: `Manager ${req.user.name} requested deletion of product "${product.name}"`,
        requestedBy: req.user.id,
        metadata: { productId: product._id, productName: product.name }
      });
      return res.status(202).json({
        message: 'Deletion request submitted for owner approval',
        approval
      });
    }

    return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

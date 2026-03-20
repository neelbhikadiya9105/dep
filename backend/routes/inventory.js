const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const { protect, authorize, blockSuperuser } = require('../middleware/auth');

router.use(protect, blockSuperuser);

// GET /api/inventory
// Returns all inventory records for the user's store, plus any products that
// don't yet have an Inventory record (with quantity 0) so the view is always complete.
router.get('/', async (req, res) => {
  try {
    const storeId = req.user.storeId;
    if (!storeId) {
      return res.status(403).json({ message: 'No store assigned to your account' });
    }

    // Get existing inventory records for the store
    const records = await Inventory.find({ storeId })
      .populate('productId', 'name sku barcode category costPrice sellingPrice')
      .populate('storeId', 'name code');

    // Find products in this store that don't have an Inventory record yet
    const inventoriedProductIds = records
      .filter((r) => r.productId)
      .map((r) => r.productId._id.toString());

    const missingProducts = await Product.find({
      storeId,
      _id: { $nin: inventoriedProductIds },
    });

    // Build virtual inventory records for missing products (quantity 0)
    const virtualRecords = missingProducts.map((p) => ({
      _id: null,
      productId: p,
      storeId: { _id: storeId },
      quantity: 0,
      threshold: p.threshold || 10,
      updatedAt: p.createdAt,
    }));

    res.json([...records, ...virtualRecords]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/inventory/adjust
router.post('/adjust', authorize('owner', 'manager'), async (req, res) => {
  try {
    const { productId, quantity, threshold } = req.body;
    // Always use the storeId from the auth token — never trust the request body
    const storeId = req.user.storeId;
    if (!productId || !storeId)
      return res.status(400).json({ message: 'productId is required and store must be assigned to your account' });

    const update = { updatedAt: new Date() };
    if (quantity !== undefined) update.quantity = quantity;
    if (threshold !== undefined) update.threshold = threshold;

    const record = await Inventory.findOneAndUpdate(
      { productId, storeId },
      { $set: update },
      { upsert: true, new: true, runValidators: true }
    );
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

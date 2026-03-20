const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const { protect, blockSuperuser } = require('../middleware/auth');

router.use(protect, blockSuperuser);

// Helper: generate receipt number
function generateReceiptNumber() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RCP-${date}-${rand}`;
}

// POST /api/sales
router.post('/', async (req, res) => {
  try {
    const { items, totalAmount, paymentMethod, customerName } = req.body;
    if (!items || !items.length)
      return res.status(400).json({ message: 'No items in sale' });
    // Always inject storeId from auth token — never trust request body
    const storeId = req.user.storeId || null;

    const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const tax = 0;

    // Reduce product quantities
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) return res.status(404).json({ message: `Product ${item.productId} not found` });

      if (storeId) {
        // Multi-store: require Inventory record for this product+store
        const inv = await Inventory.findOne({ productId: item.productId, storeId });
        if (!inv) {
          return res.status(400).json({ message: `Product "${product.name}" is not available in this store's inventory` });
        }
        if (inv.quantity < item.qty)
          return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
        inv.quantity -= item.qty;
        inv.updatedAt = new Date();
        await inv.save();
      } else {
        if (product.quantity < item.qty)
          return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
        product.quantity -= item.qty;
        await product.save();
      }
    }

    // Generate unique receipt number
    let receiptNumber, exists;
    do {
      receiptNumber = generateReceiptNumber();
      exists = await Sale.findOne({ receiptNumber });
    } while (exists);

    const sale = await Sale.create({
      items,
      totalAmount,
      subtotal,
      tax,
      paymentMethod,
      customerName: customerName || 'Walk-in',
      employeeId: req.user.id,
      storeId: storeId || null,
      receiptNumber
    });

    res.status(201).json(sale);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/sales
router.get('/', async (req, res) => {
  try {
    // Scope sales to the user's store for data isolation
    const filter = {};
    if (req.user.storeId) filter.storeId = req.user.storeId;
    const sales = await Sale.find(filter)
      .populate('employeeId', 'name')
      .populate('storeId', 'name code')
      .sort({ createdAt: -1 });
    res.json(sales);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

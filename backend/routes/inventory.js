const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// GET /api/inventory?storeId=ID&productId=ID
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'manager' || req.user.role === 'staff') {
      if (!req.user.storeId) {
        return res.status(403).json({ message: 'No store assigned to your account' });
      }
      filter.storeId = req.user.storeId;
    } else {
      // owner: allow optional storeId query param
      if (req.query.storeId) filter.storeId = req.query.storeId;
    }
    if (req.query.productId) filter.productId = req.query.productId;
    const records = await Inventory.find(filter)
      .populate('productId', 'name sku category')
      .populate('storeId', 'name code');
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/inventory/adjust
router.post('/adjust', authorize('owner', 'manager'), async (req, res) => {
  try {
    const { productId, storeId, quantity, threshold } = req.body;
    if (!productId || !storeId)
      return res.status(400).json({ message: 'productId and storeId are required' });

    if (req.user.role === 'manager') {
      if (String(req.user.storeId) !== String(storeId)) {
        return res.status(403).json({ message: 'Managers can only adjust inventory for their own store' });
      }
    }

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

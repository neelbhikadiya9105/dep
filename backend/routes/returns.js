const express = require('express');
const router = express.Router();
const Return = require('../models/Return');
const Inventory = require('../models/Inventory');
const { protect, blockSuperuser } = require('../middleware/auth');

router.use(protect, blockSuperuser);

// Reasons that trigger auto-restock
const RESTOCK_REASONS = ['wrong_item', 'others'];

// POST /api/returns
router.post('/', async (req, res) => {
  try {
    const { saleId, productId, quantity, reason, refundAmount } = req.body;
    if (!saleId || !productId || !quantity || !reason || refundAmount === undefined)
      return res.status(400).json({ message: 'Missing required fields' });

    const validReasons = ['defective', 'wrong_item', 'others'];
    if (!validReasons.includes(reason))
      return res.status(400).json({ message: 'Invalid return reason. Must be defective, wrong_item, or others.' });

    // Check for duplicate return (same item from same sale)
    const existingReturn = await Return.findOne({ saleId, productId });
    if (existingReturn) {
      return res.status(400).json({ message: 'This item has already been returned.' });
    }

    // Inject storeId from auth token for data isolation
    const storeId = req.user.storeId || null;

    // Restock only for wrong_item and others; defective items are not restocked
    if (RESTOCK_REASONS.includes(reason) && storeId) {
      const inv = await Inventory.findOne({ productId, storeId });
      if (inv) {
        inv.quantity += quantity;
        inv.updatedAt = new Date();
        await inv.save();
      }
    }

    const ret = await Return.create({
      saleId,
      productId,
      storeId,
      quantity,
      reason,
      refundAmount,
      processedBy: req.user.id,
    });

    res.status(201).json(ret);
  } catch (err) {
    // Handle MongoDB duplicate key error (unique index) as a fallback
    if (err.code === 11000) {
      return res.status(400).json({ message: 'This item has already been returned.' });
    }
    res.status(500).json({ message: err.message });
  }
});

// GET /api/returns
router.get('/', async (req, res) => {
  try {
    // Scope returns to the user's store for data isolation
    const filter = {};
    if (req.user.storeId) filter.storeId = req.user.storeId;
    const returns = await Return.find(filter)
      .populate('saleId')
      .populate('productId', 'name')
      .populate('processedBy', 'name')
      .sort({ createdAt: -1 });
    res.json(returns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

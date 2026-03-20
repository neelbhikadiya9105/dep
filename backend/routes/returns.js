const express = require('express');
const router = express.Router();
const Return = require('../models/Return');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

router.use(protect);

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

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Restock only for wrong_item and others; defective items are not restocked
    if (RESTOCK_REASONS.includes(reason)) {
      product.quantity += quantity;
      await product.save();
    }

    const ret = await Return.create({
      saleId,
      productId,
      quantity,
      reason,
      refundAmount,
      processedBy: req.user.id
    });

    res.status(201).json(ret);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/returns
router.get('/', async (req, res) => {
  try {
    const returns = await Return.find()
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

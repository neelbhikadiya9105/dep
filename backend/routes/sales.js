const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

router.use(protect);

// POST /api/sales
router.post('/', async (req, res) => {
  try {
    const { items, totalAmount, paymentMethod, customerName } = req.body;
    if (!items || !items.length)
      return res.status(400).json({ message: 'No items in sale' });

    // Reduce product quantities
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) return res.status(404).json({ message: `Product ${item.productId} not found` });
      if (product.quantity < item.qty)
        return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
      product.quantity -= item.qty;
      await product.save();
    }

    const sale = await Sale.create({
      items,
      totalAmount,
      paymentMethod,
      customerName: customerName || 'Walk-in',
      employeeId: req.user.id
    });

    res.status(201).json(sale);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/sales
router.get('/', async (req, res) => {
  try {
    const sales = await Sale.find()
      .populate('employeeId', 'name')
      .sort({ createdAt: -1 });
    res.json(sales);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

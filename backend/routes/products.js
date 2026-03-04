const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Approval = require('../models/Approval');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().populate('createdBy', 'name');
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/products
router.post('/', authorize('owner', 'manager'), async (req, res) => {
  try {
    const product = await Product.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/products/:id
router.put('/:id', authorize('owner', 'manager'), async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
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

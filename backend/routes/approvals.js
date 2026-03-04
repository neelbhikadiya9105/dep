const express = require('express');
const router = express.Router();
const Approval = require('../models/Approval');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// GET /api/approvals
router.get('/', async (req, res) => {
  try {
    let filter = {};
    if (req.user.role !== 'owner') {
      filter.requestedBy = req.user.id;
    }
    const approvals = await Approval.find(filter)
      .populate('requestedBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(approvals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/approvals
router.post('/', async (req, res) => {
  try {
    const { action, description, metadata } = req.body;
    if (!action || !description)
      return res.status(400).json({ message: 'Action and description required' });

    const approval = await Approval.create({
      action,
      description,
      requestedBy: req.user.id,
      metadata
    });
    res.status(201).json(approval);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/approvals/:id
router.put('/:id', authorize('owner'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status))
      return res.status(400).json({ message: 'Status must be approved or rejected' });

    const approval = await Approval.findByIdAndUpdate(
      req.params.id,
      { status, approvedBy: req.user.id, updatedAt: new Date() },
      { new: true }
    ).populate('requestedBy', 'name email').populate('approvedBy', 'name email');

    if (!approval) return res.status(404).json({ message: 'Approval not found' });

    // If approved product deletion, delete the product
    if (approval.action === 'delete_product' && status === 'approved' && approval.metadata?.productId) {
      const Product = require('../models/Product');
      await Product.findByIdAndDelete(approval.metadata.productId);
    }

    res.json(approval);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

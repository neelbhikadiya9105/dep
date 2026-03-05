const express = require('express');
const router = express.Router();
const Approval = require('../models/Approval');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// GET /api/approvals/pending-users — list pending users (owner + manager)
router.get('/pending-users', authorize('owner', 'manager'), async (req, res) => {
  try {
    const users = await User.find({ status: 'pending' })
      .select('-passwordHash')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/approvals/users/:id/approve — approve user (owner + manager)
router.put('/users/:id/approve', authorize('owner', 'manager'), async (req, res) => {
  try {
    const { role, storeId } = req.body;

    if (req.user.role === 'manager') {
      if (role && role !== 'staff') {
        return res.status(403).json({ success: false, message: 'Managers can only approve staff accounts' });
      }
      if (storeId && String(storeId) !== String(req.user.storeId)) {
        return res.status(403).json({ success: false, message: 'Managers can only approve users for their own store' });
      }
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.status = 'approved';
    if (role) user.role = role;
    if (storeId) user.storeId = storeId;
    await user.save({ validateBeforeSave: false });

    await AuditLog.create({
      actorId: req.user.id,
      targetId: user._id,
      action: 'approve_user',
      metadata: { role: user.role, storeId: user.storeId },
      storeId: user.storeId || null
    });

    await Notification.create({
      userId: user._id,
      type: 'account_approved',
      title: 'Account Approved',
      message: 'Your account has been approved. You can now log in.'
    });

    res.json({ success: true, message: 'User approved', data: { id: user._id, status: user.status } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/approvals/users/:id/reject — reject user (owner + manager)
router.put('/users/:id/reject', authorize('owner', 'manager'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.status = 'rejected';
    await user.save({ validateBeforeSave: false });

    await AuditLog.create({
      actorId: req.user.id,
      targetId: user._id,
      action: 'reject_user'
    });

    await Notification.create({
      userId: user._id,
      type: 'account_rejected',
      title: 'Account Rejected',
      message: 'Your account registration has been rejected. Please contact an administrator.'
    });

    res.json({ success: true, message: 'User rejected' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

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

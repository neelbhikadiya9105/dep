const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Store = require('../models/Store');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// GET /api/employees — owner: all, manager: own store
router.get('/', async (req, res) => {
  try {
    let filter = { role: { $in: ['manager', 'staff'] } };
    if (req.user.role === 'manager') {
      if (!req.user.storeId) return res.json({ success: true, data: [] });
      filter.storeId = req.user.storeId;
    } else if (req.user.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const employees = await User.find(filter)
      .select('-passwordHash')
      .populate('storeId', 'name code')
      .sort({ name: 1 });
    res.json({ success: true, data: employees });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/employees/:id
router.get('/:id', authorize('owner', 'manager'), async (req, res) => {
  try {
    const employee = await User.findById(req.params.id)
      .select('-passwordHash')
      .populate('storeId', 'name code');
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    // Manager can only view employees in their store
    if (req.user.role === 'manager' && String(employee.storeId?._id) !== String(req.user.storeId)) {
      return res.status(403).json({ success: false, message: 'Forbidden: cross-store access denied' });
    }

    res.json({ success: true, data: employee });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/employees/:id/promote — promote staff → manager
router.put('/:id/promote', authorize('owner', 'manager'), async (req, res) => {
  try {
    if (req.user.role === 'manager') {
      return res.status(403).json({ success: false, message: 'Managers cannot promote employees to Manager role' });
    }
    const employee = await User.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    if (employee.role !== 'staff') {
      return res.status(400).json({ success: false, message: 'Only staff members can be promoted to manager' });
    }

    employee.role = 'manager';
    await employee.save({ validateBeforeSave: false });

    await AuditLog.create({
      actorId: req.user.id,
      targetId: employee._id,
      action: 'promote_employee',
      metadata: { from: 'staff', to: 'manager' },
      storeId: employee.storeId || null
    });

    await Notification.create({
      userId: employee._id,
      type: 'role_change',
      title: 'Role Updated',
      message: 'You have been promoted to Manager.'
    });

    res.json({ success: true, data: { id: employee._id, role: employee.role }, message: 'Employee promoted to manager' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/employees/:id/demote — demote manager → staff (owner only)
router.put('/:id/demote', authorize('owner'), async (req, res) => {
  try {
    const employee = await User.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    if (employee.role !== 'manager') {
      return res.status(400).json({ success: false, message: 'Only managers can be demoted to staff' });
    }

    employee.role = 'staff';
    await employee.save({ validateBeforeSave: false });

    await AuditLog.create({
      actorId: req.user.id,
      targetId: employee._id,
      action: 'demote_employee',
      metadata: { from: 'manager', to: 'staff' },
      storeId: employee.storeId || null
    });

    await Notification.create({
      userId: employee._id,
      type: 'role_change',
      title: 'Role Updated',
      message: 'Your role has been changed to Staff.'
    });

    res.json({ success: true, data: { id: employee._id, role: employee.role }, message: 'Employee demoted to staff' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/employees/:id/transfer — transfer to another store (owner only)
router.put('/:id/transfer', authorize('owner'), async (req, res) => {
  try {
    const { storeId } = req.body;
    if (!storeId) return res.status(400).json({ success: false, message: 'storeId is required' });

    const employee = await User.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const prevStoreId = employee.storeId;
    employee.storeId = storeId;
    await employee.save({ validateBeforeSave: false });

    await AuditLog.create({
      actorId: req.user.id,
      targetId: employee._id,
      action: 'transfer_employee',
      metadata: { from: prevStoreId, to: storeId },
      storeId
    });

    await Notification.create({
      userId: employee._id,
      type: 'store_transfer',
      title: 'Store Transfer',
      message: 'You have been transferred to a new store.'
    });

    res.json({ success: true, data: { id: employee._id, storeId: employee.storeId }, message: 'Employee transferred' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/employees/:id/suspend — suspend account (owner only)
router.put('/:id/suspend', authorize('owner'), async (req, res) => {
  try {
    const employee = await User.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    if (employee.role === 'owner') {
      return res.status(400).json({ success: false, message: 'Cannot suspend owner account' });
    }

    employee.status = 'suspended';
    await employee.save({ validateBeforeSave: false });

    await AuditLog.create({
      actorId: req.user.id,
      targetId: employee._id,
      action: 'suspend_employee',
      storeId: employee.storeId || null
    });

    res.json({ success: true, message: 'Employee suspended' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/employees/:id — remove employee (owner only)
router.delete('/:id', authorize('owner'), async (req, res) => {
  try {
    const employee = await User.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    if (employee.role === 'owner') {
      return res.status(400).json({ success: false, message: 'Cannot remove owner account' });
    }

    await User.findByIdAndDelete(req.params.id);

    await Store.updateMany({ managerId: employee._id }, { managerId: null });

    await AuditLog.create({
      actorId: req.user.id,
      targetId: employee._id,
      action: 'remove_employee',
      storeId: employee.storeId || null
    });

    res.json({ success: true, message: 'Employee removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

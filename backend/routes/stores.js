const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Store = require('../models/Store');
const User = require('../models/User');
const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory');
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// GET /api/stores
router.get('/', async (req, res) => {
  try {
    if (req.user.role === 'owner') {
      const stores = await Store.find().populate('managerId', 'name email').sort({ name: 1 });
      return res.json(stores);
    }
    // manager/staff — return only their assigned store
    if (!req.user.storeId) return res.json([]);
    const store = await Store.findById(req.user.storeId).populate('managerId', 'name email');
    return res.json(store ? [store] : []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/stores
router.post('/', authorize('owner'), async (req, res) => {
  try {
    const store = await Store.create(req.body);
    await AuditLog.create({
      actorId: req.user.id,
      action: 'create_store',
      metadata: { storeId: store._id, name: store.name }
    });
    res.status(201).json(store);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/stores/:id
router.put('/:id', authorize('owner'), async (req, res) => {
  try {
    // Prevent overriding manager assignment via this endpoint
    const { managerId, ...updateData } = req.body;
    const store = await Store.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    }).populate('managerId', 'name email');
    if (!store) return res.status(404).json({ message: 'Store not found' });
    await AuditLog.create({
      actorId: req.user.id,
      action: 'update_store',
      metadata: { storeId: store._id, name: store.name }
    });
    res.json(store);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/stores/:id — soft-delete
router.delete('/:id', authorize('owner'), async (req, res) => {
  try {
    const store = await Store.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive', isActive: false },
      { new: true }
    );
    if (!store) return res.status(404).json({ message: 'Store not found' });
    await AuditLog.create({
      actorId: req.user.id,
      action: 'delete_store',
      metadata: { storeId: store._id, name: store.name }
    });
    res.json({ message: 'Store deactivated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/stores/:id/manager — assign manager (owner only)
router.put('/:id/manager', authorize('owner'), async (req, res) => {
  try {
    const { managerId } = req.body;
    const store = await Store.findById(req.params.id);
    if (!store) return res.status(404).json({ success: false, message: 'Store not found' });

    if (managerId) {
      const manager = await User.findById(managerId);
      if (!manager) return res.status(404).json({ success: false, message: 'User not found' });
      if (!['manager', 'owner'].includes(manager.role)) {
        return res.status(400).json({ success: false, message: 'User must have manager or owner role' });
      }
    }

    store.managerId = managerId || null;
    await store.save();

    const populated = await Store.findById(store._id).populate('managerId', 'name email');
    await AuditLog.create({
      actorId: req.user.id,
      action: 'assign_store_manager',
      metadata: { storeId: store._id, managerId: managerId || null }
    });
    res.json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/stores/:id/stats
router.get('/:id/stats', authorize('owner', 'manager'), async (req, res) => {
  try {
    const storeId = req.params.id;

    // Managers can only view stats for their own store
    if (req.user.role === 'manager' && String(req.user.storeId) !== String(storeId)) {
      return res.status(403).json({ success: false, message: 'Managers can only view stats for their own store' });
    }

    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    // Daily sales
    const storeObjId = new mongoose.Types.ObjectId(storeId);
    const dailySalesAgg = await Sale.aggregate([
      { $match: { storeId: storeObjId, createdAt: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const dailySales = dailySalesAgg[0]?.total || 0;

    // Monthly sales
    const monthlySalesAgg = await Sale.aggregate([
      { $match: { storeId: storeObjId, createdAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
    ]);
    const monthlySales = monthlySalesAgg[0]?.total || 0;
    const monthlySalesCount = monthlySalesAgg[0]?.count || 0;

    // Total sales count
    const totalSalesCount = await Sale.countDocuments({ storeId });

    // Total staff (approved users assigned to this store)
    const totalStaff = await User.countDocuments({ storeId, status: 'approved' });

    // Inventory value and low stock count
    const inventoryRecords = await Inventory.find({ storeId }).populate('productId', 'sellingPrice');
    let inventoryValue = 0;
    let lowStockCount = 0;
    for (const record of inventoryRecords) {
      const price = record.productId?.sellingPrice || 0;
      inventoryValue += record.quantity * price;
      if (record.quantity <= record.threshold) {
        lowStockCount++;
      }
    }

    res.json({
      success: true,
      data: {
        dailySales,
        dailyProfit: dailySales * 0.2,
        monthlySales,
        monthlyProfit: monthlySales * 0.2,
        monthlySalesCount,
        totalSalesCount,
        totalStaff,
        inventoryValue,
        lowStockCount
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

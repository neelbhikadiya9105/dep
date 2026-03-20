const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Store = require('../models/Store');
const AccessRequest = require('../models/AccessRequest');
const Subscription = require('../models/Subscription');
const Coupon = require('../models/Coupon');
const FeatureFlag = require('../models/FeatureFlag');
const ActivityLog = require('../models/ActivityLog');
const Message = require('../models/Message');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const { protect, authorize } = require('../middleware/auth');
const { logActivity } = require('../middleware/logger');
const { sendEmail, shopSuspendedEmail } = require('../services/email');

router.use(protect, authorize('superuser'));

// ═══════════════════════════════════════════════════════════════════════════
// ACCESS REQUESTS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/access-requests', async (req, res) => {
  try {
    const requests = await AccessRequest.find()
      .populate('reviewedBy', 'name')
      .populate('createdOwner', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/access-requests/:id/approve', async (req, res) => {
  try {
    const request = await AccessRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'pending')
      return res.status(400).json({ success: false, message: 'Request already processed' });

    const existing = await User.findOne({ email: request.email });
    if (existing)
      return res.status(400).json({ success: false, message: 'A user with this email already exists' });

    const store = await Store.create({
      name: request.businessName || `${request.name}'s Store`,
      code: `STR-${Date.now().toString(36).toUpperCase()}`,
      status: 'trial',
      trialExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    });

    // Use owner-chosen password hash if available; else generate a temp password
    let passwordValue;
    let mustChangePassword = false;
    if (request.passwordHash) {
      passwordValue = request.passwordHash;
    } else {
      const { randomBytes } = require('crypto');
      passwordValue = randomBytes(6).toString('base64url').slice(0, 10) + 'A1!';
      mustChangePassword = true;
    }

    const owner = await User.create({
      name: request.name,
      email: request.email,
      passwordHash: passwordValue,
      role: 'owner',
      status: 'approved',
      storeId: store._id,
      mustChangePassword,
    });

    store.ownerId = owner._id;
    await store.save();

    await Subscription.create({
      storeId: store._id,
      plan: 'free',
      status: 'trial',
      trialExpiresAt: store.trialExpiresAt,
    });

    const defaults = FeatureFlag.getDefaults('free');
    await FeatureFlag.create({ storeId: store._id, features: defaults });

    request.status = 'approved';
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    request.createdOwner = owner._id;
    await request.save();

    await logActivity(req.user, 'shop.approved', {
      storeId: store._id,
      targetId: owner._id,
      targetType: 'user',
      metadata: { ownerEmail: owner.email, storeName: store.name },
    });

    const resp = {
      success: true,
      message: 'Access request approved. Owner account created.',
      owner: { id: owner._id, name: owner.name, email: owner.email },
      store: { id: store._id, name: store.name, code: store.code },
    };
    if (mustChangePassword) {
      resp.tempPassword = passwordValue;
      resp.message += ' A temporary password was generated — share it securely.';
    }
    res.json(resp);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/access-requests/:id/reject', async (req, res) => {
  try {
    const request = await AccessRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'pending')
      return res.status(400).json({ success: false, message: 'Request already processed' });

    request.status = 'rejected';
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    await request.save();

    await logActivity(req.user, 'shop.rejected', {
      metadata: { email: request.email, reason: req.body.reason },
    });

    res.json({ success: true, message: 'Access request rejected.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SHOP MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

router.get('/shops', async (req, res) => {
  try {
    const { status, plan, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (plan) filter.plan = plan;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const stores = await Store.find(filter)
      .populate('ownerId', 'name email lastLogin')
      .populate('managerId', 'name email')
      .sort({ createdAt: -1 });

    const storeIds = stores.map((s) => s._id);
    const subs = await Subscription.find({ storeId: { $in: storeIds } });
    const subMap = {};
    subs.forEach((s) => { subMap[s.storeId.toString()] = s; });

    const data = stores.map((store) => {
      const s = store.toObject();
      s.subscription = subMap[store._id.toString()] || null;
      return s;
    });

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/shops/:id', async (req, res) => {
  try {
    const store = await Store.findById(req.params.id)
      .populate('ownerId', 'name email lastLogin status')
      .populate('managerId', 'name email');
    if (!store) return res.status(404).json({ success: false, message: 'Shop not found' });

    const [sub, flags, totalOrders, totalProducts] = await Promise.all([
      Subscription.findOne({ storeId: store._id }),
      FeatureFlag.findOne({ storeId: store._id }),
      Sale.countDocuments({ storeId: store._id }).catch(() => 0),
      Product.countDocuments({ storeId: store._id }).catch(() => 0),
    ]);

    res.json({ success: true, data: { ...store.toObject(), subscription: sub, featureFlags: flags, totalOrders, totalProducts } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/shops/:id/approve', async (req, res) => {
  try {
    const store = await Store.findByIdAndUpdate(req.params.id, { status: 'active', isActive: true }, { new: true });
    if (!store) return res.status(404).json({ success: false, message: 'Shop not found' });
    await Subscription.findOneAndUpdate({ storeId: store._id }, { status: 'active' });
    await logActivity(req.user, 'shop.approved', { storeId: store._id, targetId: store._id, targetType: 'store' });
    res.json({ success: true, message: 'Shop approved and activated.', store });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/shops/:id/reject', async (req, res) => {
  try {
    const store = await Store.findByIdAndUpdate(req.params.id, { status: 'inactive', isActive: false }, { new: true });
    if (!store) return res.status(404).json({ success: false, message: 'Shop not found' });
    await logActivity(req.user, 'shop.rejected', { storeId: store._id, metadata: { reason: req.body.reason } });
    res.json({ success: true, message: 'Shop rejected.', store });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/shops/:id/suspend', async (req, res) => {
  try {
    const store = await Store.findByIdAndUpdate(req.params.id, { status: 'suspended', isActive: false }, { new: true })
      .populate('ownerId', 'name email');
    if (!store) return res.status(404).json({ success: false, message: 'Shop not found' });

    if (store.ownerId) {
      await User.findByIdAndUpdate(store.ownerId._id, { status: 'suspended' });
      const emailTpl = shopSuspendedEmail(store.ownerId.name);
      sendEmail({ to: store.ownerId.email, ...emailTpl }).catch(() => {});
    }

    await logActivity(req.user, 'shop.suspended', { storeId: store._id, metadata: { reason: req.body.reason } });
    res.json({ success: true, message: 'Shop suspended.', store });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/shops/:id/unsuspend', async (req, res) => {
  try {
    const store = await Store.findByIdAndUpdate(req.params.id, { status: 'active', isActive: true }, { new: true })
      .populate('ownerId', 'name email');
    if (!store) return res.status(404).json({ success: false, message: 'Shop not found' });
    if (store.ownerId) await User.findByIdAndUpdate(store.ownerId._id, { status: 'approved' });
    await logActivity(req.user, 'shop.unsuspended', { storeId: store._id });
    res.json({ success: true, message: 'Shop unsuspended.', store });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/shops/:id', async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store) return res.status(404).json({ success: false, message: 'Shop not found' });
    const storeData = { name: store.name, id: store._id };

    await Promise.all([
      User.deleteMany({ storeId: store._id }),
      Subscription.deleteMany({ storeId: store._id }),
      FeatureFlag.deleteMany({ storeId: store._id }),
      Sale.deleteMany({ storeId: store._id }).catch(() => {}),
      Product.deleteMany({ storeId: store._id }).catch(() => {}),
      store.deleteOne(),
    ]);

    await logActivity(req.user, 'shop.deleted', { metadata: { storeName: storeData.name, storeId: storeData.id } });
    res.json({ success: true, message: 'Shop and all associated data permanently deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/shops/:id/extend-trial', async (req, res) => {
  try {
    const { days } = req.body;
    if (!days || days < 1) return res.status(400).json({ success: false, message: 'Provide a positive number of days' });

    const store = await Store.findById(req.params.id);
    if (!store) return res.status(404).json({ success: false, message: 'Shop not found' });

    const base = store.trialExpiresAt && store.trialExpiresAt > new Date() ? store.trialExpiresAt : new Date();
    store.trialExpiresAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    if (store.status === 'expired') store.status = 'trial';
    await store.save();

    await Subscription.findOneAndUpdate(
      { storeId: store._id },
      { trialExpiresAt: store.trialExpiresAt, status: 'trial' }
    );

    await logActivity(req.user, 'shop.trial_extended', { storeId: store._id, metadata: { days, newExpiry: store.trialExpiresAt } });
    res.json({ success: true, message: `Trial extended by ${days} day(s).`, trialExpiresAt: store.trialExpiresAt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/shops/:id/override-plan', async (req, res) => {
  try {
    const { plan, reason } = req.body;
    if (!plan || !['free', 'basic', 'pro'].includes(plan))
      return res.status(400).json({ success: false, message: 'Plan must be free, basic, or pro' });

    const store = await Store.findByIdAndUpdate(req.params.id, { plan, status: 'active', isActive: true }, { new: true });
    if (!store) return res.status(404).json({ success: false, message: 'Shop not found' });

    await Subscription.findOneAndUpdate({ storeId: store._id }, { plan, status: 'active' });

    const defaults = FeatureFlag.getDefaults(plan);
    await FeatureFlag.findOneAndUpdate(
      { storeId: store._id },
      { features: defaults },
      { upsert: true, new: true }
    );

    await logActivity(req.user, 'shop.plan_overridden', {
      storeId: store._id,
      metadata: { plan, reason: reason || '', overriddenBy: req.user.email },
    });

    res.json({ success: true, message: `Plan overridden to ${plan}.`, store });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// OWNER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

router.get('/owners', async (req, res) => {
  try {
    const owners = await User.find({ role: 'owner' })
      .select('-passwordHash')
      .populate('storeId', 'name code status plan')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: owners });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/owners/:id/deactivate', async (req, res) => {
  try {
    const owner = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'owner' },
      { status: 'deactivated' },
      { new: true }
    ).select('-passwordHash');
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });
    await logActivity(req.user, 'owner.deactivated', { targetId: owner._id, targetType: 'user' });
    res.json({ success: true, message: 'Owner deactivated', owner });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/owners/:id/activate', async (req, res) => {
  try {
    const owner = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'owner' },
      { status: 'approved' },
      { new: true }
    ).select('-passwordHash');
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });
    await logActivity(req.user, 'owner.activated', { targetId: owner._id, targetType: 'user' });
    res.json({ success: true, message: 'Owner activated', owner });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/owners/:id', async (req, res) => {
  try {
    const owner = await User.findOneAndDelete({ _id: req.params.id, role: 'owner' });
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });
    await logActivity(req.user, 'owner.deleted', { targetId: req.params.id, targetType: 'user' });
    res.json({ success: true, message: 'Owner deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// FEATURE FLAGS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/feature-flags/:storeId', async (req, res) => {
  try {
    const flags = await FeatureFlag.findOne({ storeId: req.params.storeId });
    if (!flags) return res.status(404).json({ success: false, message: 'Feature flags not found for this store' });
    res.json({ success: true, data: flags });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/feature-flags/:storeId', async (req, res) => {
  try {
    const { features } = req.body;
    if (!features || typeof features !== 'object')
      return res.status(400).json({ success: false, message: 'features object required' });

    const updateFields = {};
    Object.entries(features).forEach(([k, v]) => { updateFields[`features.${k}`] = v; });

    const flags = await FeatureFlag.findOneAndUpdate(
      { storeId: req.params.storeId },
      { $set: updateFields },
      { new: true, upsert: true }
    );

    await logActivity(req.user, 'feature_flags.updated', {
      storeId: req.params.storeId,
      metadata: { changes: features },
    });

    res.json({ success: true, message: 'Feature flags updated.', data: flags });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// COUPONS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/coupons', async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json({ success: true, data: coupons });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/coupons', async (req, res) => {
  try {
    const { code, discount, discountType, expiresAt, usageLimit, applicablePlans } = req.body;
    if (!code || !discount) return res.status(400).json({ success: false, message: 'code and discount are required' });

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      discount,
      discountType,
      expiresAt: expiresAt || null,
      usageLimit: usageLimit || 0,
      applicablePlans: applicablePlans || ['free', 'basic', 'pro'],
      createdBy: req.user.id,
    });

    await logActivity(req.user, 'coupon.created', { targetId: coupon._id, targetType: 'coupon', metadata: { code: coupon.code } });
    res.status(201).json({ success: true, message: 'Coupon created.', data: coupon });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'Coupon code already exists' });
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/coupons/:id', async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    res.json({ success: true, data: coupon });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/coupons/:id', async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    await logActivity(req.user, 'coupon.deleted', { targetId: req.params.id, targetType: 'coupon' });
    res.json({ success: true, message: 'Coupon deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

router.get('/dashboard', async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      activeShops,
      trialShops,
      pendingRequests,
      newShopsThisMonth,
      shopStatusBreakdown,
      allSubs,
      signupHistory,
    ] = await Promise.all([
      User.countDocuments(),
      Store.countDocuments({ status: 'active' }),
      Store.countDocuments({ status: 'trial' }),
      AccessRequest.countDocuments({ status: 'pending' }),
      Store.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Store.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Subscription.find({ status: 'active' }),
      Store.aggregate([
        { $match: { createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } } },
        { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
    ]);

  // Monthly plan prices in INR (₹) — used to estimate MRR
    const PLAN_PRICE = { free: 0, basic: 999, pro: 2999 };
    const mrr = allSubs.reduce((sum, s) => sum + (PLAN_PRICE[s.plan] || 0), 0);

    const mrrHistory = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      return {
        month: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
        // Historical MRR data is not persisted; only the current month reflects live subscriptions.
        // Future improvement: store monthly MRR snapshots in a TimeSeries collection.
        mrr: i === 11 ? mrr : 0,
      };
    });

    const statusMap = {};
    shopStatusBreakdown.forEach((s) => { statusMap[s._id] = s.count; });

    res.json({
      success: true,
      data: { totalUsers, activeShops, trialShops, pendingRequests, newShopsThisMonth, mrr, shopStatusBreakdown: statusMap, mrrHistory, signupHistory },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// LOGS & AUDIT TRAIL
// ═══════════════════════════════════════════════════════════════════════════

router.get('/logs', async (req, res) => {
  try {
    const { storeId, action, actorRole, from, to, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (storeId) filter.storeId = storeId;
    if (action) filter.action = { $regex: action, $options: 'i' };
    if (actorRole) filter.actorRole = actorRole;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter)
        .populate('actorId', 'name email role')
        .populate('storeId', 'name code')
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      ActivityLog.countDocuments(filter),
    ]);

    res.json({ success: true, data: logs, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// COMMUNICATIONS
// ═══════════════════════════════════════════════════════════════════════════

router.post('/messages/broadcast', async (req, res) => {
  try {
    const { subject, body } = req.body;
    if (!subject || !body) return res.status(400).json({ success: false, message: 'subject and body are required' });

    const owners = await User.find({ role: 'owner', status: 'approved' }).select('_id name email');

    const msgs = owners.map((o) => ({
      fromId: req.user.id,
      toId: o._id,
      subject,
      body,
      isBroadcast: true,
    }));
    if (msgs.length) await Message.insertMany(msgs);

    owners.forEach((o) => {
      sendEmail({ to: o.email, subject, html: `<p>${body.replace(/\n/g, '<br>')}</p>`, text: body }).catch(() => {});
    });

    await logActivity(req.user, 'message.broadcast', { metadata: { subject, recipientCount: owners.length } });
    res.json({ success: true, message: `Broadcast sent to ${owners.length} owner(s).` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/messages/send', async (req, res) => {
  try {
    const { toId, subject, body } = req.body;
    if (!toId || !subject || !body) return res.status(400).json({ success: false, message: 'toId, subject, and body are required' });

    const recipient = await User.findById(toId).select('name email');
    if (!recipient) return res.status(404).json({ success: false, message: 'Recipient not found' });

    const msg = await Message.create({ fromId: req.user.id, toId, subject, body });
    sendEmail({ to: recipient.email, subject, html: `<p>${body.replace(/\n/g, '<br>')}</p>`, text: body }).catch(() => {});

    await logActivity(req.user, 'message.sent', { targetId: toId, targetType: 'user', metadata: { subject } });
    res.status(201).json({ success: true, message: 'Message sent.', data: msg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/messages/sent', async (req, res) => {
  try {
    const messages = await Message.find({ fromId: req.user.id })
      .populate('toId', 'name email')
      .sort({ sentAt: -1 })
      .limit(100);
    res.json({ success: true, data: messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

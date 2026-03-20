const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Store = require('../models/Store');
const AccessRequest = require('../models/AccessRequest');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('superuser'));

// GET /api/superuser/access-requests — list all requests
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

// POST /api/superuser/access-requests — submit a request (public-ish, but we protect at superuser level for review)
// This route returns early because it's unauthenticated-friendly — but we keep it under protect for now
// A separate public endpoint is in auth.js

// POST /api/superuser/access-requests/:id/approve — approve request, create Owner + Store
router.post('/access-requests/:id/approve', async (req, res) => {
  try {
    const request = await AccessRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'pending')
      return res.status(400).json({ success: false, message: 'Request already processed' });

    // Check if email already exists
    const existing = await User.findOne({ email: request.email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists' });
    }

    // Create a new Store for this owner
    const store = await Store.create({
      name: request.businessName || `${request.name}'s Store`,
      code: `STR-${Date.now().toString(36).toUpperCase()}`,
      createdBy: req.user.id,
    });

    // Create owner user with secure random temp password
    const { randomBytes } = require('crypto');
    const tempPassword = randomBytes(6).toString('base64url').slice(0, 10) + 'A1!';
    const owner = await User.create({
      name: request.name,
      email: request.email,
      passwordHash: tempPassword,
      role: 'owner',
      status: 'approved',
      storeId: store._id,
      mustChangePassword: true,
    });

    // Update store with owner
    store.ownerId = owner._id;
    await store.save();

    // Mark request approved
    request.status = 'approved';
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    request.createdOwner = owner._id;
    await request.save();

    res.json({
      success: true,
      message: 'Access request approved. Owner account created.',
      owner: { id: owner._id, name: owner.name, email: owner.email },
      store: { id: store._id, name: store.name, code: store.code },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/superuser/access-requests/:id/reject
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

    res.json({ success: true, message: 'Access request rejected.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/superuser/owners — list all owners
router.get('/owners', async (req, res) => {
  try {
    const owners = await User.find({ role: 'owner' })
      .select('-passwordHash')
      .populate('storeId', 'name code')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: owners });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/superuser/owners/:id/deactivate
router.put('/owners/:id/deactivate', async (req, res) => {
  try {
    const owner = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'owner' },
      { status: 'deactivated' },
      { new: true }
    ).select('-passwordHash');
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });
    res.json({ success: true, message: 'Owner deactivated', owner });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/superuser/owners/:id/activate
router.put('/owners/:id/activate', async (req, res) => {
  try {
    const owner = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'owner' },
      { status: 'approved' },
      { new: true }
    ).select('-passwordHash');
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });
    res.json({ success: true, message: 'Owner activated', owner });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/superuser/owners/:id
router.delete('/owners/:id', async (req, res) => {
  try {
    const owner = await User.findOneAndDelete({ _id: req.params.id, role: 'owner' });
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });
    res.json({ success: true, message: 'Owner deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

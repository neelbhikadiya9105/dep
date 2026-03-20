const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const signToken = (user) =>
  jwt.sign(
    { id: user._id, name: user.name, email: user.email, role: user.role, storeId: user.storeId || null },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    if (user.status === 'pending')
      return res.status(403).json({ success: false, message: 'Your account is pending approval' });

    if (user.status === 'rejected')
      return res.status(403).json({ success: false, message: 'Your account registration was rejected' });

    if (user.status === 'suspended')
      return res.status(403).json({ success: false, message: 'Your account has been suspended' });

    if (user.status === 'deactivated')
      return res.status(403).json({ success: false, message: 'Your account has been deactivated' });

    if (user.status !== 'approved')
      return res.status(403).json({ success: false, message: 'Account is not approved' });

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken(user);
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        storeId: user.storeId || null,
        mustChangePassword: user.mustChangePassword
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Name, email, and password required' });

    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters with one uppercase letter, one number, and one special character'
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ success: false, message: 'Email already in use' });

    const user = await User.create({
      name,
      email,
      passwordHash: password,
      role: 'staff',
      status: 'pending'
    });

    // Notify owners and managers about new registration
    try {
      const managers = await User.find({ role: { $in: ['owner', 'manager'] }, status: 'approved' }).select('_id');
      const notifications = managers.map((m) => ({
        userId: m._id,
        type: 'new_registration',
        title: 'New Registration Request',
        message: `${user.name} (${user.email}) has registered and is awaiting approval.`,
        metadata: { userId: user._id }
      }));
      if (notifications.length) await Notification.insertMany(notifications);
    } catch (_) { /* non-blocking */ }

    res.status(201).json({
      success: true,
      message: 'Registration successful. Your account is pending approval.',
      user: { id: user._id, name: user.name, email: user.email, status: user.status }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', protect, (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// PUT /api/auth/change-password
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, message: 'Current password and new password required' });

    if (!PASSWORD_REGEX.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters with one uppercase letter, one number, and one special character'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    user.passwordHash = newPassword;
    user.mustChangePassword = false;
    await user.save();

    await AuditLog.create({
      actorId: req.user.id,
      targetId: req.user.id,
      action: 'change_password',
      storeId: req.user.storeId || null
    });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/forgot
router.post('/forgot', (req, res) => {
  res.json({ success: true, message: 'Password reset email sent (not implemented)' });
});

// POST /api/auth/access-request — public endpoint to submit a platform access request
router.post('/access-request', async (req, res) => {
  try {
    const { name, email, businessName, message, password, confirmPassword, storeId } = req.body;
    if (!name || !email)
      return res.status(400).json({ success: false, message: 'Name and email are required' });

    if (!password)
      return res.status(400).json({ success: false, message: 'Password is required' });

    if (password.length < 8 || !/\d/.test(password))
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters and contain at least one number' });

    if (password !== confirmPassword)
      return res.status(400).json({ success: false, message: 'Passwords do not match' });

    const AccessRequest = require('../models/AccessRequest');
    const existing = await AccessRequest.findOne({ email: email.toLowerCase(), status: 'pending' });
    if (existing)
      return res.status(400).json({ success: false, message: 'A pending request with this email already exists' });

    // Hash password at submission time — never store plain text
    const passwordHash = await bcrypt.hash(password, 10);

    const requestData = { name, email: email.toLowerCase(), businessName, message, passwordHash };
    if (storeId) requestData.storeId = storeId;

    const request = await AccessRequest.create(requestData);
    res.status(201).json({ success: true, message: 'Access request submitted. You will be contacted when approved.', id: request._id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;



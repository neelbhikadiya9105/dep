const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

router.use(protect);

// GET /api/settings/profile — get current user profile/preferences
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({
      success: true,
      data: {
        name: user.name,
        email: user.email,
        displayName: user.displayName || '',
        avatar: user.avatar || '',
        currency: user.currency || 'INR',
        role: user.role,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/settings/profile — update display name, avatar, currency
router.put('/profile', async (req, res) => {
  try {
    const { displayName, avatar, currency } = req.body;
    const allowed = {};
    if (displayName !== undefined) allowed.displayName = displayName;
    if (avatar !== undefined) allowed.avatar = avatar;
    if (currency && ['INR', 'USD', 'EUR', 'GBP'].includes(currency)) allowed.currency = currency;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: allowed },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({
      success: true,
      message: 'Profile updated',
      data: {
        name: user.name,
        email: user.email,
        displayName: user.displayName || '',
        avatar: user.avatar || '',
        currency: user.currency || 'INR',
        role: user.role,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

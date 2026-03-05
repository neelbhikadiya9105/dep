const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Store = require('../models/Store');

const signToken = (user) =>
  jwt.sign(
    { id: user._id, name: user.name, email: user.email, role: user.role, storeId: user.storeId || null },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' });

    let user = await User.findOne({ email: email.toLowerCase() });

    // Auto-create demo owner if not found
    if (!user && email === 'owner@demo.com' && password === 'password123') {
      user = await User.create({
        name: 'Demo Owner',
        email: 'owner@demo.com',
        passwordHash: 'password123',
        role: 'owner'
      });
    }

    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    if (user.status === 'inactive')
      return res.status(403).json({ message: 'Account is inactive' });

    const token = signToken(user);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, storeId: user.storeId || null }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'Name, email, and password required' });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: 'Email already in use' });

    const user = await User.create({
      name,
      email,
      passwordHash: password,
      role: role || 'staff'
    });

    const token = signToken(user);
    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, storeId: user.storeId || null }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/forgot
router.post('/forgot', (req, res) => {
  res.json({ message: 'Password reset email sent (demo)' });
});

// GET /api/auth/seed
router.get('/seed', async (req, res) => {
  try {
    // Ensure a default store exists
    let defaultStore = await Store.findOne({ code: 'MAIN' });
    if (!defaultStore) {
      defaultStore = await Store.create({
        name: 'Main Store',
        code: 'MAIN',
        address: '123 Main Street',
        phone: '555-0100',
        email: 'main@demo.com'
      });
    }

    const demoUsers = [
      { name: 'Demo Owner', email: 'owner@demo.com', passwordHash: 'password123', role: 'owner', storeId: null },
      { name: 'Demo Manager', email: 'manager@demo.com', passwordHash: 'password123', role: 'manager', storeId: defaultStore._id },
      { name: 'Demo Staff', email: 'staff@demo.com', passwordHash: 'password123', role: 'staff', storeId: defaultStore._id }
    ];

    const results = [];
    for (const u of demoUsers) {
      const exists = await User.findOne({ email: u.email });
      if (!exists) {
        const created = await User.create(u);
        results.push(`Created: ${created.email}`);
      } else {
        // Update storeId if missing
        if (!exists.storeId && u.storeId) {
          exists.storeId = u.storeId;
          await exists.save({ validateBeforeSave: false });
        }
        results.push(`Already exists: ${u.email}`);
      }
    }

    res.json({ message: 'Seed complete', results, storeId: defaultStore._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;


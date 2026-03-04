const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (user) =>
  jwt.sign(
    { id: user._id, name: user.name, email: user.email, role: user.role },
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
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
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
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
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
    const demoUsers = [
      { name: 'Demo Owner', email: 'owner@demo.com', passwordHash: 'password123', role: 'owner' },
      { name: 'Demo Manager', email: 'manager@demo.com', passwordHash: 'password123', role: 'manager' },
      { name: 'Demo Staff', email: 'staff@demo.com', passwordHash: 'password123', role: 'staff' }
    ];

    const results = [];
    for (const u of demoUsers) {
      const exists = await User.findOne({ email: u.email });
      if (!exists) {
        const created = await User.create(u);
        results.push(`Created: ${created.email}`);
      } else {
        results.push(`Already exists: ${u.email}`);
      }
    }

    res.json({ message: 'Seed complete', results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

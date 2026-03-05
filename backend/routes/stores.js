const express = require('express');
const router = express.Router();
const Store = require('../models/Store');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// GET /api/stores
router.get('/', async (req, res) => {
  try {
    if (req.user.role === 'owner') {
      const stores = await Store.find().sort({ name: 1 });
      return res.json(stores);
    }
    // manager/staff — return only their assigned store
    if (!req.user.storeId) return res.json([]);
    const store = await Store.findById(req.user.storeId);
    return res.json(store ? [store] : []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/stores
router.post('/', authorize('owner'), async (req, res) => {
  try {
    const store = await Store.create(req.body);
    res.status(201).json(store);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/stores/:id
router.put('/:id', authorize('owner'), async (req, res) => {
  try {
    const store = await Store.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!store) return res.status(404).json({ message: 'Store not found' });
    res.json(store);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/stores/:id
router.delete('/:id', authorize('owner'), async (req, res) => {
  try {
    const store = await Store.findByIdAndDelete(req.params.id);
    if (!store) return res.status(404).json({ message: 'Store not found' });
    res.json({ message: 'Store deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

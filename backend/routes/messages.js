const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

// GET /api/messages — get messages for the current user
router.get('/', protect, async (req, res) => {
  try {
    const messages = await Message.find({ toId: req.user.id })
      .populate('fromId', 'name email role')
      .sort({ sentAt: -1 })
      .limit(100);
    res.json({ success: true, data: messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/messages/:id/read — mark a message as read
router.patch('/:id/read', protect, async (req, res) => {
  try {
    const msg = await Message.findOneAndUpdate(
      { _id: req.params.id, toId: req.user.id },
      { read: true },
      { new: true }
    );
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });
    res.json({ success: true, data: msg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// POST /api/messages — send a message (owner/manager/staff → superuser, or reply)
router.post('/', protect, async (req, res) => {
  try {
    const { toId, subject, body, parentMessageId } = req.body;
    if (!subject || !body)
      return res.status(400).json({ success: false, message: 'Subject and body are required' });

    // Owners/managers/staff send to superuser
    // Superusers reply to a specific user (toId required)
    let recipientId = toId || null;
    let recipientRole = 'superuser';

    if (req.user.role === 'superuser') {
      if (!toId) return res.status(400).json({ success: false, message: 'Recipient (toId) is required for superuser replies' });
      const recipient = await User.findById(toId).select('role');
      if (!recipient) return res.status(404).json({ success: false, message: 'Recipient not found' });
      recipientRole = recipient.role;
    } else {
      // Non-superuser: find any superuser to route to
      const su = await User.findOne({ role: 'superuser', status: 'approved' }).select('_id');
      recipientId = su ? su._id : null;
    }

    const message = await Message.create({
      fromId: req.user.id,
      fromRole: req.user.role,
      toId: recipientId,
      toRole: recipientRole,
      storeId: req.user.storeId || null,
      subject,
      body,
      parentMessageId: parentMessageId || null,
    });

    const populated = await Message.findById(message._id)
      .populate('fromId', 'name email role')
      .populate('toId', 'name email role');

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/messages/inbox — get messages received by the current user
router.get('/inbox', protect, async (req, res) => {
  try {
    const query = req.user.role === 'superuser'
      ? { toId: req.user.id, isBroadcast: false }
      : { toId: req.user.id };

    // Also include messages where toId is null (broadcast) for superusers? No — broadcasts go to owners.
    const messages = await Message.find(query)
      .populate('fromId', 'name email role')
      .populate('toId', 'name email role')
      .sort({ sentAt: -1 })
      .limit(100);
    res.json({ success: true, data: messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/messages — alias for inbox (backward compat)
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

// GET /api/messages/sent — messages sent by the current user
router.get('/sent', protect, async (req, res) => {
  try {
    const messages = await Message.find({ fromId: req.user.id })
      .populate('fromId', 'name email role')
      .populate('toId', 'name email role')
      .sort({ sentAt: -1 })
      .limit(100);
    res.json({ success: true, data: messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/messages/all — superuser: view all support messages
router.get('/all', protect, authorize('superuser'), async (req, res) => {
  try {
    const messages = await Message.find({ toRole: 'superuser' })
      .populate('fromId', 'name email role storeId')
      .populate('toId', 'name email role')
      .sort({ sentAt: -1 })
      .limit(200);
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
      { read: true, readAt: new Date() },
      { new: true }
    );
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });
    res.json({ success: true, data: msg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  fromId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fromRole:        { type: String, enum: ['owner', 'manager', 'staff', 'superuser'], default: 'owner' },
  toId:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null = broadcast
  toRole:          { type: String, enum: ['owner', 'manager', 'staff', 'superuser', 'broadcast'], default: 'superuser' },
  storeId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Store', default: null },
  subject:         { type: String, required: true },
  body:            { type: String, required: true },
  isBroadcast:     { type: Boolean, default: false },
  parentMessageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  sentAt:          { type: Date, default: Date.now },
  readAt:          { type: Date, default: null },
  read:            { type: Boolean, default: false },
});

messageSchema.index({ toId: 1, sentAt: -1 });
messageSchema.index({ fromId: 1, sentAt: -1 });

module.exports = mongoose.model('Message', messageSchema);

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  fromId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  toId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null = broadcast
  subject:  { type: String, required: true },
  body:     { type: String, required: true },
  isBroadcast: { type: Boolean, default: false },
  sentAt:   { type: Date, default: Date.now },
  read:     { type: Boolean, default: false },
});

messageSchema.index({ toId: 1, sentAt: -1 });

module.exports = mongoose.model('Message', messageSchema);

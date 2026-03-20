const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  actorId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorRole: { type: String, enum: ['superuser', 'owner', 'manager', 'staff', 'system'], default: 'system' },
  storeId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Store', default: null },
  action:    { type: String, required: true }, // e.g. 'shop.approved', 'plan.changed', 'user.login'
  targetId:  { type: mongoose.Schema.Types.ObjectId, default: null }, // affected entity
  targetType:{ type: String, default: '' }, // 'store', 'user', 'coupon', etc.
  metadata:  { type: mongoose.Schema.Types.Mixed, default: {} },
});

// Index for common query patterns
activityLogSchema.index({ storeId: 1, timestamp: -1 });
activityLogSchema.index({ actorId: 1, timestamp: -1 });
activityLogSchema.index({ action: 1, timestamp: -1 });
activityLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);

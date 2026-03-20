const mongoose = require('mongoose');

const VALID_PERMISSIONS = [
  'shop_management',
  'billing',
  'feature_flags',
  'logs',
  'communications',
  'dashboard',
];

const superuserRoleSchema = new mongoose.Schema({
  roleName: { type: String, required: true, unique: true },
  permissions: {
    type: [String],
    enum: VALID_PERMISSIONS,
    default: [],
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('SuperuserRole', superuserRoleSchema);

const mongoose = require('mongoose');

// Default feature sets per plan
const PLAN_DEFAULTS = {
  free:  { inventory: true, pos: true, returns: false, reports: false, pdfExport: false, employees: false, payments: false, apiAccess: false, darkMode: true },
  basic: { inventory: true, pos: true, returns: true,  reports: true,  pdfExport: true,  employees: true,  payments: true,  apiAccess: false, darkMode: true },
  pro:   { inventory: true, pos: true, returns: true,  reports: true,  pdfExport: true,  employees: true,  payments: true,  apiAccess: true,  darkMode: true },
};

const featureFlagSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, unique: true },
  // Per-shop overrides on top of plan defaults
  features: {
    inventory:  { type: Boolean, default: true },
    pos:        { type: Boolean, default: true },
    returns:    { type: Boolean, default: false },
    reports:    { type: Boolean, default: false },
    pdfExport:  { type: Boolean, default: false },
    employees:  { type: Boolean, default: false },
    payments:   { type: Boolean, default: false },
    apiAccess:  { type: Boolean, default: false },
    darkMode:   { type: Boolean, default: true },
  },
  updatedAt: { type: Date, default: Date.now },
});

featureFlagSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

featureFlagSchema.statics.getDefaults = function (plan) {
  return PLAN_DEFAULTS[plan] || PLAN_DEFAULTS.free;
};

module.exports = mongoose.model('FeatureFlag', featureFlagSchema);

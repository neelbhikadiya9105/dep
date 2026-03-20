const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, unique: true },
  plan: { type: String, enum: ['free', 'basic', 'pro'], default: 'free' },
  status: {
    type: String,
    enum: ['trial', 'active', 'expired', 'suspended', 'cancelled'],
    default: 'trial'
  },
  trialExpiresAt: { type: Date },
  subscriptionExpiresAt: { type: Date },
  paymentProvider: { type: String, enum: ['razorpay', 'stripe', 'manual', null], default: null },
  paymentId: { type: String, default: '' },
  couponUsed: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

subscriptionSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Subscription', subscriptionSchema);

const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String, default: '' },
    code: { type: String, required: true, unique: true, uppercase: true },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: {
      type: String,
      enum: ['active', 'inactive', 'trial', 'expired', 'suspended', 'banned'],
      default: 'trial'
    },
    isActive: { type: Boolean, default: true },
    // Subscription & billing
    plan: { type: String, enum: ['free', 'basic', 'pro'], default: 'free' },
    // Default trial: 14 days from creation
    trialExpiresAt: { type: Date, default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
    subscriptionExpiresAt: { type: Date, default: null },
    // Usage stats (aggregated from sales/products)
    usageStats: {
      totalOrders: { type: Number, default: 0 },
      totalProducts: { type: Number, default: 0 },
      revenue: { type: Number, default: 0 },
      apiCalls: { type: Number, default: 0 },
    },
    // Branding / personalisation
    shopName: { type: String, default: '' },
    logoUrl: { type: String, default: '' },
    receiptFooter: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
  }
);

module.exports = mongoose.model('Store', storeSchema);

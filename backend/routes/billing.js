const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const Store = require('../models/Store');
const Coupon = require('../models/Coupon');
const { protect } = require('../middleware/auth');
const { logActivity } = require('../middleware/logger');

// 30-day subscription duration in milliseconds
const SUBSCRIPTION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

// POST /api/billing/validate-coupon — validate a coupon code
router.post('/validate-coupon', protect, async (req, res) => {
  try {
    const { code, plan } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Coupon code required' });

    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
    if (!coupon) return res.status(404).json({ success: false, message: 'Invalid or inactive coupon code' });

    if (coupon.expiresAt && coupon.expiresAt < new Date())
      return res.status(400).json({ success: false, message: 'Coupon has expired' });

    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit)
      return res.status(400).json({ success: false, message: 'Coupon usage limit reached' });

    if (plan && coupon.applicablePlans.length && !coupon.applicablePlans.includes(plan))
      return res.status(400).json({ success: false, message: `Coupon not applicable to the ${plan} plan` });

    res.json({
      success: true,
      coupon: {
        code: coupon.code,
        discount: coupon.discount,
        discountType: coupon.discountType,
        applicablePlans: coupon.applicablePlans,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/billing/subscription — get current store's subscription
router.get('/subscription', protect, async (req, res) => {
  try {
    if (!req.user.storeId) return res.status(400).json({ success: false, message: 'No store associated' });
    const sub = await Subscription.findOne({ storeId: req.user.storeId });
    res.json({ success: true, data: sub });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/billing/webhook/razorpay — Razorpay payment webhook
router.post('/webhook/razorpay', async (req, res) => {
  try {
    const { event, payload } = req.body;
    if (event === 'payment.captured') {
      const { storeId, plan } = payload.notes || {};
      if (storeId && plan) {
        const expiry = new Date(Date.now() + SUBSCRIPTION_DURATION_MS);
        await Subscription.findOneAndUpdate(
          { storeId },
          { plan, status: 'active', paymentProvider: 'razorpay', paymentId: payload.id, subscriptionExpiresAt: expiry }
        );
        await Store.findByIdAndUpdate(storeId, { plan, status: 'active', subscriptionExpiresAt: expiry });
        await logActivity(null, 'payment.success', { storeId, metadata: { plan, provider: 'razorpay', paymentId: payload.id } });
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/billing/webhook/stripe — Stripe payment webhook
router.post('/webhook/stripe', async (req, res) => {
  try {
    const { type, data } = req.body;
    if (type === 'checkout.session.completed') {
      const { storeId, plan } = data.object.metadata || {};
      if (storeId && plan) {
        const expiry = new Date(Date.now() + SUBSCRIPTION_DURATION_MS);
        await Subscription.findOneAndUpdate(
          { storeId },
          { plan, status: 'active', paymentProvider: 'stripe', paymentId: data.object.id, subscriptionExpiresAt: expiry }
        );
        await Store.findByIdAndUpdate(storeId, { plan, status: 'active', subscriptionExpiresAt: expiry });
        await logActivity(null, 'payment.success', { storeId, metadata: { plan, provider: 'stripe', paymentId: data.object.id } });
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

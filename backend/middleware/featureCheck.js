/**
 * featureCheck middleware — blocks a route if the store's feature flag is disabled.
 * Usage: router.get('/reports', protect, featureCheck('reports'), handler)
 */
const FeatureFlag = require('../models/FeatureFlag');

const featureCheck = (featureName) => async (req, res, next) => {
  try {
    // Superuser always has full access
    if (req.user && req.user.role === 'superuser') return next();

    const storeId = req.user?.storeId;
    if (!storeId) {
      return res.status(403).json({ success: false, message: 'No store associated with this account' });
    }

    const flags = await FeatureFlag.findOne({ storeId });
    if (!flags) {
      // No flags document means the store may not have been fully initialised
      return res.status(403).json({ success: false, message: 'Your account setup is incomplete. Please contact support.', feature: featureName });
    }

    if (!flags.features[featureName]) {
      return res.status(403).json({ success: false, message: `Feature "${featureName}" is not available on your current plan`, feature: featureName, upgrade: true });
    }

    next();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = featureCheck;

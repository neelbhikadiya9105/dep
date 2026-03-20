/**
 * Activity logger middleware — records significant actions in ActivityLog.
 * Can be used as route middleware or called directly as a helper.
 */
const ActivityLog = require('../models/ActivityLog');

/**
 * logActivity(req, action, targetId, targetType, metadata)
 * Can be called inline inside route handlers for fine-grained control.
 */
const logActivity = async (actor, action, { storeId, targetId, targetType, metadata } = {}) => {
  try {
    await ActivityLog.create({
      actorId:   actor?._id || actor?.id || null,
      actorRole: actor?.role || 'system',
      storeId:   storeId || actor?.storeId || null,
      action,
      targetId:  targetId || null,
      targetType: targetType || '',
      metadata:  metadata || {},
    });
  } catch (_) {
    // logging must never break the main request
  }
};

/**
 * Express middleware factory — automatically logs the request after response.
 * Usage: router.post('/login', autoLog('user.login'), handler)
 */
const autoLog = (action, getMetadata) => (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    originalJson(body);
    // Only log on success
    if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
      const meta = typeof getMetadata === 'function' ? getMetadata(req, body) : {};
      logActivity(req.user, action, {
        storeId: req.user.storeId,
        metadata: meta,
      }).catch(() => {});
    }
  };
  next();
};

module.exports = { logActivity, autoLog };

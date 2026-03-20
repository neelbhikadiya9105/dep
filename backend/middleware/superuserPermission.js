/**
 * superuserPermission.js
 * Middleware factory: checks whether the authenticated superuser has a specific permission.
 * Usage: router.get('/shops', superuserPermission('shop_management'), handler)
 */

const User = require('../models/User');

/**
 * Returns an Express middleware that verifies the current superuser has the
 * given permission in their assigned SuperuserRole.
 *
 * Superusers with no role assigned (or no permission doc) are denied by default.
 */
function superuserPermission(permission) {
  return async (req, res, next) => {
    try {
      if (!req.user || req.user.role !== 'superuser') {
        return res.status(403).json({ success: false, message: 'Superuser access required' });
      }

      // Load the user with their role populated
      const user = await User.findById(req.user.id).populate('superuserRole');

      // If no role assigned → deny (unless the field was never set, fall through for backward compat)
      if (!user) {
        return res.status(403).json({ success: false, message: 'User not found' });
      }

      // If no superuserRole assigned, allow (backward compat for existing superuser accounts)
      if (!user.superuserRole) {
        return next();
      }

      const permissions = user.superuserRole.permissions || [];
      if (!permissions.includes(permission)) {
        return res.status(403).json({
          success: false,
          message: `Permission '${permission}' required`,
        });
      }

      next();
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  };
}

module.exports = superuserPermission;

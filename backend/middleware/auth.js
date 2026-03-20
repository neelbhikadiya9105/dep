const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch full user from DB to verify status and get latest data
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
    }
    if (user.status !== 'approved') {
      return res.status(403).json({ success: false, message: 'Account is not approved' });
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      storeId: user.storeId ? user.storeId.toString() : null,
      mustChangePassword: user.mustChangePassword,
      displayName: user.displayName || '',
      avatar: user.avatar || '',
      currency: user.currency || 'INR',
    };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Not authorized, token invalid' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden: insufficient permissions' });
    }
    next();
  };
};

// Middleware that allows owner to bypass store scope; manager/staff must match their storeId
const authorizeStore = (req, res, next) => {
  if (req.user.role === 'owner') return next();
  const requestedStoreId = req.query.storeId || (req.body && req.body.storeId);
  if (!requestedStoreId) return next(); // no store filter requested
  if (!req.user.storeId) {
    return res.status(403).json({ success: false, message: 'Forbidden: no store assigned' });
  }
  if (String(req.user.storeId) !== String(requestedStoreId)) {
    return res.status(403).json({ success: false, message: 'Forbidden: cross-store access denied' });
  }
  next();
};

// Middleware that blocks superuser from accessing store-level routes
const blockSuperuser = (req, res, next) => {
  if (req.user && req.user.role === 'superuser') {
    return res.status(403).json({ success: false, message: 'Forbidden: superuser cannot access store-level data' });
  }
  next();
};

module.exports = { protect, authorize, authorizeStore, blockSuperuser };


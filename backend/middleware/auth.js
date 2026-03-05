const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Not authorized, token invalid' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
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
    return res.status(403).json({ message: 'Forbidden: no store assigned' });
  }
  if (String(req.user.storeId) !== String(requestedStoreId)) {
    return res.status(403).json({ message: 'Forbidden: cross-store access denied' });
  }
  next();
};

module.exports = { protect, authorize, authorizeStore };


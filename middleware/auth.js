const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    console.log('🔐 [AUTH MIDDLEWARE] protect() called for route:', req.method, req.path);
    console.log('🔐 [AUTH MIDDLEWARE] Headers present:', !!req.headers.authorization);

    let token;

    // Check for Passport Session first (for web portal access)
    if (req.isAuthenticated && req.isAuthenticated()) {
      console.log('✅ [AUTH MIDDLEWARE] Passport Session authenticated:', req.user.name);
      return next();
    }

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('🔐 [AUTH MIDDLEWARE] Token extracted from header');
    }

    if (!token) {
      console.log('❌ [AUTH MIDDLEWARE] No token found in request');
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    console.log('🔐 [AUTH MIDDLEWARE] Verifying JWT token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ [AUTH MIDDLEWARE] JWT verified, user ID:', decoded.id);

    console.log('🔐 [AUTH MIDDLEWARE] Fetching user from database...');
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      console.log('❌ [AUTH MIDDLEWARE] User not found in database for ID:', decoded.id);
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('✅ [AUTH MIDDLEWARE] User authenticated:', req.user.name, '(Role:', req.user.role, ')');
    next();
  } catch (error) {
    console.log('❌ [AUTH MIDDLEWARE] Error during authentication:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }
    next();
  };
};

exports.requireEmailVerification = (req, res, next) => {
  if (!req.user.emailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Email verification required to access this resource'
    });
  }
  next();
};

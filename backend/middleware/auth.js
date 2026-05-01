const jwt = require('jsonwebtoken');
const { findOne } = require('../config/database');

// JWT token generation
const generateTokens = (payload) => {
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '15m'
  });
  
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d'
  });
  
  return { accessToken, refreshToken };
};

// Verify access token middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
        }
        return res.status(403).json({ error: 'Invalid token' });
      }
      
      // Fetch fresh user data from database
      const userData = await findOne('users', { id: user.id, is_active: true });
      if (!userData) {
        return res.status(403).json({ error: 'User not found or inactive' });
      }
      
      // Remove sensitive data
      delete userData.password_hash;
      
      req.user = userData;
      next();
    });
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

// Role-based access control middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: userRole
      });
    }
    
    next();
  };
};

// Admin-only middleware
const requireAdmin = requireRole('admin');

// Refresh access token
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }
    
    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, async (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid refresh token' });
      }
      
      // Fetch fresh user data
      const userData = await findOne('users', { id: user.id, is_active: true });
      if (!userData) {
        return res.status(403).json({ error: 'User not found or inactive' });
      }
      
      // Generate new tokens
      const tokens = generateTokens({ 
        id: userData.id, 
        username: userData.username, 
        role: userData.role 
      });
      
      // Remove sensitive data
      delete userData.password_hash;
      
      res.json({
        user: userData,
        ...tokens
      });
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Token refresh error' });
  }
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      req.user = null;
      return next();
    }
    
    jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
      if (err) {
        req.user = null;
        return next();
      }
      
      const userData = await findOne('users', { id: user.id, is_active: true });
      if (userData) {
        delete userData.password_hash;
        req.user = userData;
      } else {
        req.user = null;
      }
      
      next();
    });
  } catch (error) {
    req.user = null;
    next();
  }
};

module.exports = {
  generateTokens,
  authenticateToken,
  requireRole,
  requireAdmin,
  refreshToken,
  optionalAuth
};

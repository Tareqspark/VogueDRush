const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { findOne, insert, insertIgnore, update, remove, query } = require('../config/database');

// JWT token generation with JTI for blacklisting
const generateTokens = async (payload, userDeviceInfo = null) => {
  const jti = crypto.randomUUID(); // JWT ID for blacklisting
  const refreshTokenJti = crypto.randomUUID();
  
  const accessToken = jwt.sign(
    { ...payload, jti }, 
    process.env.JWT_SECRET, 
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );
  
  const refreshToken = jwt.sign(
    { ...payload, jti: refreshTokenJti }, 
    process.env.JWT_REFRESH_SECRET, 
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
  
  // Store session in database
  const sessionToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)); // 7 days
  
  try {
    await insert('user_sessions', {
      user_id: payload.id,
      session_token: sessionToken,
      refresh_token_jti: refreshTokenJti,
      device_info: userDeviceInfo ? JSON.stringify(userDeviceInfo) : null,
      ip_address: userDeviceInfo?.ipAddress || null,
      user_agent: userDeviceInfo?.userAgent || null,
      expires_at: expiresAt
    });
  } catch (error) {
    console.error('Failed to store session:', error);
  }
  
  return { 
    accessToken, 
    refreshToken, 
    sessionToken,
    accessTokenJti: jti,
    refreshTokenJti: refreshTokenJti
  };
};

// Verify access token middleware with blacklist check
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        code: 'TOKEN_REQUIRED'
      });
    }
    
    jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({ 
            error: 'Token expired', 
            code: 'TOKEN_EXPIRED' 
          });
        }
        return res.status(403).json({ 
          error: 'Invalid token',
          code: 'TOKEN_INVALID'
        });
      }
      
      // Check if token is blacklisted
      const blacklistedToken = await findOne('token_blacklist', { 
        token_jti: user.jti, 
        token_type: 'access'
      });
      
      if (blacklistedToken) {
        return res.status(403).json({ 
          error: 'Token has been revoked',
          code: 'TOKEN_REVOKED'
        });
      }
      
      // Fetch fresh user data from database
      const userData = await findOne('users', { 
        id: user.id, 
        is_active: true 
      });
      
      if (!userData) {
        return res.status(403).json({ 
          error: 'User not found or inactive',
          code: 'USER_INACTIVE'
        });
      }
      
      // Remove sensitive data
      delete userData.password_hash;
      
      req.user = userData;
      req.tokenJti = user.jti;
      next();
    });
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
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

// Refresh access token with rotation
const refreshToken = async (req, res) => {
  try {
    // Accept tokens from request body OR httpOnly cookies (C-1 fix)
    const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
    const sessionToken = req.body.sessionToken || req.cookies?.sessionToken;
    
    if (!refreshToken || !sessionToken) {
      return res.status(401).json({ 
        error: 'Refresh token and session token required',
        code: 'TOKENS_REQUIRED'
      });
    }
    
    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, async (err, user) => {
      if (err) {
        return res.status(403).json({ 
          error: 'Invalid refresh token',
          code: 'REFRESH_TOKEN_INVALID'
        });
      }
      
      // Check if refresh token is blacklisted
      const blacklistedToken = await findOne('token_blacklist', { 
        token_jti: user.jti, 
        token_type: 'refresh',
        expires_at: { $gt: new Date() }
      });
      
      if (blacklistedToken) {
        return res.status(403).json({ 
          error: 'Refresh token has been revoked',
          code: 'REFRESH_TOKEN_REVOKED'
        });
      }
      
      // Verify session exists and is active
      const session = await findOne('user_sessions', { 
        session_token: sessionToken,
        refresh_token_jti: user.jti,
        is_active: true
      });
      
      if (!session) {
        return res.status(403).json({ 
          error: 'Invalid or expired session',
          code: 'SESSION_INVALID'
        });
      }
      
      // Fetch fresh user data
      const userData = await findOne('users', { 
        id: user.id, 
        is_active: true 
      });
      
      if (!userData) {
        return res.status(403).json({ 
          error: 'User not found or inactive',
          code: 'USER_INACTIVE'
        });
      }
      
      // Blacklist old refresh token
      const oldTokenExpiry = new Date(user.exp * 1000);
      await insertIgnore('token_blacklist', {
        token_jti: user.jti,
        token_type: 'refresh',
        user_id: user.id,
        expires_at: oldTokenExpiry
      });
      
      // Generate new tokens
      const deviceInfo = {
        ipAddress: session.ip_address,
        userAgent: session.user_agent
      };
      
      const tokens = await generateTokens({ 
        id: userData.id, 
        username: userData.username, 
        role: userData.role 
      }, deviceInfo);
      
      // Deactivate the previous refresh session and keep only the rotated one active
      await update('user_sessions', 
        { is_active: false, last_activity: new Date() },
        { session_token: sessionToken }
      );
      
      // Remove sensitive data
      delete userData.password_hash;
      
      // Set httpOnly cookies (C-1 fix: include sessionToken cookie)
      res.cookie('accessToken', tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000 // 15 minutes
      });
      
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.cookie('sessionToken', tokens.sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      
      res.json({
        user: userData,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        sessionToken: tokens.sessionToken,
        message: 'Tokens refreshed successfully'
      });
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ 
      error: 'Token refresh error',
      code: 'REFRESH_ERROR'
    });
  }
};

// Logout and blacklist tokens
const logout = async (req, res) => {
  try {
    const { userId } = req.body;
    // Accept sessionToken from body or httpOnly cookie (C-1 fix)
    const sessionToken = req.body.sessionToken || req.cookies?.sessionToken;
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!userId || !sessionToken) {
      return res.status(400).json({ 
        error: 'User ID and session token required',
        code: 'LOGOUT_PARAMS_REQUIRED'
      });
    }
    
    // Find and deactivate session
    const session = await findOne('user_sessions', { 
      user_id: userId,
      session_token: sessionToken,
      is_active: true
    });
    
    if (session) {
      // Blacklist refresh token
      await insertIgnore('token_blacklist', {
        token_jti: session.refresh_token_jti,
        token_type: 'refresh',
        user_id: userId,
        expires_at: session.expires_at
      });
      
      // Deactivate session
      await update('user_sessions', 
        { is_active: false },
        { session_token: sessionToken }
      );
    }
    
    // Blacklist access token if provided
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.jti) {
          await insertIgnore('token_blacklist', {
            token_jti: decoded.jti,
            token_type: 'access',
            user_id: userId,
            expires_at: new Date(decoded.exp * 1000)
          });
        }
      } catch (error) {
        // Token was invalid, but continue with logout
        console.log('Invalid access token during logout:', error.message);
      }
    }
    
    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.clearCookie('sessionToken');
    
    res.json({ message: 'Logout successful' });
    
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      error: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
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

// M-8: Purge expired rows from token_blacklist and user_sessions to prevent unbounded table growth.
// Called on a schedule from server.js.
const cleanupExpiredTokens = async () => {
  try {
    const { query: dbQuery } = require('../config/database');
    await dbQuery('DELETE FROM token_blacklist WHERE expires_at < NOW()');
    await dbQuery('DELETE FROM user_sessions WHERE expires_at < NOW() AND is_active = 0');
    console.log('[auth cleanup] Expired tokens and sessions purged');
  } catch (error) {
    console.error('[auth cleanup] Cleanup failed:', error.message);
  }
};

// scopeBranch — resolves the effective branch_id for a request.
// - Admin/manager with no branch_id: uses X-Branch-Id header (branch selector)
// - Staff with branch_id: always forced to their assigned branch, header ignored
// Attaches req.scopedBranchId (number|null). null = admin seeing all branches.
const scopeBranch = (req, _res, next) => {
  const user = req.user;
  if (!user) return next();

  if (user.role === 'admin') {
    // Admin: use X-Branch-Id header to scope, or null = all branches
    const headerBranch = req.headers['x-branch-id'];
    req.scopedBranchId = headerBranch ? parseInt(headerBranch, 10) : null;
  } else if (user.branch_id) {
    // Any non-admin role with a branch assigned: always locked to that branch
    req.scopedBranchId = user.branch_id;
  } else {
    // Non-admin with no branch assigned — use -1 so queries return nothing
    // rather than leaking all-branch data (fail closed)
    req.scopedBranchId = -1;
  }
  next();
};

module.exports = {
  generateTokens,
  authenticateToken,
  requireRole,
  requireAdmin,
  refreshToken,
  logout,
  optionalAuth,
  cleanupExpiredTokens,
  scopeBranch,
};

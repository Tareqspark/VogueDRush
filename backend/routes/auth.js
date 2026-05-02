const express = require('express');
const bcrypt = require('bcryptjs');
const { findOne, insert, update, query } = require('../config/database');
const { generateTokens, logout } = require('../middleware/auth');
const { validateLogin } = require('../middleware/validation');
const { logManualAudit } = require('../middleware/audit');

const router = express.Router();

// Login endpoint with secure token storage (rate limiter temporarily removed for testing)
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find user by username or email
    const users = await query(
      'SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = 1 LIMIT 1',
      [username, username]
    );
    const user = users[0] || null;
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    // Collect device info for session management
    const deviceInfo = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    };
    
    // Generate tokens with session management
    const tokens = await generateTokens({ 
      id: user.id, 
      username: user.username, 
      role: user.role 
    }, deviceInfo);
    
    // Remove sensitive data
    delete user.password_hash;
    
    // Log audit
    await logManualAudit(
      user.id,
      'login',
      'users',
      user.id,
      null,
      { login_time: new Date(), device_info: deviceInfo },
      req.ip,
      req.headers['user-agent']
    );
    
    // Set httpOnly cookies
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
    
    res.json({
      message: 'Login successful',
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      sessionToken: tokens.sessionToken
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed',
      code: 'LOGIN_ERROR'
    });
  }
});

// Refresh token endpoint
router.post('/refresh', require('../middleware/auth').refreshToken);

// Logout endpoint with token blacklisting
router.post('/logout', logout);

// Validate token endpoint
router.get('/validate', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ valid: false, error: 'No token provided' });
    }
    
    const jwt = require('jsonwebtoken');
    jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
      if (err) {
        return res.status(401).json({ valid: false, error: 'Invalid token' });
      }
      
      // Check if user still exists and is active
      const userData = await findOne('users', { id: user.id, is_active: true });
      if (!userData) {
        return res.status(401).json({ valid: false, error: 'User not found or inactive' });
      }
      
      delete userData.password_hash;
      res.json({ valid: true, user: userData });
    });
    
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({ valid: false, error: 'Validation failed' });
  }
});

// Change password endpoint with authentication
router.post('/change-password', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'Current password and new password are required',
        code: 'PASSWORD_FIELDS_REQUIRED'
      });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({ 
        error: 'New password must be at least 8 characters long',
        code: 'PASSWORD_TOO_SHORT'
      });
    }
    
    // Find user with password hash
    const user = await findOne('users', { id: userId, is_active: true });
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ 
        error: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }
    
    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    
    // Update password
    await update('users', { 
      password_hash: newPasswordHash,
      updated_at: new Date()
    }, { id: userId });
    
    // Log audit
    await logManualAudit(
      userId,
      'change_password',
      'users',
      userId,
      null,
      { password_changed: new Date() },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({ message: 'Password changed successfully' });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      error: 'Password change failed',
      code: 'PASSWORD_CHANGE_ERROR'
    });
  }
});

module.exports = router;

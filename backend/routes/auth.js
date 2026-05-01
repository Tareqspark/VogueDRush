const express = require('express');
const bcrypt = require('bcryptjs');
const { findOne, insert, update, query } = require('../config/database');
const { generateTokens, refreshToken } = require('../middleware/auth');
const { validateLogin } = require('../middleware/validation');
const { logManualAudit } = require('../middleware/audit');

const router = express.Router();

// Login endpoint
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find user by username or email
    const users = await query(
      'SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = 1 LIMIT 1',
      [username, username]
    );
    const user = users[0] || null;
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate tokens
    const tokens = generateTokens({ 
      id: user.id, 
      username: user.username, 
      role: user.role 
    });
    
    // Remove sensitive data
    delete user.password_hash;
    
    // Log audit
    await logManualAudit(
      user.id,
      'login',
      'users',
      user.id,
      null,
      { login_time: new Date() },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({
      message: 'Login successful',
      user,
      ...tokens
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Refresh token endpoint
router.post('/refresh', refreshToken);

// Logout endpoint
router.post('/logout', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (userId) {
      // Log audit
      await logManualAudit(
        userId,
        'logout',
        'users',
        userId,
        null,
        { logout_time: new Date() },
        req.ip,
        req.headers['user-agent']
      );
    }
    
    res.json({ message: 'Logout successful' });
    
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

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

// Change password endpoint
router.post('/change-password', async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;
    
    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }
    
    // Find user
    const user = await findOne('users', { id: userId, is_active: true });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    
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
    res.status(500).json({ error: 'Password change failed' });
  }
});

module.exports = router;

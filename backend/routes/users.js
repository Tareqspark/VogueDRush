const express = require('express');
const bcrypt = require('bcryptjs');
const { findOne, findMany, insert, update, remove } = require('../config/database');
const { requireAdmin } = require('../middleware/auth');
const { validateUser, validateId } = require('../middleware/validation');
const { logManualAudit } = require('../middleware/audit');

const router = express.Router();

// Get all users (admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, role, search } = req.query;
    const limitInt = parseInt(limit) || 50;
    const offsetInt = (parseInt(page) - 1) * limitInt;
    
    let whereClause = '1=1';
    let values = [];
    
    if (role) {
      whereClause += ' AND role = ?';
      values.push(role);
    }
    
    if (search) {
      whereClause += ' AND (username LIKE ? OR full_name LIKE ? OR email LIKE ?)';
      values.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    const { query } = require('../config/database');

    const users = await query(
      `SELECT u.id, u.username, u.email, u.full_name, u.phone, u.role, u.is_active,
              u.branch_id, b.name AS branch_name, b.code AS branch_code,
              u.created_at, u.updated_at
       FROM users u
       LEFT JOIN branches b ON b.id = u.branch_id
       WHERE ${whereClause} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
      [...values, limitInt, offsetInt]
    );
    
    // Get total count
    const countResult = await query(`SELECT COUNT(*) as total FROM users WHERE ${whereClause}`, values);
    const total = countResult[0].total;
    
    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: limitInt,
        total,
        pages: Math.ceil(total / limitInt)
      }
    });
    
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID (admin only)
router.get('/:id', requireAdmin, validateId, async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await findOne('users', { id }, 'id, username, email, full_name, phone, role, is_active, created_at, updated_at');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
    
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create new user (admin only)
router.post('/', requireAdmin, validateUser, async (req, res) => {
  try {
    const { username, email, password, full_name, phone, role, branch_id } = req.body;

    // Admin users must not be branch-scoped
    const resolvedBranchId = (role === 'admin') ? null : (branch_id || null);

    // Check if username or email already exists
    const existingUser = await findOne('users', '(username = ? OR email = ?)', [username, email]);
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userData = {
      username,
      email,
      password_hash: passwordHash,
      full_name,
      phone: phone || null,
      role,
      branch_id: resolvedBranchId,
      is_active: true
    };
    
    const newUser = await insert('users', userData);
    
    // Remove sensitive data
    delete newUser.password_hash;
    
    // Log audit
    await logManualAudit(
      req.user.id,
      'create',
      'users',
      newUser.id,
      null,
      { created_user: newUser },
      req.ip,
      req.headers['user-agent']
    );
    
    res.status(201).json({
      message: 'User created successfully',
      user: newUser
    });
    
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user (admin only)
router.put('/:id', requireAdmin, validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, full_name, phone, role, is_active, password, branch_id } = req.body;

    // Check if user exists
    const existingUser = await findOne('users', { id });
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if username or email already exists for another user
    if (username !== existingUser.username || email !== existingUser.email) {
      const duplicateUser = await findOne('users', '(username = ? OR email = ?) AND id != ?', [username, email, id]);
      if (duplicateUser) {
        return res.status(400).json({ error: 'Username or email already exists' });
      }
    }

    const resolvedBranchId = (role === 'admin') ? null : (branch_id !== undefined ? (branch_id || null) : existingUser.branch_id);

    // Prepare update data
    const updateData = {
      username,
      email,
      full_name,
      phone: phone || null,
      role,
      branch_id: resolvedBranchId,
      is_active: is_active !== undefined ? is_active : existingUser.is_active,
      updated_at: new Date()
    };
    
    // Update password if provided
    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 10);
    }
    
    // Store old values for audit
    const oldValues = {
      username: existingUser.username,
      email: existingUser.email,
      full_name: existingUser.full_name,
      phone: existingUser.phone,
      role: existingUser.role,
      is_active: existingUser.is_active
    };
    
    await update('users', updateData, { id });
    
    // Get updated user
    const updatedUser = await findOne('users', { id }, 'id, username, email, full_name, phone, role, is_active, created_at, updated_at');
    
    // Log audit
    await logManualAudit(
      req.user.id,
      'update',
      'users',
      parseInt(id),
      oldValues,
      updateData,
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
    
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (admin only)
router.delete('/:id', requireAdmin, validateId, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const existingUser = await findOne('users', { id });
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Prevent deleting the last admin
    if (existingUser.role === 'admin') {
      const adminCount = await findMany('users', { role: 'admin' });
      if (adminCount.length <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last admin user' });
      }
    }
    
    // Soft delete by setting is_active to false
    await update('users', { is_active: false, updated_at: new Date() }, { id });
    
    // Log audit
    await logManualAudit(
      req.user.id,
      'delete',
      'users',
      parseInt(id),
      existingUser,
      { is_active: false, deleted_at: new Date() },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({ message: 'User deleted successfully' });
    
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Toggle user active status (admin only)
router.patch('/:id/toggle-status', requireAdmin, validateId, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const existingUser = await findOne('users', { id });
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Prevent deactivating the last admin
    if (existingUser.role === 'admin' && existingUser.is_active) {
      const activeAdminCount = await findMany('users', { role: 'admin', is_active: true });
      if (activeAdminCount.length <= 1) {
        return res.status(400).json({ error: 'Cannot deactivate the last admin user' });
      }
    }
    
    const newStatus = !existingUser.is_active;
    
    await update('users', { 
      is_active: newStatus, 
      updated_at: new Date() 
    }, { id });
    
    // Log audit
    await logManualAudit(
      req.user.id,
      'toggle_status',
      'users',
      parseInt(id),
      { is_active: existingUser.is_active },
      { is_active: newStatus },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({
      message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
      is_active: newStatus
    });
    
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ error: 'Failed to toggle user status' });
  }
});

// Get user statistics (admin only)
router.get('/stats/overview', requireAdmin, async (req, res) => {
  try {
    const { query } = require('../config/database');
    
    // Get user counts by role
    const roleStats = await query(`
      SELECT role, COUNT(*) as count, 
             SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_count
      FROM users 
      GROUP BY role
    `);
    
    // Get recent users
    const recentUsers = await findMany(
      'users',
      '1=1',
      'id, username, full_name, role, created_at',
      'created_at DESC',
      '5'
    );
    
    res.json({
      roleStats,
      recentUsers
    });
    
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

// ── Get user activity log ──────────────────────────────────────────────────
router.get('/:id/activity', requireAdmin, validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50, start_date, end_date } = req.query;
    const { query } = require('../config/database');
    const limitInt = Math.min(parseInt(limit) || 50, 200);
    const offsetInt = (parseInt(page) - 1) * limitInt;

    let where = 'al.user_id = ?';
    const values = [id];
    if (start_date) { where += ' AND DATE(al.created_at) >= ?'; values.push(start_date); }
    if (end_date)   { where += ' AND DATE(al.created_at) <= ?'; values.push(end_date); }

    const logs = await query(`
      SELECT al.id, al.action, al.table_name, al.record_id,
             al.old_values, al.new_values, al.ip_address, al.created_at,
             u.full_name AS user_name, u.role AS user_role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE ${where}
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `, [...values, limitInt, offsetInt]);

    const countResult = await query(
      `SELECT COUNT(*) as total FROM audit_logs al WHERE ${where}`,
      values
    );

    res.json({
      logs,
      pagination: {
        page: parseInt(page), limit: limitInt,
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limitInt)
      }
    });
  } catch (error) {
    console.error('User activity error:', error);
    res.status(500).json({ error: 'Failed to fetch activity log' });
  }
});

// ── Get / update user permissions ─────────────────────────────────────────
router.get('/:id/permissions', requireAdmin, validateId, async (req, res) => {
  try {
    const user = await findOne('users', { id: req.params.id });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const perms = user.permissions ? (typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions) : null;
    res.json({ permissions: perms || getDefaultPermissions(user.role) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

router.put('/:id/permissions', requireAdmin, validateId, async (req, res) => {
  try {
    const { permissions } = req.body;
    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({ error: 'permissions object required' });
    }
    const { query } = require('../config/database');
    await query('UPDATE users SET permissions = ?, updated_at = NOW() WHERE id = ?',
      [JSON.stringify(permissions), req.params.id]);
    res.json({ message: 'Permissions updated', permissions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update permissions' });
  }
});

function getDefaultPermissions(role) {
  const map = {
    admin:   { orders: true,  kitchen: true,  tables: true,  menu: true,  reports: true,  delivery: true,  reservations: true,  users: true,  settings: true,  financials: true,  inventory: true  },
    manager: { orders: true,  kitchen: true,  tables: true,  menu: true,  reports: true,  delivery: true,  reservations: true,  users: false, settings: false, financials: true,  inventory: true  },
    waiter:  { orders: true,  kitchen: false, tables: true,  menu: false, reports: false, delivery: false, reservations: true,  users: false, settings: false, financials: false, inventory: false },
    kitchen: { orders: false, kitchen: true,  tables: false, menu: false, reports: false, delivery: false, reservations: false, users: false, settings: false, financials: false, inventory: false },
  };
  return map[role] || map.waiter;
}

module.exports = router;

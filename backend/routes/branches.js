const express = require('express');
const router = express.Router();
const { query, findMany, findOne, insert, update } = require('../config/database');
const { requireRole, authenticateToken } = require('../middleware/auth');

// GET all branches (public — used by branch selector on login)
router.get('/', async (req, res) => {
  try {
    const branches = await query('SELECT * FROM branches ORDER BY id');
    res.json({ branches });
  } catch (error) {
    console.error('Get branches error:', error);
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
});

// GET branch menu availability (all items + override status for this branch)
router.get('/menu/availability', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const branchId = req.query.branch_id;
    if (!branchId) return res.status(400).json({ error: 'branch_id required' });

    const items = await query(`
      SELECT fi.id, fi.name, fi.price, fc.name AS category_name,
             COALESCE(bmo.is_available, 1) AS is_available
      FROM food_items fi
      LEFT JOIN food_categories fc ON fc.id = fi.category_id
      LEFT JOIN branch_menu_overrides bmo ON bmo.food_item_id = fi.id AND bmo.branch_id = ?
      WHERE fi.is_available = 1
      ORDER BY fc.name, fi.name
    `, [branchId]);

    res.json({ items });
  } catch (err) {
    console.error('Branch menu error:', err);
    res.status(500).json({ error: 'Failed to fetch branch menu' });
  }
});

// PUT bulk update branch menu availability
router.put('/menu/availability', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { branch_id, overrides } = req.body;
    if (!branch_id || !Array.isArray(overrides)) return res.status(400).json({ error: 'branch_id and overrides[] required' });

    for (const o of overrides) {
      await query(`
        INSERT INTO branch_menu_overrides (branch_id, food_item_id, is_available)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE is_available = VALUES(is_available)
      `, [branch_id, o.food_item_id, o.is_available ? 1 : 0]);
    }
    res.json({ message: 'Menu availability updated' });
  } catch (err) {
    console.error('Update menu override error:', err);
    res.status(500).json({ error: 'Failed to update menu availability' });
  }
});

// GET all branches WITH stats (admin only) — must be before /:id
router.get('/all/stats', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const branches = await query('SELECT * FROM branches ORDER BY id');
    const withStats = await Promise.all(branches.map(async (b) => {
      const [s] = await query(
        `SELECT COUNT(*) as total_orders,
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as today_orders,
                COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN total_amount END), 0) as today_revenue,
                COUNT(CASE WHEN status NOT IN ('done','cancelled') THEN 1 END) as active_orders
         FROM orders WHERE branch_id = ?`, [b.id]
      );
      let tableCount = 0;
      try {
        const [t] = await query('SELECT COUNT(*) as cnt FROM tables WHERE branch_id = ?', [b.id]);
        tableCount = t?.cnt || 0;
      } catch (_) {}
      return {
        ...b,
        stats: {
          total_orders:  s.total_orders,
          total_revenue: parseFloat(s.total_revenue),
          today_orders:  s.today_orders,
          today_revenue: parseFloat(s.today_revenue),
          active_orders: s.active_orders,
          table_count:   tableCount,
        }
      };
    }));
    res.json({ branches: withStats });
  } catch (error) {
    console.error('All branch stats error:', error);
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
});

// GET single branch (must be after all named routes above)
router.get('/:id', async (req, res) => {
  try {
    const branch = await findOne('branches', { id: req.params.id });
    if (!branch) return res.status(404).json({ error: 'Branch not found' });
    res.json({ branch });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch branch' });
  }
});

// GET single branch stats (admin only)
router.get('/:id/stats', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const branch = await findOne('branches', { id });
    if (!branch) return res.status(404).json({ error: 'Branch not found' });

    const [totals] = await query(
      `SELECT COUNT(*) as total_orders,
              COALESCE(SUM(total_amount), 0) as total_revenue,
              COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as today_orders,
              COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN total_amount END), 0) as today_revenue,
              COUNT(CASE WHEN status NOT IN ('done','cancelled') THEN 1 END) as active_orders
       FROM orders WHERE branch_id = ?`, [id]
    );
    let tableCount = 0;
    try {
      const [t] = await query('SELECT COUNT(*) as cnt FROM tables WHERE branch_id = ?', [id]);
      tableCount = t?.cnt || 0;
    } catch (_) {}

    res.json({
      branch,
      stats: {
        total_orders:  totals.total_orders,
        total_revenue: parseFloat(totals.total_revenue),
        today_orders:  totals.today_orders,
        today_revenue: parseFloat(totals.today_revenue),
        active_orders: totals.active_orders,
        table_count:   tableCount,
      }
    });
  } catch (error) {
    console.error('Branch stats error:', error);
    res.status(500).json({ error: 'Failed to fetch branch stats' });
  }
});

// GET branch operating hours
router.get('/:id/hours', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const rows = await query(
      'SELECT * FROM branch_hours WHERE branch_id = ? ORDER BY day_of_week', [req.params.id]
    );
    // If no rows yet return defaults for all 7 days
    const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const hoursMap = {};
    rows.forEach(r => { hoursMap[r.day_of_week] = r; });
    const hours = DAY_NAMES.map((name, i) => hoursMap[i] || {
      branch_id: parseInt(req.params.id), day_of_week: i,
      day_name: name, is_open: true, open_time: '09:00:00', close_time: '23:00:00'
    }).map(r => ({ ...r, day_name: DAY_NAMES[r.day_of_week] }));
    res.json({ hours });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch branch hours' });
  }
});

// PUT branch operating hours — upsert all 7 days at once
router.put('/:id/hours', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { hours } = req.body; // array of { day_of_week, is_open, open_time, close_time }
    if (!Array.isArray(hours)) return res.status(400).json({ error: 'hours array required' });
    const branchId = parseInt(req.params.id);
    for (const h of hours) {
      await query(
        `INSERT INTO branch_hours (branch_id, day_of_week, is_open, open_time, close_time)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE is_open=VALUES(is_open), open_time=VALUES(open_time), close_time=VALUES(close_time)`,
        [branchId, h.day_of_week, h.is_open ? 1 : 0, h.open_time, h.close_time]
      );
    }
    res.json({ message: 'Hours updated' });
  } catch (error) {
    console.error('Update hours error:', error);
    res.status(500).json({ error: 'Failed to update hours' });
  }
});

// POST create branch (admin only)
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { name, code, address, phone } = req.body;
    if (!name || !code) return res.status(400).json({ error: 'name and code are required' });

    const existing = await findOne('branches', { code: code.toUpperCase() });
    if (existing) return res.status(400).json({ error: 'Branch code already exists' });

    const branch = await insert('branches', {
      name,
      code: code.toUpperCase(),
      address: address || null,
      phone: phone || null,
      is_active: true,
    });
    res.status(201).json({ message: 'Branch created', branch });
  } catch (error) {
    console.error('Create branch error:', error);
    res.status(500).json({ error: 'Failed to create branch' });
  }
});

// PUT update branch (admin only)
router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { name, address, phone, is_active } = req.body;
    const branch = await findOne('branches', { id: req.params.id });
    if (!branch) return res.status(404).json({ error: 'Branch not found' });

    await update('branches', {
      ...(name      !== undefined && { name }),
      ...(address   !== undefined && { address }),
      ...(phone     !== undefined && { phone }),
      ...(is_active !== undefined && { is_active }),
      updated_at: new Date(),
    }, { id: req.params.id });

    const updated = await findOne('branches', { id: req.params.id });
    res.json({ message: 'Branch updated', branch: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update branch' });
  }
});

// PATCH toggle active status (admin only)
router.patch('/:id/toggle', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const branch = await findOne('branches', { id: req.params.id });
    if (!branch) return res.status(404).json({ error: 'Branch not found' });
    const newStatus = !branch.is_active;
    await update('branches', { is_active: newStatus, updated_at: new Date() }, { id: req.params.id });
    res.json({ message: `Branch ${newStatus ? 'activated' : 'deactivated'}`, is_active: newStatus });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle branch status' });
  }
});

// DELETE branch (admin only) — soft delete
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const branch = await findOne('branches', { id: req.params.id });
    if (!branch) return res.status(404).json({ error: 'Branch not found' });

    const active = await query('SELECT COUNT(*) as cnt FROM branches WHERE is_active = 1');
    if (branch.is_active && active[0].cnt <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last active branch' });
    }

    await update('branches', { is_active: false, updated_at: new Date() }, { id: req.params.id });
    res.json({ message: 'Branch deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete branch' });
  }
});

module.exports = router;

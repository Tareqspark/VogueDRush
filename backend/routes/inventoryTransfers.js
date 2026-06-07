const express = require('express');
const router = express.Router();
const { query, findOne } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logManualAudit } = require('../middleware/audit');

// GET all transfers (with filters)
router.get('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { status, from_branch_id, to_branch_id, page = 1, limit = 50 } = req.query;
    const limitInt = Math.min(parseInt(limit) || 50, 200);
    const offsetInt = (parseInt(page) - 1) * limitInt;

    let where = '1=1';
    const values = [];
    if (status)         { where += ' AND t.status = ?';           values.push(status); }
    if (from_branch_id) { where += ' AND t.from_branch_id = ?';   values.push(from_branch_id); }
    if (to_branch_id)   { where += ' AND t.to_branch_id = ?';     values.push(to_branch_id); }

    const transfers = await query(`
      SELECT t.*,
             fb.name AS from_branch_name, fb.code AS from_branch_code,
             tb.name AS to_branch_name,   tb.code AS to_branch_code,
             fi.name AS item_name,
             ru.full_name AS requested_by_name,
             au.full_name AS approved_by_name
      FROM inventory_transfers t
      JOIN branches fb ON fb.id = t.from_branch_id
      JOIN branches tb ON tb.id = t.to_branch_id
      JOIN food_items fi ON fi.id = t.food_item_id
      JOIN users ru ON ru.id = t.requested_by
      LEFT JOIN users au ON au.id = t.approved_by
      WHERE ${where}
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `, [...values, limitInt, offsetInt]);

    const [{ total }] = await query(
      `SELECT COUNT(*) as total FROM inventory_transfers t WHERE ${where}`, values
    );

    res.json({ transfers, pagination: { page: parseInt(page), limit: limitInt, total, pages: Math.ceil(total / limitInt) } });
  } catch (err) {
    console.error('Get transfers error:', err);
    res.status(500).json({ error: 'Failed to fetch transfers' });
  }
});

// POST create transfer request
router.post('/', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { from_branch_id, to_branch_id, food_item_id, quantity, unit = 'unit', notes } = req.body;

    if (!from_branch_id || !to_branch_id || !food_item_id || !quantity) {
      return res.status(400).json({ error: 'from_branch_id, to_branch_id, food_item_id, quantity are required' });
    }
    if (parseInt(from_branch_id) === parseInt(to_branch_id)) {
      return res.status(400).json({ error: 'Source and destination branch must be different' });
    }
    if (parseFloat(quantity) <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than 0' });
    }

    const result = await query(`
      INSERT INTO inventory_transfers (from_branch_id, to_branch_id, food_item_id, quantity, unit, notes, requested_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [from_branch_id, to_branch_id, food_item_id, quantity, unit, notes || null, req.user.id]);

    await logManualAudit(req.user.id, 'create_transfer', 'inventory_transfers', result.insertId, null,
      { from_branch_id, to_branch_id, food_item_id, quantity }, req.ip, req.headers['user-agent']);

    res.status(201).json({ message: 'Transfer request created', id: result.insertId });
  } catch (err) {
    console.error('Create transfer error:', err);
    res.status(500).json({ error: 'Failed to create transfer' });
  }
});

// PATCH approve transfer
router.patch('/:id/approve', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const transfer = await findOne('inventory_transfers', { id: req.params.id });
    if (!transfer) return res.status(404).json({ error: 'Transfer not found' });
    if (transfer.status !== 'pending') return res.status(400).json({ error: 'Only pending transfers can be approved' });

    // Deduct from source branch inventory, add to destination
    await query(`
      UPDATE food_inventory SET current_stock = current_stock - ?, last_updated = NOW()
      WHERE food_item_id = ?
    `, [transfer.quantity, transfer.food_item_id]);

    await query(`
      INSERT INTO food_inventory (food_item_id, current_stock, last_updated)
      VALUES (?, ?, NOW())
      ON DUPLICATE KEY UPDATE current_stock = current_stock + ?, last_updated = NOW()
    `, [transfer.food_item_id, transfer.quantity, transfer.quantity]);

    await query(`
      UPDATE inventory_transfers SET status = 'completed', approved_by = ?, completed_at = NOW() WHERE id = ?
    `, [req.user.id, req.params.id]);

    await logManualAudit(req.user.id, 'approve_transfer', 'inventory_transfers', parseInt(req.params.id),
      { status: 'pending' }, { status: 'completed' }, req.ip, req.headers['user-agent']);

    res.json({ message: 'Transfer approved and inventory updated' });
  } catch (err) {
    console.error('Approve transfer error:', err);
    res.status(500).json({ error: 'Failed to approve transfer' });
  }
});

// PATCH reject transfer
router.patch('/:id/reject', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const transfer = await findOne('inventory_transfers', { id: req.params.id });
    if (!transfer) return res.status(404).json({ error: 'Transfer not found' });
    if (transfer.status !== 'pending') return res.status(400).json({ error: 'Only pending transfers can be rejected' });

    await query(`UPDATE inventory_transfers SET status = 'rejected', approved_by = ?, completed_at = NOW() WHERE id = ?`,
      [req.user.id, req.params.id]);

    res.json({ message: 'Transfer rejected' });
  } catch (err) {
    console.error('Reject transfer error:', err);
    res.status(500).json({ error: 'Failed to reject transfer' });
  }
});

module.exports = router;

const express = require('express');
const { query, insert, findOne } = require('../config/database');
const { requireRole, scopeBranch } = require('../middleware/auth');
const router = express.Router();

router.use(scopeBranch);
const managerOrAdmin = requireRole(['admin', 'manager']);

// ── POST /  log a waste entry (also deducts stock) ────────────────────────────
router.post('/', managerOrAdmin, async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    if (!branchId) return res.status(400).json({ error: 'Branch required' });

    const { ingredient_id, qty, reason, notes, logged_date } = req.body;
    if (!ingredient_id || !qty || parseFloat(qty) <= 0)
      return res.status(400).json({ error: 'ingredient_id and qty > 0 required' });

    const ing = await findOne('ingredients', { id: ingredient_id, branch_id: branchId });
    if (!ing) return res.status(404).json({ error: 'Ingredient not found' });

    const deductQty  = parseFloat(qty);
    const newBalance = Math.max(0, parseFloat(ing.current_stock) - deductQty);
    const date       = logged_date || new Date().toISOString().split('T')[0];

    // Deduct from stock
    await query(
      'UPDATE ingredients SET current_stock = ?, updated_at = NOW() WHERE id = ?',
      [newBalance, ing.id]
    );

    // Stock ledger entry
    await insert('stock_ledger', {
      branch_id:     branchId,
      ingredient_id: ing.id,
      movement_type: 'waste',
      qty:           -deductQty,
      balance_after: newBalance,
      unit_cost:     ing.cost_price || 0,
      reference_type: 'waste_log',
      notes:         notes || reason || null,
      created_by:    req.user.id,
    });

    // Waste log record
    const row = await insert('waste_logs', {
      branch_id:     branchId,
      ingredient_id: ing.id,
      qty:           deductQty,
      reason:        reason || 'other',
      notes:         notes || null,
      logged_date:   date,
      created_by:    req.user.id,
    });

    res.status(201).json({ waste_log: row, new_stock: newBalance });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /  list waste logs ────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    if (!branchId) return res.status(400).json({ error: 'Branch required' });

    const { from, to, ingredient_id, page = 1, limit = 100 } = req.query;
    const lim    = Math.min(parseInt(limit) || 100, 500);
    const offset = (parseInt(page) - 1) * lim;

    let sql = `
      SELECT wl.*, i.name AS ingredient_name, i.unit,
             ROUND(wl.qty * i.cost_price, 2) AS waste_cost,
             u.full_name AS logged_by_name
      FROM waste_logs wl
      JOIN ingredients i ON i.id = wl.ingredient_id
      LEFT JOIN users u ON u.id = wl.created_by
      WHERE wl.branch_id = ?`;
    const params = [branchId];

    if (ingredient_id) { sql += ' AND wl.ingredient_id = ?'; params.push(ingredient_id); }
    if (from)          { sql += ' AND wl.logged_date >= ?';  params.push(from); }
    if (to)            { sql += ' AND wl.logged_date <= ?';  params.push(to); }

    sql += ' ORDER BY wl.logged_date DESC, wl.created_at DESC LIMIT ? OFFSET ?';
    params.push(lim, offset);

    const rows = await query(sql, params);
    const totalCost = rows.reduce((s, r) => s + parseFloat(r.waste_cost || 0), 0);
    res.json({ logs: rows, total_waste_cost: +totalCost.toFixed(2) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /summary  waste totals grouped by ingredient + reason ─────────────────
router.get('/summary', async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    if (!branchId) return res.status(400).json({ error: 'Branch required' });

    const { from, to } = req.query;
    let sql = `
      SELECT i.name AS ingredient_name, i.unit, wl.reason,
             SUM(wl.qty) AS total_qty,
             ROUND(SUM(wl.qty * i.cost_price), 2) AS total_cost
      FROM waste_logs wl
      JOIN ingredients i ON i.id = wl.ingredient_id
      WHERE wl.branch_id = ?`;
    const params = [branchId];
    if (from) { sql += ' AND wl.logged_date >= ?'; params.push(from); }
    if (to)   { sql += ' AND wl.logged_date <= ?'; params.push(to); }
    sql += ' GROUP BY wl.ingredient_id, wl.reason ORDER BY total_cost DESC';

    const rows = await query(sql, params);
    const grand = rows.reduce((s, r) => s + parseFloat(r.total_cost || 0), 0);
    res.json({ summary: rows, grand_total: +grand.toFixed(2) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

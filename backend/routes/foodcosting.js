const express = require('express');
const { findOne, findMany, insert, update, query } = require('../config/database');
const { requireRole } = require('../middleware/auth');
const router = express.Router();
const adminOnly = requireRole(['admin']);

// ── Cost snapshots ────────────────────────────────────────
router.get('/snapshots', adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 50, date } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let sql = 'SELECT fcs.*, fi.name as item_name FROM food_cost_snapshots fcs JOIN food_items fi ON fcs.food_item_id = fi.id WHERE 1=1';
    const params = [];
    if (date) { sql += ' AND fcs.snapshot_date = ?'; params.push(date); }
    sql += ' ORDER BY fcs.snapshot_date DESC, fi.name ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    const rows = await query(sql, params);
    res.json({ snapshots: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Trigger a new snapshot for today (recalculates from portion_costs)
router.post('/snapshots/generate', adminOnly, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const items = await query('SELECT id, name, price, promotional_price FROM food_items WHERE is_available = 1');
    const created = [];
    for (const item of items) {
      const portions = await query('SELECT SUM(line_cost) as total FROM portion_costs WHERE food_item_id = ?', [item.id]);
      const foodCost = parseFloat(portions[0]?.total || 0);
      const sellingPrice = parseFloat(item.promotional_price || item.price);
      if (sellingPrice <= 0) continue;
      const foodCostPct = (foodCost / sellingPrice) * 100;
      const grossMargin = sellingPrice - foodCost;
      const grossMarginPct = (grossMargin / sellingPrice) * 100;
      await query(
        `INSERT INTO food_cost_snapshots (food_item_id, snapshot_date, selling_price, food_cost, food_cost_pct, gross_margin, gross_margin_pct)
         VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE selling_price=VALUES(selling_price), food_cost=VALUES(food_cost),
         food_cost_pct=VALUES(food_cost_pct), gross_margin=VALUES(gross_margin), gross_margin_pct=VALUES(gross_margin_pct)`,
        [item.id, today, sellingPrice, foodCost, foodCostPct.toFixed(2), grossMargin, grossMarginPct.toFixed(2)]
      );
      created.push(item.name);
    }
    res.json({ generated: created.length, date: today });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Portion costs ─────────────────────────────────────────
router.get('/portions/:food_item_id', adminOnly, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM portion_costs WHERE food_item_id = ? ORDER BY ingredient_name', [req.params.food_item_id]);
    const total = rows.reduce((s, r) => s + parseFloat(r.line_cost), 0);
    res.json({ portions: rows, total_cost: total.toFixed(4) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/portions', adminOnly, async (req, res) => {
  try {
    const { food_item_id, ingredient_name, quantity, unit, unit_cost } = req.body;
    if (!food_item_id || !ingredient_name || !quantity || !unit || !unit_cost)
      return res.status(400).json({ error: 'All portion fields required' });
    const record = await insert('portion_costs', { food_item_id, ingredient_name, quantity, unit, unit_cost });
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/portions/:id', adminOnly, async (req, res) => {
  try {
    await query('DELETE FROM portion_costs WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Margin reports ────────────────────────────────────────
router.get('/margin-reports', adminOnly, async (req, res) => {
  try {
    const { from, to } = req.query;
    const rows = await query(
      'SELECT * FROM margin_reports WHERE report_date BETWEEN ? AND ? ORDER BY margin_pct ASC',
      [from || '2020-01-01', to || new Date().toISOString().split('T')[0]]
    );
    res.json({ reports: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Dashboard summary ─────────────────────────────────────
router.get('/dashboard', adminOnly, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [highMargin] = await query(
      'SELECT item_name, gross_margin_pct FROM food_cost_snapshots fcs JOIN food_items fi ON fcs.food_item_id=fi.id WHERE snapshot_date=? ORDER BY gross_margin_pct DESC LIMIT 5', [today]
    );
    const [lowMargin] = await query(
      'SELECT item_name, gross_margin_pct FROM food_cost_snapshots fcs JOIN food_items fi ON fcs.food_item_id=fi.id WHERE snapshot_date=? ORDER BY gross_margin_pct ASC LIMIT 5', [today]
    );
    const [alerts] = await query(
      'SELECT COUNT(*) as cnt FROM food_cost_snapshots WHERE snapshot_date=? AND food_cost_pct > 35', [today]
    );
    res.json({ high_margin: highMargin || [], low_margin: lowMargin || [], alert_count: alerts?.cnt || 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

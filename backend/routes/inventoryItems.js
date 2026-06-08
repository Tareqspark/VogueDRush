const express = require('express');
const { query, insert, update, findOne } = require('../config/database');
const { requireRole, scopeBranch } = require('../middleware/auth');
const router = express.Router();

router.use(scopeBranch);

const managerOrAdmin = requireRole(['admin', 'manager']);

// ── SKU generator ─────────────────────────────────────────────────────────────
async function nextSku(branchId) {
  const [row] = await query(
    'SELECT COUNT(*) AS cnt FROM ingredients WHERE branch_id = ?', [branchId]
  );
  return `ING-${String((row.cnt || 0) + 1).padStart(4, '0')}`;
}

// ── GET /  list ingredients ───────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    if (!branchId) return res.status(400).json({ error: 'Branch required' });

    const { category, search, status } = req.query;
    let sql = `
      SELECT i.*,
        CASE
          WHEN i.current_stock <= i.min_stock    THEN 'critical'
          WHEN i.current_stock <= i.reorder_level THEN 'low'
          ELSE 'ok'
        END AS stock_status
      FROM ingredients i
      WHERE i.branch_id = ? AND i.is_active = 1`;
    const params = [branchId];

    if (category) { sql += ' AND i.category = ?'; params.push(category); }
    if (search)   { sql += ' AND i.name LIKE ?';  params.push(`%${search}%`); }
    if (status === 'low')      { sql += ' AND i.current_stock <= i.reorder_level AND i.current_stock > i.min_stock'; }
    if (status === 'critical') { sql += ' AND i.current_stock <= i.min_stock'; }

    sql += ' ORDER BY i.category ASC, i.name ASC';
    const rows = await query(sql, params);
    res.json({ ingredients: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /categories ───────────────────────────────────────────────────────────
router.get('/categories', async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    if (!branchId) return res.status(400).json({ error: 'Branch required' });
    const rows = await query(
      'SELECT DISTINCT category FROM ingredients WHERE branch_id = ? AND category IS NOT NULL ORDER BY category',
      [branchId]
    );
    res.json({ categories: rows.map(r => r.category) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /alerts  low-stock + critical ─────────────────────────────────────────
router.get('/alerts', async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    if (!branchId) return res.status(400).json({ error: 'Branch required' });
    const rows = await query(`
      SELECT i.*,
        CASE
          WHEN i.current_stock <= i.min_stock     THEN 'critical'
          WHEN i.current_stock <= i.reorder_level THEN 'low'
        END AS stock_status
      FROM ingredients i
      WHERE i.branch_id = ? AND i.is_active = 1
        AND i.current_stock <= i.reorder_level
      ORDER BY i.current_stock ASC`, [branchId]);
    res.json({ alerts: rows, total: rows.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /  create ingredient ─────────────────────────────────────────────────
router.post('/', managerOrAdmin, async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    if (!branchId) return res.status(400).json({ error: 'Branch required' });

    const { name, category, unit, cost_price, reorder_level, min_stock, max_stock, sku } = req.body;
    if (!name || !unit) return res.status(400).json({ error: 'name and unit are required' });

    const resolvedSku = sku || await nextSku(branchId);
    const row = await insert('ingredients', {
      branch_id: branchId, sku: resolvedSku, name, category: category || null,
      unit, cost_price: cost_price || 0,
      current_stock: 0, reorder_level: reorder_level || 0,
      min_stock: min_stock || 0, max_stock: max_stock || 0
    });
    res.status(201).json({ ingredient: row });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PUT /:id  update ingredient master ────────────────────────────────────────
router.put('/:id', managerOrAdmin, async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    const ing = await findOne('ingredients', { id: req.params.id, branch_id: branchId });
    if (!ing) return res.status(404).json({ error: 'Ingredient not found' });

    const { name, category, unit, cost_price, reorder_level, min_stock, max_stock } = req.body;
    await update('ingredients', { name, category, unit, cost_price, reorder_level, min_stock, max_stock }, { id: ing.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE /:id  deactivate ───────────────────────────────────────────────────
router.delete('/:id', managerOrAdmin, async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    const ing = await findOne('ingredients', { id: req.params.id, branch_id: branchId });
    if (!ing) return res.status(404).json({ error: 'Ingredient not found' });
    await update('ingredients', { is_active: false }, { id: ing.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /:id/stock-in  manual receive without PO ─────────────────────────────
router.post('/:id/stock-in', managerOrAdmin, async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    if (!branchId) return res.status(400).json({ error: 'Branch required' });

    const ing = await findOne('ingredients', { id: req.params.id, branch_id: branchId });
    if (!ing) return res.status(404).json({ error: 'Ingredient not found' });

    const qty = parseFloat(req.body.qty);
    const unit_cost = parseFloat(req.body.unit_cost) || ing.cost_price || 0;
    const notes = req.body.notes || null;
    if (!qty || qty <= 0) return res.status(400).json({ error: 'qty must be > 0' });

    const newBalance = parseFloat(ing.current_stock) + qty;
    await update('ingredients', { current_stock: newBalance, cost_price: unit_cost }, { id: ing.id });
    await insert('stock_ledger', {
      branch_id: branchId, ingredient_id: ing.id,
      movement_type: 'manual_in', qty, balance_after: newBalance,
      unit_cost, notes, created_by: req.user.id
    });
    res.json({ success: true, new_balance: newBalance });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /:id/adjust  correction / waste ─────────────────────────────────────
router.post('/:id/adjust', managerOrAdmin, async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    if (!branchId) return res.status(400).json({ error: 'Branch required' });

    const ing = await findOne('ingredients', { id: req.params.id, branch_id: branchId });
    if (!ing) return res.status(404).json({ error: 'Ingredient not found' });

    const { type = 'adjustment', qty, notes } = req.body;
    const delta = parseFloat(qty);
    if (isNaN(delta)) return res.status(400).json({ error: 'qty required' });

    const allowed = ['adjustment', 'waste'];
    if (!allowed.includes(type)) return res.status(400).json({ error: 'type must be adjustment or waste' });

    const newBalance = Math.max(0, parseFloat(ing.current_stock) + delta);
    await update('ingredients', { current_stock: newBalance }, { id: ing.id });
    await insert('stock_ledger', {
      branch_id: branchId, ingredient_id: ing.id,
      movement_type: type, qty: delta, balance_after: newBalance,
      unit_cost: ing.cost_price, notes: notes || null, created_by: req.user.id
    });
    res.json({ success: true, new_balance: newBalance });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /reports/valuation  stock value snapshot ─────────────────────────────
router.get('/reports/valuation', async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    if (!branchId) return res.status(400).json({ error: 'Branch required' });

    const rows = await query(`
      SELECT i.category, i.id, i.name, i.unit, i.sku,
             i.current_stock, i.cost_price,
             ROUND(i.current_stock * i.cost_price, 2) AS stock_value,
             CASE
               WHEN i.current_stock <= i.min_stock    THEN 'critical'
               WHEN i.current_stock <= i.reorder_level THEN 'low'
               ELSE 'ok'
             END AS stock_status
      FROM ingredients i
      WHERE i.branch_id = ? AND i.is_active = 1
      ORDER BY i.category ASC, stock_value DESC`, [branchId]);

    // Aggregate totals by category
    const byCategory = {};
    let grandTotal = 0;
    for (const r of rows) {
      const cat = r.category || 'Uncategorised';
      if (!byCategory[cat]) byCategory[cat] = { category: cat, total_value: 0, items: [] };
      byCategory[cat].items.push(r);
      byCategory[cat].total_value = +(byCategory[cat].total_value + parseFloat(r.stock_value)).toFixed(2);
      grandTotal += parseFloat(r.stock_value);
    }

    res.json({ categories: Object.values(byCategory), grand_total: +grandTotal.toFixed(2) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /reports/consumption  stock usage by period ──────────────────────────
router.get('/reports/consumption', async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    if (!branchId) return res.status(400).json({ error: 'Branch required' });

    const { from, to, type } = req.query;
    let sql = `
      SELECT i.name, i.unit, i.category,
             sl.movement_type,
             ABS(SUM(sl.qty)) AS total_qty,
             ROUND(ABS(SUM(sl.qty)) * i.cost_price, 2) AS total_cost
      FROM stock_ledger sl
      JOIN ingredients i ON i.id = sl.ingredient_id
      WHERE sl.branch_id = ? AND sl.qty < 0`;
    const params = [branchId];

    if (type)  { sql += ' AND sl.movement_type = ?'; params.push(type); }
    if (from)  { sql += ' AND DATE(sl.created_at) >= ?'; params.push(from); }
    if (to)    { sql += ' AND DATE(sl.created_at) <= ?'; params.push(to); }

    sql += ' GROUP BY i.id, sl.movement_type ORDER BY total_cost DESC';
    const rows = await query(sql, params);

    const totalCost = rows.reduce((s, r) => s + parseFloat(r.total_cost || 0), 0);
    res.json({ rows, total_cost: +totalCost.toFixed(2) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /reports/cogs  cost of goods sold per food item ──────────────────────
router.get('/reports/cogs', async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    if (!branchId) return res.status(400).json({ error: 'Branch required' });

    const { from, to } = req.query;
    let dateFilter = '';
    const params = [branchId, branchId, branchId];
    if (from) { dateFilter += ' AND DATE(o.created_at) >= ?'; params.push(from); }
    if (to)   { dateFilter += ' AND DATE(o.created_at) <= ?'; params.push(to); }

    const rows = await query(`
      SELECT fi.id, fi.name, fi.price,
             COALESCE(SUM(oi.quantity), 0) AS qty_sold,
             COALESCE(SUM(r_cost.recipe_cost * oi.quantity), 0) AS total_cogs,
             COALESCE(SUM(oi.total_price), 0) AS total_revenue,
             CASE
               WHEN SUM(oi.total_price) > 0
               THEN ROUND(SUM(r_cost.recipe_cost * oi.quantity) / SUM(oi.total_price) * 100, 1)
               ELSE NULL
             END AS food_cost_pct
      FROM food_items fi
      LEFT JOIN (
        SELECT r.food_item_id,
               SUM(r.qty_per_portion * i.cost_price) AS recipe_cost
        FROM recipes r
        JOIN ingredients i ON i.id = r.ingredient_id AND i.branch_id = ?
        WHERE r.branch_id = ?
        GROUP BY r.food_item_id
      ) r_cost ON r_cost.food_item_id = fi.id
      LEFT JOIN order_items oi ON oi.food_item_id = fi.id AND oi.status != 'cancelled'
      LEFT JOIN orders o ON o.id = oi.order_id AND o.branch_id = ? AND o.status = 'done'
        ${dateFilter}
      WHERE fi.branch_id = ? AND fi.is_available = 1
      GROUP BY fi.id
      ORDER BY total_cogs DESC`, [...params, branchId]);

    const totalRevenue = rows.reduce((s, r) => s + parseFloat(r.total_revenue || 0), 0);
    const totalCogs    = rows.reduce((s, r) => s + parseFloat(r.total_cogs    || 0), 0);
    const avgFoodCost  = totalRevenue > 0 ? +(totalCogs / totalRevenue * 100).toFixed(1) : null;

    res.json({ items: rows, total_revenue: +totalRevenue.toFixed(2), total_cogs: +totalCogs.toFixed(2), avg_food_cost_pct: avgFoodCost });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /reports/reorder  ingredients below reorder level + suggested qty ─────
router.get('/reports/reorder', async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    if (!branchId) return res.status(400).json({ error: 'Branch required' });

    const rows = await query(`
      SELECT i.*,
             CASE
               WHEN i.current_stock <= i.min_stock    THEN 'critical'
               WHEN i.current_stock <= i.reorder_level THEN 'low'
             END AS stock_status,
             GREATEST(0, i.max_stock - i.current_stock) AS suggested_order_qty,
             ROUND(GREATEST(0, i.max_stock - i.current_stock) * i.cost_price, 2) AS estimated_cost
      FROM ingredients i
      WHERE i.branch_id = ? AND i.is_active = 1
        AND i.current_stock <= i.reorder_level
      ORDER BY i.current_stock ASC`, [branchId]);

    res.json({ items: rows, total: rows.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /ledger  stock movement history ──────────────────────────────────────
router.get('/ledger', async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    if (!branchId) return res.status(400).json({ error: 'Branch required' });

    const { ingredient_id, type, from, to, page = 1, limit = 100 } = req.query;
    const lim = Math.min(parseInt(limit) || 100, 500);
    const offset = (parseInt(page) - 1) * lim;

    let sql = `
      SELECT sl.*, i.name AS ingredient_name, i.unit,
             u.full_name AS created_by_name
      FROM stock_ledger sl
      JOIN ingredients i ON i.id = sl.ingredient_id
      LEFT JOIN users u ON u.id = sl.created_by
      WHERE sl.branch_id = ?`;
    const params = [branchId];

    if (ingredient_id) { sql += ' AND sl.ingredient_id = ?'; params.push(ingredient_id); }
    if (type)          { sql += ' AND sl.movement_type = ?'; params.push(type); }
    if (from)          { sql += ' AND DATE(sl.created_at) >= ?'; params.push(from); }
    if (to)            { sql += ' AND DATE(sl.created_at) <= ?'; params.push(to); }

    sql += ' ORDER BY sl.created_at DESC LIMIT ? OFFSET ?';
    params.push(lim, offset);

    const rows = await query(sql, params);
    res.json({ ledger: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

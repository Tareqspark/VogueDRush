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

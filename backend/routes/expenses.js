const express = require('express');
const { query, insert, update, findOne } = require('../config/database');
const { requireRole, scopeBranch } = require('../middleware/auth');
const router = express.Router();

router.use(scopeBranch);
const managerOrAdmin = requireRole(['admin', 'manager']);

const CATEGORIES = ['Rent','Utilities','Salary','Supplies','Maintenance','Marketing','Transport','Insurance','Food Cost','Other'];

// ── GET /categories ───────────────────────────────────────────────────────────
router.get('/categories', async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    const custom = await query(
      'SELECT DISTINCT category FROM expenses WHERE branch_id = ? ORDER BY category',
      [branchId]
    );
    const merged = [...new Set([...CATEGORIES, ...custom.map(r => r.category)])].sort();
    res.json({ categories: merged });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /  list expenses ──────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    if (!branchId) return res.status(400).json({ error: 'Branch required' });

    const { from, to, category, page = 1, limit = 100 } = req.query;
    const lim    = Math.min(parseInt(limit) || 100, 500);
    const offset = (parseInt(page) - 1) * lim;

    let sql = `
      SELECT e.*, u.full_name AS created_by_name
      FROM expenses e
      LEFT JOIN users u ON u.id = e.created_by
      WHERE e.branch_id = ?`;
    const params = [branchId];

    if (from)     { sql += ' AND e.expense_date >= ?'; params.push(from); }
    if (to)       { sql += ' AND e.expense_date <= ?'; params.push(to); }
    if (category) { sql += ' AND e.category = ?';      params.push(category); }

    sql += ' ORDER BY e.expense_date DESC, e.created_at DESC LIMIT ? OFFSET ?';
    params.push(lim, offset);

    const rows = await query(sql, params);
    const [tot] = await query(
      `SELECT SUM(amount) AS total FROM expenses WHERE branch_id = ?
        ${from     ? ' AND expense_date >= ?' : ''}
        ${to       ? ' AND expense_date <= ?' : ''}
        ${category ? ' AND category = ?'      : ''}`,
      [branchId, ...(from ? [from] : []), ...(to ? [to] : []), ...(category ? [category] : [])]
    );

    res.json({ expenses: rows, total_amount: parseFloat(tot.total || 0) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /summary  category totals for a period ────────────────────────────────
router.get('/summary', async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    if (!branchId) return res.status(400).json({ error: 'Branch required' });

    const { from, to } = req.query;
    let sql = `
      SELECT category, SUM(amount) AS total, COUNT(*) AS count
      FROM expenses
      WHERE branch_id = ?`;
    const params = [branchId];
    if (from) { sql += ' AND expense_date >= ?'; params.push(from); }
    if (to)   { sql += ' AND expense_date <= ?'; params.push(to); }
    sql += ' GROUP BY category ORDER BY total DESC';

    const rows = await query(sql, params);
    const grand = rows.reduce((s, r) => s + parseFloat(r.total), 0);
    res.json({ summary: rows, grand_total: +grand.toFixed(2) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /  create expense ────────────────────────────────────────────────────
router.post('/', managerOrAdmin, async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    if (!branchId) return res.status(400).json({ error: 'Branch required' });

    const { expense_date, category, description, amount, payment_mode, reference, notes } = req.body;
    if (!category || !description || !amount || !expense_date)
      return res.status(400).json({ error: 'expense_date, category, description, amount required' });
    if (parseFloat(amount) <= 0)
      return res.status(400).json({ error: 'amount must be > 0' });

    const row = await insert('expenses', {
      branch_id: branchId,
      expense_date,
      category,
      description,
      amount: parseFloat(amount),
      payment_mode: payment_mode || 'cash',
      reference: reference || null,
      notes: notes || null,
      created_by: req.user.id,
    });
    res.status(201).json({ expense: row });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PUT /:id  update expense ──────────────────────────────────────────────────
router.put('/:id', managerOrAdmin, async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    const exp = await findOne('expenses', { id: req.params.id, branch_id: branchId });
    if (!exp) return res.status(404).json({ error: 'Expense not found' });

    const { expense_date, category, description, amount, payment_mode, reference, notes } = req.body;
    await update('expenses', { expense_date, category, description, amount, payment_mode, reference, notes }, { id: exp.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE /:id  remove expense ───────────────────────────────────────────────
router.delete('/:id', managerOrAdmin, async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    const exp = await findOne('expenses', { id: req.params.id, branch_id: branchId });
    if (!exp) return res.status(404).json({ error: 'Expense not found' });
    await query('DELETE FROM expenses WHERE id = ?', [exp.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

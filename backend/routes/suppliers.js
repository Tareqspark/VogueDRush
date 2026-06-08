const express = require('express');
const { query, insert, update, findOne } = require('../config/database');
const { requireRole, scopeBranch } = require('../middleware/auth');
const router = express.Router();

router.use(scopeBranch);
const managerOrAdmin = requireRole(['admin', 'manager']);

// ── GET /  list suppliers ─────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    if (!branchId) return res.status(400).json({ error: 'Branch required' });

    const { search, category } = req.query;
    let sql = 'SELECT * FROM suppliers WHERE branch_id = ? AND is_active = 1';
    const params = [branchId];
    if (search)   { sql += ' AND name LIKE ?';     params.push(`%${search}%`); }
    if (category) { sql += ' AND category = ?';    params.push(category); }
    sql += ' ORDER BY name ASC';

    const rows = await query(sql, params);
    res.json({ suppliers: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /  create supplier ───────────────────────────────────────────────────
router.post('/', managerOrAdmin, async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    if (!branchId) return res.status(400).json({ error: 'Branch required' });

    const { name, contact_person, phone, email, address, category, payment_terms, lead_days } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const row = await insert('suppliers', {
      branch_id: branchId, name, contact_person, phone, email,
      address, category, payment_terms: payment_terms || 'NET-30',
      lead_days: lead_days || 3
    });
    res.status(201).json({ supplier: row });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PUT /:id  update supplier ─────────────────────────────────────────────────
router.put('/:id', managerOrAdmin, async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    const sup = await findOne('suppliers', { id: req.params.id, branch_id: branchId });
    if (!sup) return res.status(404).json({ error: 'Supplier not found' });

    const { name, contact_person, phone, email, address, category, payment_terms, lead_days } = req.body;
    await update('suppliers', { name, contact_person, phone, email, address, category, payment_terms, lead_days }, { id: sup.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE /:id  deactivate ───────────────────────────────────────────────────
router.delete('/:id', managerOrAdmin, async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    const sup = await findOne('suppliers', { id: req.params.id, branch_id: branchId });
    if (!sup) return res.status(404).json({ error: 'Supplier not found' });
    await update('suppliers', { is_active: false }, { id: sup.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /:id/ledger  transaction history ──────────────────────────────────────
router.get('/:id/ledger', async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    if (!branchId) return res.status(400).json({ error: 'Branch required' });

    const sup = await findOne('suppliers', { id: req.params.id, branch_id: branchId });
    if (!sup) return res.status(404).json({ error: 'Supplier not found' });

    const { from, to } = req.query;
    let sql = `
      SELECT sl.*, u.full_name AS created_by_name
      FROM supplier_ledger sl
      LEFT JOIN users u ON u.id = sl.created_by
      WHERE sl.branch_id = ? AND sl.supplier_id = ?`;
    const params = [branchId, sup.id];

    if (from) { sql += ' AND DATE(sl.transaction_date) >= ?'; params.push(from); }
    if (to)   { sql += ' AND DATE(sl.transaction_date) <= ?'; params.push(to); }
    sql += ' ORDER BY sl.created_at DESC LIMIT 200';

    const rows = await query(sql, params);
    res.json({ supplier: sup, ledger: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /:id/payment  record a payment ───────────────────────────────────────
router.post('/:id/payment', managerOrAdmin, async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    if (!branchId) return res.status(400).json({ error: 'Branch required' });

    const sup = await findOne('suppliers', { id: req.params.id, branch_id: branchId });
    if (!sup) return res.status(404).json({ error: 'Supplier not found' });

    const amount = parseFloat(req.body.amount);
    if (!amount || amount <= 0) return res.status(400).json({ error: 'amount must be > 0' });

    const newBalance = parseFloat(sup.balance) - amount;
    await update('suppliers', { balance: newBalance }, { id: sup.id });
    await insert('supplier_ledger', {
      branch_id: branchId, supplier_id: sup.id,
      transaction_type: 'payment',
      reference_type: 'manual', reference_id: null,
      amount, running_balance: newBalance,
      notes: req.body.notes || null,
      transaction_date: req.body.date || new Date().toISOString().split('T')[0],
      created_by: req.user.id
    });
    res.json({ success: true, new_balance: newBalance });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

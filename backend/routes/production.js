const express = require('express');
const { findOne, findMany, insert, update, remove, query } = require('../config/database');
const { requireRole } = require('../middleware/auth');
const { logManualAudit } = require('../middleware/audit');
const router = express.Router();

const adminOnly = requireRole(['admin']);

// ── Plans ─────────────────────────────────────────────────
router.get('/plans', adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let sql = 'SELECT * FROM production_plans WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    sql += ' ORDER BY plan_date DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    const plans = await query(sql, params);
    res.json({ plans });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/plans', adminOnly, async (req, res) => {
  try {
    const { plan_date, branch_id, notes } = req.body;
    if (!plan_date) return res.status(400).json({ error: 'plan_date required' });
    const record = await insert('production_plans', { plan_date, branch_id: branch_id || 1, notes, created_by: req.user.id });
    await logManualAudit(req.user.id, 'create', 'production_plans', record.id, null, record, req.ip, req.headers['user-agent']);
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/plans/:id', adminOnly, async (req, res) => {
  try {
    const { status, approved_by, notes } = req.body;
    const old = await findOne('production_plans', { id: req.params.id });
    if (!old) return res.status(404).json({ error: 'Plan not found' });
    const updated = await update('production_plans', { status, approved_by, notes }, { id: req.params.id });
    await logManualAudit(req.user.id, 'update', 'production_plans', req.params.id, old, { status, approved_by, notes }, req.ip, req.headers['user-agent']);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Batches ───────────────────────────────────────────────
router.get('/batches', adminOnly, async (req, res) => {
  try {
    const { plan_id, status, page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let sql = 'SELECT * FROM production_batches WHERE 1=1';
    const params = [];
    if (plan_id) { sql += ' AND plan_id = ?'; params.push(plan_id); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    sql += ' ORDER BY target_date ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    const batches = await query(sql, params);
    res.json({ batches });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/batches', adminOnly, async (req, res) => {
  try {
    const { plan_id, batch_name, quantity, unit, target_date, yield_percentage, assigned_to, notes } = req.body;
    if (!plan_id || !batch_name || !quantity || !unit || !target_date)
      return res.status(400).json({ error: 'plan_id, batch_name, quantity, unit, target_date required' });
    const record = await insert('production_batches', { plan_id, batch_name, quantity, unit, target_date, yield_percentage: yield_percentage || 100, assigned_to, notes });
    await logManualAudit(req.user.id, 'create', 'production_batches', record.id, null, record, req.ip, req.headers['user-agent']);
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/batches/:id', adminOnly, async (req, res) => {
  try {
    const old = await findOne('production_batches', { id: req.params.id });
    if (!old) return res.status(404).json({ error: 'Batch not found' });
    const allowedFields = ['status', 'started_at', 'completed_at', 'batch_cost', 'yield_percentage', 'notes'];
    const updates = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    await update('production_batches', updates, { id: req.params.id });
    await logManualAudit(req.user.id, 'update', 'production_batches', req.params.id, old, updates, req.ip, req.headers['user-agent']);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Wastage Logs ──────────────────────────────────────────
router.get('/wastage', adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const rows = await query('SELECT * FROM wastage_logs ORDER BY logged_at DESC LIMIT ? OFFSET ?', [parseInt(limit), offset]);
    res.json({ wastage: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/wastage', adminOnly, async (req, res) => {
  try {
    const { batch_id, item_name, quantity, unit, cost_value, reason, stage, notes } = req.body;
    if (!item_name || !quantity || !unit || !reason) return res.status(400).json({ error: 'item_name, quantity, unit, reason required' });
    const record = await insert('wastage_logs', { batch_id, item_name, quantity, unit, cost_value: cost_value || 0, reason, stage: stage || 'prep', logged_by: req.user.id, notes });
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Dispatches ────────────────────────────────────────────
router.get('/dispatches', adminOnly, async (req, res) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT * FROM branch_dispatches WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    sql += ' ORDER BY dispatch_time DESC LIMIT 100';
    const rows = await query(sql, params);
    res.json({ dispatches: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/dispatches', adminOnly, async (req, res) => {
  try {
    const { batch_id, to_branch, item_name, qty, unit, driver_name, notes } = req.body;
    if (!batch_id || !to_branch || !item_name || !qty) return res.status(400).json({ error: 'batch_id, to_branch, item_name, qty required' });
    const record = await insert('branch_dispatches', { batch_id, from_branch: 1, to_branch, item_name, qty, unit: unit || 'unit', driver_name, notes });
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/dispatches/:id/status', adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'in_transit', 'received', 'rejected'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const updates = { status };
    if (status === 'received') updates.received_time = new Date();
    await update('branch_dispatches', updates, { id: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Semi-finished goods ───────────────────────────────────
router.get('/semi-finished', adminOnly, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM semi_finished_goods WHERE is_active = 1 ORDER BY name');
    res.json({ items: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/semi-finished', adminOnly, async (req, res) => {
  try {
    const { name, sku, unit, stock_qty, reorder_point, cost_per_unit, storage_location, expiry_hours } = req.body;
    if (!name || !unit) return res.status(400).json({ error: 'name and unit required' });
    const record = await insert('semi_finished_goods', { name, sku, unit, stock_qty: stock_qty || 0, reorder_point: reorder_point || 0, cost_per_unit: cost_per_unit || 0, storage_location, expiry_hours });
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

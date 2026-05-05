const express = require('express');
const { findOne, findMany, insert, update, query } = require('../config/database');
const { requireRole } = require('../middleware/auth');
const { logManualAudit } = require('../middleware/audit');
const router = express.Router();
const adminOnly = requireRole(['admin']);

// ── Assets CRUD ───────────────────────────────────────────
router.get('/', adminOnly, async (req, res) => {
  try {
    const { status, category, page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let sql = 'SELECT * FROM assets WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (category) { sql += ' AND category = ?'; params.push(category); }
    sql += ' ORDER BY name ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    const rows = await query(sql, params);
    const [{ total }] = await query('SELECT COUNT(*) as total FROM assets WHERE 1=1' + (status ? ' AND status=?' : '') + (category ? ' AND category=?' : ''), params.slice(0, -2));
    res.json({ assets: rows, total });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', adminOnly, async (req, res) => {
  try {
    const asset = await findOne('assets', { id: req.params.id });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    const maintenance = await query('SELECT * FROM asset_maintenance WHERE asset_id = ? ORDER BY scheduled_date DESC LIMIT 10', [req.params.id]);
    const services = await query('SELECT * FROM asset_service_logs WHERE asset_id = ? ORDER BY service_date DESC LIMIT 10', [req.params.id]);
    res.json({ asset, maintenance, services });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', adminOnly, async (req, res) => {
  try {
    const required = ['asset_code', 'name', 'category'];
    for (const f of required) if (!req.body[f]) return res.status(400).json({ error: `${f} required` });
    const record = await insert('assets', { ...req.body, current_value: req.body.purchase_cost || 0 });
    await logManualAudit(req.user.id, 'create', 'assets', record.id, null, record, req.ip, req.headers['user-agent']);
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', adminOnly, async (req, res) => {
  try {
    const old = await findOne('assets', { id: req.params.id });
    if (!old) return res.status(404).json({ error: 'Asset not found' });
    const allowed = ['name', 'category', 'location', 'status', 'current_value', 'warranty_expiry', 'notes'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    await update('assets', updates, { id: req.params.id });
    await logManualAudit(req.user.id, 'update', 'assets', req.params.id, old, updates, req.ip, req.headers['user-agent']);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Maintenance schedule ──────────────────────────────────
router.get('/maintenance/schedule', adminOnly, async (req, res) => {
  try {
    const { from, to } = req.query;
    const rows = await query(
      `SELECT am.*, a.name as asset_name, a.asset_code FROM asset_maintenance am
       JOIN assets a ON am.asset_id = a.id
       WHERE am.scheduled_date BETWEEN ? AND ? ORDER BY am.scheduled_date ASC`,
      [from || new Date().toISOString().split('T')[0], to || '2099-12-31']
    );
    res.json({ schedule: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/maintenance', adminOnly, async (req, res) => {
  try {
    const { asset_id, maintenance_type, scheduled_date, technician_name, cost, notes } = req.body;
    if (!asset_id || !maintenance_type || !scheduled_date)
      return res.status(400).json({ error: 'asset_id, maintenance_type, scheduled_date required' });
    const record = await insert('asset_maintenance', { asset_id, maintenance_type, scheduled_date, technician_name, cost: cost || 0, notes });
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/maintenance/:id', adminOnly, async (req, res) => {
  try {
    const { status, completed_date, cost, notes } = req.body;
    await update('asset_maintenance', { status, completed_date, cost, notes }, { id: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Service logs ──────────────────────────────────────────
router.post('/service-logs', adminOnly, async (req, res) => {
  try {
    const { asset_id, service_date, service_type, technician, vendor, cost, description, next_service_date } = req.body;
    if (!asset_id || !service_date || !service_type)
      return res.status(400).json({ error: 'asset_id, service_date, service_type required' });
    const record = await insert('asset_service_logs', { asset_id, service_date, service_type, technician, vendor, cost: cost || 0, description, next_service_date, created_by: req.user.id });
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Depreciation report ───────────────────────────────────
router.get('/depreciation/report', adminOnly, async (req, res) => {
  try {
    const assets = await query(`SELECT id, name, asset_code, purchase_cost, purchase_date, useful_life_years, salvage_value, depreciation_method FROM assets WHERE status != 'disposed'`);
    const today = new Date();
    const report = assets.map(a => {
      const years = a.purchase_date ? (today - new Date(a.purchase_date)) / (365.25 * 24 * 3600 * 1000) : 0;
      const depreciable = (parseFloat(a.purchase_cost) - parseFloat(a.salvage_value));
      const annual = a.useful_life_years > 0 ? depreciable / a.useful_life_years : 0;
      const accumulated = Math.min(annual * years, depreciable);
      const book_value = parseFloat(a.purchase_cost) - accumulated;
      return { ...a, years_in_service: years.toFixed(1), annual_depreciation: annual.toFixed(2), accumulated_depreciation: accumulated.toFixed(2), book_value: book_value.toFixed(2) };
    });
    res.json({ report });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

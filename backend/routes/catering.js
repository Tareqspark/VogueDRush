const express = require('express');
const { findOne, insert, update, query } = require('../config/database');
const { requireRole } = require('../middleware/auth');
const { logManualAudit } = require('../middleware/audit');
const router = express.Router();
const adminOnly = requireRole(['admin']);

// ── Events ────────────────────────────────────────────────
router.get('/events', adminOnly, async (req, res) => {
  try {
    const { status, from, to, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let sql = 'SELECT * FROM catering_events WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (from) { sql += ' AND event_date >= ?'; params.push(from); }
    if (to) { sql += ' AND event_date <= ?'; params.push(to); }
    sql += ' ORDER BY event_date DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    const rows = await query(sql, params);
    res.json({ events: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/events/:id', adminOnly, async (req, res) => {
  try {
    const event = await findOne('catering_events', { id: req.params.id });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    const payments = await query('SELECT * FROM catering_payments WHERE event_id = ? ORDER BY payment_date DESC', [req.params.id]);
    res.json({ event, payments });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/events', adminOnly, async (req, res) => {
  try {
    const required = ['event_name', 'client_name', 'event_date', 'guest_count'];
    for (const f of required) if (!req.body[f]) return res.status(400).json({ error: `${f} required` });
    const record = await insert('catering_events', { ...req.body, created_by: req.user.id });
    await logManualAudit(req.user.id, 'create', 'catering_events', record.id, null, record, req.ip, req.headers['user-agent']);
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/events/:id', adminOnly, async (req, res) => {
  try {
    const old = await findOne('catering_events', { id: req.params.id });
    if (!old) return res.status(404).json({ error: 'Event not found' });
    const allowed = ['event_name', 'status', 'guest_count', 'total_amount', 'advance_paid', 'special_requirements', 'venue', 'event_date', 'event_time'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    await update('catering_events', updates, { id: req.params.id });
    await logManualAudit(req.user.id, 'update', 'catering_events', req.params.id, old, updates, req.ip, req.headers['user-agent']);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Packages ──────────────────────────────────────────────
router.get('/packages', adminOnly, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM catering_packages WHERE is_active = 1 ORDER BY price_per_head ASC');
    res.json({ packages: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/packages', adminOnly, async (req, res) => {
  try {
    const { name, description, price_per_head, min_guests, max_guests, includes_setup, includes_service, items_json } = req.body;
    if (!name || !price_per_head) return res.status(400).json({ error: 'name and price_per_head required' });
    const record = await insert('catering_packages', { name, description, price_per_head, min_guests: min_guests || 10, max_guests: max_guests || 500, includes_setup: includes_setup ? 1 : 0, includes_service: includes_service ? 1 : 0, items_json });
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Payments ──────────────────────────────────────────────
router.post('/events/:id/payments', adminOnly, async (req, res) => {
  try {
    const event = await findOne('catering_events', { id: req.params.id });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    const { amount, payment_date, payment_method, reference, payment_type, notes } = req.body;
    if (!amount || !payment_date || !payment_method) return res.status(400).json({ error: 'amount, payment_date, payment_method required' });
    const record = await insert('catering_payments', { event_id: req.params.id, amount, payment_date, payment_method, reference, payment_type: payment_type || 'advance', received_by: req.user.id, notes });
    await query('UPDATE catering_events SET advance_paid = advance_paid + ? WHERE id = ?', [amount, req.params.id]);
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

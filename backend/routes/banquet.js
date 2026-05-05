const express = require('express');
const { findOne, insert, update, query } = require('../config/database');
const { requireRole } = require('../middleware/auth');
const { logManualAudit } = require('../middleware/audit');
const router = express.Router();
const adminOnly = requireRole(['admin']);
const genRef = () => 'BNQ-' + Date.now().toString(36).toUpperCase().slice(-6);

// ── Halls ─────────────────────────────────────────────────
router.get('/halls', adminOnly, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM banquet_halls ORDER BY name');
    res.json({ halls: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/halls', adminOnly, async (req, res) => {
  try {
    const { name, capacity, floor, area_sqft, hourly_rate, daily_rate, amenities } = req.body;
    if (!name || !capacity) return res.status(400).json({ error: 'name and capacity required' });
    const record = await insert('banquet_halls', { name, capacity, floor, area_sqft, hourly_rate: hourly_rate || 0, daily_rate: daily_rate || 0, amenities });
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/halls/:id', adminOnly, async (req, res) => {
  try {
    const allowed = ['name', 'capacity', 'status', 'hourly_rate', 'daily_rate', 'amenities'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    await update('banquet_halls', updates, { id: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Bookings ──────────────────────────────────────────────
router.get('/bookings', adminOnly, async (req, res) => {
  try {
    const { status, from, to, hall_id, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let sql = 'SELECT bb.*, bh.name as hall_name FROM banquet_bookings bb JOIN banquet_halls bh ON bb.hall_id = bh.id WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND bb.status = ?'; params.push(status); }
    if (hall_id) { sql += ' AND bb.hall_id = ?'; params.push(hall_id); }
    if (from) { sql += ' AND bb.event_date >= ?'; params.push(from); }
    if (to) { sql += ' AND bb.event_date <= ?'; params.push(to); }
    sql += ' ORDER BY bb.event_date DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    const rows = await query(sql, params);
    res.json({ bookings: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/bookings/:id', adminOnly, async (req, res) => {
  try {
    const booking = await findOne('banquet_bookings', { id: req.params.id });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    const services = await query('SELECT * FROM banquet_services WHERE booking_id = ?', [req.params.id]);
    res.json({ booking, services });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/bookings', adminOnly, async (req, res) => {
  try {
    const required = ['hall_id', 'client_name', 'event_date', 'start_time', 'end_time', 'guest_count'];
    for (const f of required) if (!req.body[f]) return res.status(400).json({ error: `${f} required` });
    const record = await insert('banquet_bookings', { ...req.body, booking_ref: genRef(), created_by: req.user.id });
    await logManualAudit(req.user.id, 'create', 'banquet_bookings', record.id, null, record, req.ip, req.headers['user-agent']);
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/bookings/:id', adminOnly, async (req, res) => {
  try {
    const old = await findOne('banquet_bookings', { id: req.params.id });
    if (!old) return res.status(404).json({ error: 'Booking not found' });
    const allowed = ['status', 'guest_count', 'total_amount', 'advance_paid', 'special_requests'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    await update('banquet_bookings', updates, { id: req.params.id });
    await logManualAudit(req.user.id, 'update', 'banquet_bookings', req.params.id, old, updates, req.ip, req.headers['user-agent']);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Services / Add-ons ────────────────────────────────────
router.post('/bookings/:id/services', adminOnly, async (req, res) => {
  try {
    const { service_name, quantity, unit_price, notes } = req.body;
    if (!service_name || !unit_price) return res.status(400).json({ error: 'service_name and unit_price required' });
    const record = await insert('banquet_services', { booking_id: req.params.id, service_name, quantity: quantity || 1, unit_price, notes });
    await query('UPDATE banquet_bookings SET total_amount = total_amount + ? WHERE id = ?', [parseFloat(unit_price) * (quantity || 1), req.params.id]);
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

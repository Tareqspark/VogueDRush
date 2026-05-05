const express = require('express');
const { findOne, insert, update, query } = require('../config/database');
const { requireRole } = require('../middleware/auth');
const router = express.Router();
const adminOnly = requireRole(['admin']);
const staffRole = requireRole(['admin', 'staff']);

// ── Customer lookup ───────────────────────────────────────
router.get('/customers', staffRole, async (req, res) => {
  try {
    const { phone, name, page = 1, limit = 20 } = req.query;
    let sql = 'SELECT cc.*, (SELECT COUNT(*) FROM orders o WHERE o.customer_phone = cc.phone) as total_orders FROM call_customers cc WHERE 1=1';
    const params = [];
    if (phone) { sql += ' AND cc.phone LIKE ?'; params.push(`%${phone}%`); }
    if (name) { sql += ' AND cc.name LIKE ?'; params.push(`%${name}%`); }
    sql += ' ORDER BY cc.updated_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
    const rows = await query(sql, params);
    res.json({ customers: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/customers/:phone/lookup', staffRole, async (req, res) => {
  try {
    const customer = await findOne('call_customers', { phone: req.params.phone });
    const lastOrders = await query('SELECT * FROM orders WHERE customer_phone = ? ORDER BY created_at DESC LIMIT 3', [req.params.phone]);
    res.json({ customer, last_orders: lastOrders });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/customers', staffRole, async (req, res) => {
  try {
    const { phone, name, email, address, notes } = req.body;
    if (!phone) return res.status(400).json({ error: 'phone required' });
    const existing = await findOne('call_customers', { phone });
    if (existing) {
      const updates = {};
      if (name) updates.name = name;
      if (address) updates.address = address;
      if (email) updates.email = email;
      if (notes) updates.notes = notes;
      await update('call_customers', updates, { phone });
      return res.json({ ...existing, ...updates });
    }
    const record = await insert('call_customers', { phone, name, email, address, notes });
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Call logs ─────────────────────────────────────────────
router.get('/calls', adminOnly, async (req, res) => {
  try {
    const { agent_id, from, to, outcome, page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let sql = 'SELECT cl.*, u.full_name as agent_name FROM call_logs cl LEFT JOIN users u ON cl.agent_id = u.id WHERE 1=1';
    const params = [];
    if (agent_id) { sql += ' AND cl.agent_id = ?'; params.push(agent_id); }
    if (outcome) { sql += ' AND cl.outcome = ?'; params.push(outcome); }
    if (from) { sql += ' AND cl.started_at >= ?'; params.push(from); }
    if (to) { sql += ' AND cl.started_at <= ?'; params.push(to + ' 23:59:59'); }
    sql += ' ORDER BY cl.started_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    const rows = await query(sql, params);
    res.json({ calls: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/calls', staffRole, async (req, res) => {
  try {
    const { customer_phone, call_type, notes } = req.body;
    if (!customer_phone) return res.status(400).json({ error: 'customer_phone required' });
    const record = await insert('call_logs', { agent_id: req.user.id, customer_phone, call_type: call_type || 'inbound', started_at: new Date(), notes });
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/calls/:id', staffRole, async (req, res) => {
  try {
    const { outcome, duration_seconds, order_placed, notes } = req.body;
    await update('call_logs', { outcome, duration_seconds, order_placed: order_placed ? 1 : 0, ended_at: new Date(), notes }, { id: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Dashboard ─────────────────────────────────────────────
router.get('/dashboard', adminOnly, async (req, res) => {
  try {
    const [today] = await query("SELECT COUNT(*) as cnt FROM call_logs WHERE DATE(started_at) = CURDATE()");
    const [orders] = await query("SELECT COUNT(*) as cnt FROM call_logs WHERE DATE(started_at) = CURDATE() AND order_placed = 1");
    const [avgDur] = await query("SELECT AVG(duration_seconds) as avg FROM call_logs WHERE duration_seconds > 0 AND DATE(started_at) = CURDATE()");
    const agents = await query("SELECT u.full_name, COUNT(cl.id) as calls, AVG(cl.duration_seconds) as avg_dur FROM call_logs cl JOIN users u ON cl.agent_id = u.id WHERE DATE(cl.started_at) = CURDATE() GROUP BY cl.agent_id");
    res.json({ calls_today: today.cnt, orders_placed: orders.cnt, avg_duration_sec: Math.round(avgDur.avg || 0), agents });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

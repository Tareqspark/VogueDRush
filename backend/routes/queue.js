const express = require('express');
const { findOne, insert, update, query } = require('../config/database');
const { requireRole } = require('../middleware/auth');
const router = express.Router();
const staffRole = requireRole(['admin', 'staff']);
const adminOnly = requireRole(['admin']);

// ── Issue a token ─────────────────────────────────────────
router.post('/tokens', staffRole, async (req, res) => {
  try {
    const { service_type, customer_name, customer_phone, priority } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const [{ last }] = await query("SELECT MAX(token_number) as last FROM queue_tokens WHERE DATE(issued_at) = ?", [today]);
    const token_number = (last || 0) + 1;
    const record = await insert('queue_tokens', { token_number, service_type, customer_name, customer_phone, priority: priority || 'normal', issued_at: new Date() });
    res.status(201).json({ ...record, display_token: `T${String(token_number).padStart(3, '0')}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/tokens', staffRole, async (req, res) => {
  try {
    const { status = 'waiting' } = req.query;
    const rows = await query(
      "SELECT *, CONCAT('T', LPAD(token_number, 3, '0')) as display_token FROM queue_tokens WHERE status = ? ORDER BY priority = 'urgent' DESC, issued_at ASC",
      [status]
    );
    res.json({ tokens: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/tokens/:id/call', staffRole, async (req, res) => {
  try {
    await update('queue_tokens', { status: 'called', called_at: new Date() }, { id: req.params.id });
    await insert('queue_events', { token_id: req.params.id, event_type: 'called', changed_by: req.user.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/tokens/:id/serve', staffRole, async (req, res) => {
  try {
    await update('queue_tokens', { status: 'serving', serving_at: new Date() }, { id: req.params.id });
    await insert('queue_events', { token_id: req.params.id, event_type: 'serving', changed_by: req.user.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/tokens/:id/complete', staffRole, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const valid = ['completed', 'no_show', 'cancelled'];
    if (!valid.includes(status)) return res.status(400).json({ error: `status must be one of: ${valid.join(', ')}` });
    await update('queue_tokens', { status, completed_at: new Date(), notes }, { id: req.params.id });
    await insert('queue_events', { token_id: req.params.id, event_type: status, changed_by: req.user.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Dashboard stats ───────────────────────────────────────
router.get('/dashboard', staffRole, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [waiting] = await query("SELECT COUNT(*) as cnt FROM queue_tokens WHERE status='waiting' AND DATE(issued_at) = ?", [today]);
    const [serving] = await query("SELECT * FROM queue_tokens WHERE status='serving' ORDER BY serving_at DESC LIMIT 1");
    const [avg] = await query("SELECT AVG(TIMESTAMPDIFF(MINUTE, issued_at, called_at)) as avg_wait FROM queue_tokens WHERE called_at IS NOT NULL AND DATE(issued_at) = ?", [today]);
    const [total] = await query("SELECT COUNT(*) as cnt FROM queue_tokens WHERE DATE(issued_at) = ?", [today]);
    res.json({ waiting: waiting.cnt, serving_now: serving || null, avg_wait_min: Math.round(avg.avg_wait || 0), total_today: total.cnt });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── History ───────────────────────────────────────────────
router.get('/history', adminOnly, async (req, res) => {
  try {
    const { date } = req.query;
    const rows = await query("SELECT * FROM queue_tokens WHERE DATE(issued_at) = ? ORDER BY token_number ASC", [date || new Date().toISOString().split('T')[0]]);
    res.json({ history: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

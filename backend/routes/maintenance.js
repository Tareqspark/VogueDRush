const express = require('express');
const { findOne, insert, update, query } = require('../config/database');
const { requireRole } = require('../middleware/auth');
const { logManualAudit } = require('../middleware/audit');
const router = express.Router();
const adminOnly = requireRole(['admin']);
const crypto = require('crypto');

const genTicket = () => 'TKT-' + Date.now().toString(36).toUpperCase().slice(-6);

// ── Tickets ───────────────────────────────────────────────
router.get('/tickets', adminOnly, async (req, res) => {
  try {
    const { status, priority, page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let sql = 'SELECT mt.*, u.full_name as reporter_name FROM maintenance_tickets mt LEFT JOIN users u ON mt.reported_by = u.id WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND mt.status = ?'; params.push(status); }
    if (priority) { sql += ' AND mt.priority = ?'; params.push(priority); }
    sql += ' ORDER BY FIELD(mt.priority,"critical","high","medium","low"), mt.opened_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    const rows = await query(sql, params);
    res.json({ tickets: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/tickets/:id', adminOnly, async (req, res) => {
  try {
    const ticket = await findOne('maintenance_tickets', { id: req.params.id });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    const logs = await query('SELECT * FROM maintenance_logs WHERE ticket_id = ? ORDER BY performed_at DESC', [req.params.id]);
    res.json({ ticket, logs });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/tickets', adminOnly, async (req, res) => {
  try {
    const { asset_id, issue_title, description, priority, sla_hours } = req.body;
    if (!issue_title) return res.status(400).json({ error: 'issue_title required' });
    const record = await insert('maintenance_tickets', {
      ticket_number: genTicket(), asset_id, issue_title, description,
      priority: priority || 'medium', sla_hours: sla_hours || 24, reported_by: req.user.id
    });
    await logManualAudit(req.user.id, 'create', 'maintenance_tickets', record.id, null, record, req.ip, req.headers['user-agent']);
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/tickets/:id', adminOnly, async (req, res) => {
  try {
    const old = await findOne('maintenance_tickets', { id: req.params.id });
    if (!old) return res.status(404).json({ error: 'Ticket not found' });
    const allowed = ['status', 'assigned_to_name', 'priority', 'resolution_notes', 'resolved_at', 'closed_at'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    if (req.body.status === 'resolved' && !updates.resolved_at) updates.resolved_at = new Date();
    if (req.body.status === 'closed' && !updates.closed_at) updates.closed_at = new Date();
    await update('maintenance_tickets', updates, { id: req.params.id });
    await logManualAudit(req.user.id, 'update', 'maintenance_tickets', req.params.id, old, updates, req.ip, req.headers['user-agent']);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Logs ──────────────────────────────────────────────────
router.post('/tickets/:id/logs', adminOnly, async (req, res) => {
  try {
    const { action, performed_by, time_spent_minutes, parts_used, cost, notes } = req.body;
    if (!action) return res.status(400).json({ error: 'action required' });
    const record = await insert('maintenance_logs', {
      ticket_id: req.params.id, action, performed_by: performed_by || req.user.full_name,
      time_spent_minutes: time_spent_minutes || 0, parts_used, cost: cost || 0, notes
    });
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Dashboard stats ───────────────────────────────────────
router.get('/stats', adminOnly, async (req, res) => {
  try {
    const [open] = await query("SELECT COUNT(*) as cnt FROM maintenance_tickets WHERE status NOT IN ('resolved','closed')");
    const [critical] = await query("SELECT COUNT(*) as cnt FROM maintenance_tickets WHERE priority = 'critical' AND status NOT IN ('resolved','closed')");
    const [resolved7d] = await query("SELECT COUNT(*) as cnt FROM maintenance_tickets WHERE status='resolved' AND resolved_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)");
    const [avgResolution] = await query("SELECT AVG(TIMESTAMPDIFF(HOUR, opened_at, resolved_at)) as avg_hours FROM maintenance_tickets WHERE resolved_at IS NOT NULL");
    res.json({ open: open.cnt, critical: critical.cnt, resolved_7d: resolved7d.cnt, avg_resolution_hours: Math.round(avgResolution.avg_hours || 0) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

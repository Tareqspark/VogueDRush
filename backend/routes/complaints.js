const express = require('express');
const { findOne, insert, update, query } = require('../config/database');
const { requireRole } = require('../middleware/auth');
const { logManualAudit } = require('../middleware/audit');
const router = express.Router();
const staffRole = requireRole(['admin', 'staff']);
const adminOnly = requireRole(['admin']);

const genRef = () => {
  const d = new Date();
  const ds = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  return 'CMP-' + ds + '-' + Date.now().toString(36).toUpperCase().slice(-4);
};

// ── Complaints ────────────────────────────────────────────
router.get('/', staffRole, async (req, res) => {
  try {
    const { status, priority, category, page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let sql = 'SELECT c.*, u.full_name as assigned_name FROM complaints c LEFT JOIN users u ON c.assigned_to = u.id WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND c.status = ?'; params.push(status); }
    if (priority) { sql += ' AND c.priority = ?'; params.push(priority); }
    if (category) { sql += ' AND c.category = ?'; params.push(category); }
    sql += ' ORDER BY FIELD(c.priority,"urgent","high","medium","low"), c.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    const rows = await query(sql, params);
    res.json({ complaints: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', staffRole, async (req, res) => {
  try {
    const complaint = await findOne('complaints', { id: req.params.id });
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
    const actions = await query('SELECT ca.*, u.full_name as actor_name FROM complaint_actions ca LEFT JOIN users u ON ca.performed_by = u.id WHERE ca.complaint_id = ? ORDER BY ca.created_at ASC', [req.params.id]);
    res.json({ complaint, actions });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', staffRole, async (req, res) => {
  try {
    const { customer_name, customer_phone, category, subject, description, priority, order_id } = req.body;
    if (!subject || !description) return res.status(400).json({ error: 'subject and description required' });
    const record = await insert('complaints', {
      ticket_ref: genRef(), customer_name, customer_phone, category: category || 'general',
      subject, description, priority: priority || 'medium', order_id, created_by: req.user.id
    });
    await logManualAudit(req.user.id, 'create', 'complaints', record.id, null, record, req.ip, req.headers['user-agent']);
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', staffRole, async (req, res) => {
  try {
    const old = await findOne('complaints', { id: req.params.id });
    if (!old) return res.status(404).json({ error: 'Complaint not found' });
    const allowed = ['status', 'priority', 'assigned_to', 'resolution_notes', 'resolved_at', 'compensation_amount', 'compensation_type'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    if (req.body.status === 'resolved' && !updates.resolved_at) updates.resolved_at = new Date();
    await update('complaints', updates, { id: req.params.id });
    await logManualAudit(req.user.id, 'update', 'complaints', req.params.id, old, updates, req.ip, req.headers['user-agent']);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/actions', staffRole, async (req, res) => {
  try {
    const { action_type, description, internal_note } = req.body;
    if (!action_type) return res.status(400).json({ error: 'action_type required' });
    const record = await insert('complaint_actions', { complaint_id: req.params.id, action_type, description, internal_note, performed_by: req.user.id });
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Dashboard ─────────────────────────────────────────────
router.get('/stats/summary', adminOnly, async (req, res) => {
  try {
    const [open] = await query("SELECT COUNT(*) as cnt FROM complaints WHERE status NOT IN ('resolved','closed')");
    const [resolved] = await query("SELECT COUNT(*) as cnt FROM complaints WHERE status = 'resolved'");
    const [avgRes] = await query("SELECT AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)) as avg_h FROM complaints WHERE resolved_at IS NOT NULL");
    const byCat = await query("SELECT category, COUNT(*) as cnt FROM complaints GROUP BY category ORDER BY cnt DESC");
    res.json({ open: open.cnt, resolved: resolved.cnt, avg_resolution_hours: Math.round(avgRes.avg_h || 0), by_category: byCat });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

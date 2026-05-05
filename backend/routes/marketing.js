const express = require('express');
const { findOne, insert, update, query } = require('../config/database');
const { requireRole } = require('../middleware/auth');
const { logManualAudit } = require('../middleware/audit');
const router = express.Router();
const adminOnly = requireRole(['admin']);

// ── Segments ──────────────────────────────────────────────
router.get('/segments', adminOnly, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM customer_segments WHERE is_active = 1 ORDER BY name');
    res.json({ segments: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/segments', adminOnly, async (req, res) => {
  try {
    const { name, description, criteria_json } = req.body;
    if (!name || !criteria_json) return res.status(400).json({ error: 'name and criteria_json required' });
    const record = await insert('customer_segments', { name, description, criteria_json });
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Campaigns ─────────────────────────────────────────────
router.get('/campaigns', adminOnly, async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let sql = 'SELECT * FROM campaigns WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (type) { sql += ' AND campaign_type = ?'; params.push(type); }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    const rows = await query(sql, params);
    res.json({ campaigns: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/campaigns/:id', adminOnly, async (req, res) => {
  try {
    const campaign = await findOne('campaigns', { id: req.params.id });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    const logs = await query('SELECT * FROM campaign_logs WHERE campaign_id = ? ORDER BY created_at DESC LIMIT 100', [req.params.id]);
    res.json({ campaign, logs });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/campaigns', adminOnly, async (req, res) => {
  try {
    const { name, campaign_type, trigger_type, segment_id, subject, message_body, scheduled_at } = req.body;
    if (!name || !campaign_type || !message_body) return res.status(400).json({ error: 'name, campaign_type, message_body required' });
    const record = await insert('campaigns', { name, campaign_type, trigger_type: trigger_type || 'manual', segment_id, subject, message_body, scheduled_at, created_by: req.user.id });
    await logManualAudit(req.user.id, 'create', 'campaigns', record.id, null, record, req.ip, req.headers['user-agent']);
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/campaigns/:id', adminOnly, async (req, res) => {
  try {
    const old = await findOne('campaigns', { id: req.params.id });
    if (!old) return res.status(404).json({ error: 'Campaign not found' });
    if (['running', 'completed'].includes(old.status))
      return res.status(400).json({ error: 'Cannot edit a running or completed campaign' });
    const allowed = ['name', 'message_body', 'subject', 'status', 'scheduled_at', 'segment_id'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    await update('campaigns', updates, { id: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Send / simulate a campaign ────────────────────────────
router.post('/campaigns/:id/send', adminOnly, async (req, res) => {
  try {
    const campaign = await findOne('campaigns', { id: req.params.id });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (campaign.status === 'running') return res.status(400).json({ error: 'Campaign already running' });
    await update('campaigns', { status: 'running' }, { id: req.params.id });
    // In a real system: queue messages via SMS/email/WhatsApp gateway
    const simulatedSent = Math.floor(Math.random() * 200) + 50;
    await update('campaigns', { status: 'completed', sent_count: simulatedSent, delivered_count: Math.floor(simulatedSent * 0.95) }, { id: req.params.id });
    res.json({ sent: simulatedSent, message: 'Campaign dispatched successfully' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Campaign stats ────────────────────────────────────────
router.get('/stats', adminOnly, async (req, res) => {
  try {
    const [total] = await query('SELECT COUNT(*) as cnt FROM campaigns');
    const [running] = await query("SELECT COUNT(*) as cnt FROM campaigns WHERE status='running'");
    const [sent] = await query("SELECT SUM(sent_count) as total FROM campaigns");
    res.json({ total_campaigns: total.cnt, running: running.cnt, total_sent: sent.total || 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

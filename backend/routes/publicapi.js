const express = require('express');
const { insert, update, query } = require('../config/database');
const { requireRole } = require('../middleware/auth');
const router = express.Router();
const adminOnly = requireRole(['admin']);
const crypto = require('crypto');

const genKey = () => 'fp_' + crypto.randomBytes(32).toString('hex');

// ── API Keys ──────────────────────────────────────────────
router.get('/keys', adminOnly, async (req, res) => {
  try {
    const rows = await query("SELECT id, name, key_prefix, scopes, is_active, created_at, last_used_at, expires_at FROM api_keys ORDER BY created_at DESC");
    res.json({ keys: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/keys', adminOnly, async (req, res) => {
  try {
    const { name, scopes, expires_at } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const api_key = genKey();
    const key_prefix = api_key.substring(0, 10) + '...';
    const record = await insert('api_keys', {
      name, api_key, key_prefix, scopes: JSON.stringify(scopes || []), expires_at, created_by: req.user.id
    });
    // Return full key only once
    res.status(201).json({ id: record.id, name, api_key, key_prefix, scopes, expires_at, message: 'Store this key securely. It will not be shown again.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/keys/:id/revoke', adminOnly, async (req, res) => {
  try {
    await update('api_keys', { is_active: 0, revoked_at: new Date() }, { id: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Webhooks ──────────────────────────────────────────────
router.get('/webhooks', adminOnly, async (req, res) => {
  try {
    const rows = await query("SELECT id, name, endpoint_url, events, is_active, created_at, last_triggered_at FROM webhooks ORDER BY name");
    res.json({ webhooks: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/webhooks', adminOnly, async (req, res) => {
  try {
    const { name, endpoint_url, events, secret } = req.body;
    if (!name || !endpoint_url) return res.status(400).json({ error: 'name and endpoint_url required' });
    try { new URL(endpoint_url); } catch { return res.status(400).json({ error: 'Invalid endpoint_url' }); }
    const signing_secret = secret || crypto.randomBytes(24).toString('hex');
    const record = await insert('webhooks', { name, endpoint_url, events: JSON.stringify(events || []), signing_secret, created_by: req.user.id });
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/webhooks/:id', adminOnly, async (req, res) => {
  try {
    const allowed = ['name', 'endpoint_url', 'events', 'is_active'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = f === 'events' ? JSON.stringify(req.body[f]) : req.body[f]; });
    await update('webhooks', updates, { id: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/webhooks/:id', adminOnly, async (req, res) => {
  try {
    await update('webhooks', { is_active: 0 }, { id: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Usage logs ────────────────────────────────────────────
router.get('/logs', adminOnly, async (req, res) => {
  try {
    const { from, to, status_code, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let sql = 'SELECT al.*, ak.name as key_name FROM api_logs al LEFT JOIN api_keys ak ON al.api_key_id = ak.id WHERE 1=1';
    const params = [];
    if (from) { sql += ' AND al.created_at >= ?'; params.push(from); }
    if (to) { sql += ' AND al.created_at <= ?'; params.push(to + ' 23:59:59'); }
    if (status_code) { sql += ' AND al.response_status = ?'; params.push(status_code); }
    sql += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    const rows = await query(sql, params);
    res.json({ logs: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Dashboard ─────────────────────────────────────────────
router.get('/dashboard', adminOnly, async (req, res) => {
  try {
    const [today] = await query("SELECT COUNT(*) as cnt FROM api_logs WHERE DATE(created_at) = CURDATE()");
    const [errors] = await query("SELECT COUNT(*) as cnt FROM api_logs WHERE response_status >= 400 AND DATE(created_at) = CURDATE()");
    const topEndpoints = await query("SELECT endpoint, COUNT(*) as hits FROM api_logs WHERE DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) GROUP BY endpoint ORDER BY hits DESC LIMIT 10");
    const [activeKeys] = await query("SELECT COUNT(*) as cnt FROM api_keys WHERE is_active = 1");
    res.json({ requests_today: today.cnt, errors_today: errors.cnt, error_rate: today.cnt > 0 ? ((errors.cnt / today.cnt) * 100).toFixed(1) : 0, top_endpoints: topEndpoints, active_keys: activeKeys.cnt });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

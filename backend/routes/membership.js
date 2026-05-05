const express = require('express');
const { findOne, insert, update, query } = require('../config/database');
const { requireRole } = require('../middleware/auth');
const router = express.Router();
const adminOnly = requireRole(['admin']);

// ── Plans ─────────────────────────────────────────────────
router.get('/plans', adminOnly, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM memberships WHERE is_active = 1 ORDER BY price_monthly ASC');
    res.json({ plans: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/plans', adminOnly, async (req, res) => {
  try {
    const { name, description, price_monthly, price_annual, benefits_json, max_members } = req.body;
    if (!name || !price_monthly) return res.status(400).json({ error: 'name and price_monthly required' });
    const record = await insert('memberships', { name, description, price_monthly, price_annual: price_annual || price_monthly * 11, benefits_json, max_members });
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/plans/:id', adminOnly, async (req, res) => {
  try {
    const allowed = ['name', 'description', 'price_monthly', 'price_annual', 'benefits_json', 'max_members', 'is_active'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    await update('memberships', updates, { id: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Subscriptions ─────────────────────────────────────────
router.get('/subscriptions', adminOnly, async (req, res) => {
  try {
    const { status, expiring_soon, page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let sql = 'SELECT ms.*, m.name as plan_name, m.price_monthly FROM membership_subscriptions ms JOIN memberships m ON ms.membership_id = m.id WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND ms.status = ?'; params.push(status); }
    if (expiring_soon === 'true') { sql += ' AND ms.end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)'; }
    sql += ' ORDER BY ms.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    const rows = await query(sql, params);
    res.json({ subscriptions: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/subscriptions', adminOnly, async (req, res) => {
  try {
    const { membership_id, member_name, member_phone, member_email, billing_cycle, start_date, payment_method } = req.body;
    if (!membership_id || !member_name || !member_phone) return res.status(400).json({ error: 'membership_id, member_name, member_phone required' });
    const plan = await findOne('memberships', { id: membership_id });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    const months = billing_cycle === 'annual' ? 12 : 1;
    const start = new Date(start_date || new Date());
    const end = new Date(start); end.setMonth(end.getMonth() + months);
    const amount = billing_cycle === 'annual' ? plan.price_annual : plan.price_monthly;
    const record = await insert('membership_subscriptions', { membership_id, member_name, member_phone, member_email, billing_cycle: billing_cycle || 'monthly', start_date: start.toISOString().split('T')[0], end_date: end.toISOString().split('T')[0], amount_paid: amount, payment_method, created_by: req.user.id });
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/subscriptions/:id/cancel', adminOnly, async (req, res) => {
  try {
    await update('membership_subscriptions', { status: 'cancelled', cancelled_at: new Date() }, { id: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Dashboard ─────────────────────────────────────────────
router.get('/dashboard', adminOnly, async (req, res) => {
  try {
    const [active] = await query("SELECT COUNT(*) as cnt FROM membership_subscriptions WHERE status='active'");
    const [expiring] = await query("SELECT COUNT(*) as cnt FROM membership_subscriptions WHERE status='active' AND end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)");
    const [revenue] = await query("SELECT SUM(amount_paid) as total FROM membership_subscriptions WHERE MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW())");
    res.json({ active_members: active.cnt, expiring_this_month: expiring.cnt, monthly_revenue: revenue.total || 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

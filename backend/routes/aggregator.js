const express = require('express');
const { findOne, insert, update, query } = require('../config/database');
const { requireRole } = require('../middleware/auth');
const router = express.Router();
const adminOnly = requireRole(['admin']);

// ── Orders ────────────────────────────────────────────────
router.get('/orders', adminOnly, async (req, res) => {
  try {
    const { platform, status, from, to, page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let sql = 'SELECT * FROM aggregator_orders WHERE 1=1';
    const params = [];
    if (platform) { sql += ' AND platform = ?'; params.push(platform); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (from) { sql += ' AND ordered_at >= ?'; params.push(from); }
    if (to) { sql += ' AND ordered_at <= ?'; params.push(to + ' 23:59:59'); }
    sql += ' ORDER BY ordered_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    const rows = await query(sql, params);
    res.json({ orders: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/orders/:id/accept', adminOnly, async (req, res) => {
  try {
    const order = await findOne('aggregator_orders', { id: req.params.id });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    await update('aggregator_orders', { status: 'accepted', accepted_at: new Date() }, { id: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/orders/:id/status', adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['accepted', 'preparing', 'ready', 'dispatched', 'delivered', 'cancelled'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    await update('aggregator_orders', { status }, { id: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Settlements ───────────────────────────────────────────
router.get('/settlements', adminOnly, async (req, res) => {
  try {
    const { platform, is_reconciled, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let sql = 'SELECT * FROM aggregator_settlements WHERE 1=1';
    const params = [];
    if (platform) { sql += ' AND platform = ?'; params.push(platform); }
    if (is_reconciled !== undefined) { sql += ' AND is_reconciled = ?'; params.push(is_reconciled === 'true' ? 1 : 0); }
    sql += ' ORDER BY period_end DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    const rows = await query(sql, params);
    res.json({ settlements: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/settlements', adminOnly, async (req, res) => {
  try {
    const { platform, period_start, period_end, gross_revenue, commission_rate, commission_amount, taxes_deducted } = req.body;
    if (!platform || !period_start || !period_end) return res.status(400).json({ error: 'platform, period_start, period_end required' });
    const net = (parseFloat(gross_revenue) - parseFloat(commission_amount || 0) - parseFloat(taxes_deducted || 0)).toFixed(2);
    const record = await insert('aggregator_settlements', { platform, period_start, period_end, gross_revenue, commission_rate, commission_amount, taxes_deducted, net_payout: net });
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/settlements/:id/reconcile', adminOnly, async (req, res) => {
  try {
    const { bank_reference } = req.body;
    await update('aggregator_settlements', { is_reconciled: 1, bank_reference, reconciled_at: new Date() }, { id: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Platform analytics ────────────────────────────────────
router.get('/analytics', adminOnly, async (req, res) => {
  try {
    const { from, to } = req.query;
    const rows = await query(
      `SELECT platform, COUNT(*) as orders, SUM(order_amount) as gross, SUM(commission_deducted) as commission, AVG(order_amount) as avg_order
       FROM aggregator_orders WHERE ordered_at BETWEEN ? AND ? GROUP BY platform ORDER BY gross DESC`,
      [from || '2020-01-01', to || '2099-12-31']
    );
    res.json({ analytics: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

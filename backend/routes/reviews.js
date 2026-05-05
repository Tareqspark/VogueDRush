const express = require('express');
const { findOne, insert, update, query } = require('../config/database');
const { requireRole } = require('../middleware/auth');
const router = express.Router();
const adminOnly = requireRole(['admin']);

// ── Sources ───────────────────────────────────────────────
router.get('/sources', adminOnly, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM review_sources ORDER BY platform');
    res.json({ sources: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/sources/:id', adminOnly, async (req, res) => {
  try {
    const { api_connected } = req.body;
    await update('review_sources', { api_connected: api_connected ? 1 : 0, last_sync: new Date() }, { id: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Reviews ───────────────────────────────────────────────
router.get('/reviews', adminOnly, async (req, res) => {
  try {
    const { sentiment, source_id, min_rating, page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let sql = 'SELECT cr.*, rs.platform FROM customer_reviews cr JOIN review_sources rs ON cr.source_id = rs.id WHERE 1=1';
    const params = [];
    if (sentiment) { sql += ' AND cr.sentiment = ?'; params.push(sentiment); }
    if (source_id) { sql += ' AND cr.source_id = ?'; params.push(source_id); }
    if (min_rating) { sql += ' AND cr.rating >= ?'; params.push(min_rating); }
    sql += ' ORDER BY cr.review_date DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    const rows = await query(sql, params);
    res.json({ reviews: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/reviews', adminOnly, async (req, res) => {
  try {
    const { source_id, reviewer_name, rating, review_text, review_date } = req.body;
    if (!source_id || !rating) return res.status(400).json({ error: 'source_id and rating required' });
    const sentiment = parseFloat(rating) >= 4 ? 'positive' : parseFloat(rating) >= 3 ? 'neutral' : 'negative';
    const record = await insert('customer_reviews', { source_id, reviewer_name, rating, review_text, sentiment, review_date: review_date || new Date().toISOString().split('T')[0] });
    // Auto-create alert for negative reviews
    if (sentiment === 'negative') {
      await insert('review_alerts', { review_id: record.id, alert_type: 'low_rating' });
    }
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/reviews/:id/respond', adminOnly, async (req, res) => {
  try {
    const { response_text } = req.body;
    if (!response_text) return res.status(400).json({ error: 'response_text required' });
    await update('customer_reviews', { is_responded: 1, response_text, responded_at: new Date() }, { id: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Alerts ────────────────────────────────────────────────
router.get('/alerts', adminOnly, async (req, res) => {
  try {
    const rows = await query(`
      SELECT ra.*, cr.reviewer_name, cr.rating, cr.review_text, rs.platform
      FROM review_alerts ra
      JOIN customer_reviews cr ON ra.review_id = cr.id
      JOIN review_sources rs ON cr.source_id = rs.id
      WHERE ra.status = 'open' ORDER BY ra.created_at DESC LIMIT 50`);
    res.json({ alerts: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/alerts/:id/resolve', adminOnly, async (req, res) => {
  try {
    await update('review_alerts', { status: 'resolved', resolved_at: new Date() }, { id: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Sentiment summary ─────────────────────────────────────
router.get('/sentiment-summary', adminOnly, async (req, res) => {
  try {
    const { from, to } = req.query;
    const rows = await query(
      `SELECT sentiment, COUNT(*) as cnt, AVG(rating) as avg_rating FROM customer_reviews
       WHERE review_date BETWEEN ? AND ? GROUP BY sentiment`,
      [from || '2020-01-01', to || new Date().toISOString().split('T')[0]]
    );
    const [overall] = await query('SELECT AVG(rating) as avg, COUNT(*) as total FROM customer_reviews WHERE review_date BETWEEN ? AND ?', [from || '2020-01-01', to || new Date().toISOString().split('T')[0]]);
    res.json({ breakdown: rows, overall_avg: parseFloat(overall.avg || 0).toFixed(2), total: overall.total });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

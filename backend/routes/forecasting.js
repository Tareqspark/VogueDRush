const express = require('express');
const { insert, update, query } = require('../config/database');
const { requireRole } = require('../middleware/auth');
const router = express.Router();
const adminOnly = requireRole(['admin']);

// ── Forecast models ───────────────────────────────────────
router.get('/models', adminOnly, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM forecast_models ORDER BY name');
    res.json({ models: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/models', adminOnly, async (req, res) => {
  try {
    const { name, model_type, target_metric, lookback_days, horizon_days } = req.body;
    if (!name || !model_type || !target_metric) return res.status(400).json({ error: 'name, model_type, target_metric required' });
    const record = await insert('forecast_models', { name, model_type, target_metric, lookback_days: lookback_days || 90, horizon_days: horizon_days || 30 });
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/models/:id/train', adminOnly, async (req, res) => {
  try {
    // Simulate model training — in production, kick off an ML job
    const accuracy = (Math.random() * 0.2 + 0.78).toFixed(4);
    const mape = (Math.random() * 5 + 5).toFixed(2);
    await update('forecast_models', { accuracy_score: accuracy, mape_percent: mape, last_trained: new Date(), status: 'trained' }, { id: req.params.id });
    res.json({ accuracy_score: accuracy, mape_percent: mape });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Forecast results ──────────────────────────────────────
router.get('/results', adminOnly, async (req, res) => {
  try {
    const { model_id, from, to } = req.query;
    let sql = 'SELECT fr.*, fm.name as model_name FROM forecast_results fr JOIN forecast_models fm ON fr.model_id = fm.id WHERE 1=1';
    const params = [];
    if (model_id) { sql += ' AND fr.model_id = ?'; params.push(model_id); }
    if (from) { sql += ' AND fr.forecast_date >= ?'; params.push(from); }
    if (to) { sql += ' AND fr.forecast_date <= ?'; params.push(to); }
    sql += ' ORDER BY fr.forecast_date ASC LIMIT 200';
    const rows = await query(sql, params);
    res.json({ results: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Demand forecast – next 7 or 30 days ───────────────────
router.get('/demand', adminOnly, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const rows = await query(
      `SELECT fr.forecast_date, SUM(fr.predicted_value) as total_predicted
       FROM forecast_results fr
       JOIN forecast_models fm ON fr.model_id = fm.id
       WHERE fm.target_metric = 'revenue' AND fr.forecast_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
       GROUP BY fr.forecast_date ORDER BY fr.forecast_date`,
      [parseInt(days)]
    );
    // fallback synthetic if no trained data
    if (!rows.length) {
      const synthetic = [];
      for (let i = 1; i <= parseInt(days); i++) {
        const d = new Date(); d.setDate(d.getDate() + i);
        synthetic.push({ forecast_date: d.toISOString().split('T')[0], total_predicted: (Math.random() * 3000 + 4000).toFixed(2) });
      }
      return res.json({ demand: synthetic, source: 'synthetic' });
    }
    res.json({ demand: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Inventory optimization suggestions ────────────────────
router.get('/inventory', adminOnly, async (req, res) => {
  try {
    const rows = await query(
      `SELECT i.name, i.current_stock, i.reorder_level, i.unit,
              (SELECT AVG(ii.quantity) FROM inventory_items ii WHERE ii.id = i.id) as avg_daily_usage
       FROM inventory_items i WHERE i.current_stock <= i.reorder_level * 1.5 ORDER BY (i.current_stock / NULLIF(i.reorder_level,0)) ASC LIMIT 20`
    );
    res.json({ suggestions: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Staffing forecast ─────────────────────────────────────
router.get('/staffing', adminOnly, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const rows = await query(
      `SELECT DAYOFWEEK(o.created_at) as dow, HOUR(o.created_at) as hour, COUNT(*) as avg_orders
       FROM orders o WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND o.status != 'cancelled'
       GROUP BY dow, hour ORDER BY dow, hour`
    );
    res.json({ staffing_forecast: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

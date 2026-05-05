const express = require('express');
const { findOne, findMany, insert, update, query } = require('../config/database');
const { requireRole } = require('../middleware/auth');
const { logManualAudit } = require('../middleware/audit');
const router = express.Router();
const adminOnly = requireRole(['admin']);

// ── Supplier quotes ───────────────────────────────────────
router.get('/quotes', adminOnly, async (req, res) => {
  try {
    const { ingredient } = req.query;
    let sql = 'SELECT * FROM supplier_quotes WHERE 1=1';
    const params = [];
    if (ingredient) { sql += ' AND ingredient_name LIKE ?'; params.push(`%${ingredient}%`); }
    sql += ' ORDER BY ingredient_name, quoted_price ASC';
    const rows = await query(sql, params);
    res.json({ quotes: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/quotes', adminOnly, async (req, res) => {
  try {
    const { supplier_name, ingredient_name, unit, quoted_price, moq, lead_days, valid_until } = req.body;
    if (!supplier_name || !ingredient_name || !unit || !quoted_price)
      return res.status(400).json({ error: 'supplier_name, ingredient_name, unit, quoted_price required' });
    const record = await insert('supplier_quotes', { supplier_name, ingredient_name, unit, quoted_price, moq: moq || 1, lead_days: lead_days || 1, valid_until });
    await logManualAudit(req.user.id, 'create', 'supplier_quotes', record.id, null, record, req.ip, req.headers['user-agent']);
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/quotes/:id/select', adminOnly, async (req, res) => {
  try {
    const quote = await findOne('supplier_quotes', { id: req.params.id });
    if (!quote) return res.status(404).json({ error: 'Quote not found' });
    // Deselect others for same ingredient
    await query('UPDATE supplier_quotes SET is_selected = 0 WHERE ingredient_name = ?', [quote.ingredient_name]);
    await update('supplier_quotes', { is_selected: 1 }, { id: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Price history ─────────────────────────────────────────
router.get('/price-history', adminOnly, async (req, res) => {
  try {
    const { ingredient, supplier, from, to } = req.query;
    let sql = 'SELECT * FROM purchase_price_history WHERE 1=1';
    const params = [];
    if (ingredient) { sql += ' AND ingredient_name LIKE ?'; params.push(`%${ingredient}%`); }
    if (supplier) { sql += ' AND supplier_name LIKE ?'; params.push(`%${supplier}%`); }
    if (from) { sql += ' AND recorded_date >= ?'; params.push(from); }
    if (to) { sql += ' AND recorded_date <= ?'; params.push(to); }
    sql += ' ORDER BY recorded_date DESC LIMIT 500';
    const rows = await query(sql, params);
    res.json({ history: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/price-history', adminOnly, async (req, res) => {
  try {
    const { supplier_name, ingredient_name, unit, price, recorded_date, po_reference } = req.body;
    if (!supplier_name || !ingredient_name || !price)
      return res.status(400).json({ error: 'supplier_name, ingredient_name, price required' });
    const record = await insert('purchase_price_history', {
      supplier_name, ingredient_name, unit: unit || 'unit', price,
      recorded_date: recorded_date || new Date().toISOString().split('T')[0], po_reference
    });
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Procurement rules ─────────────────────────────────────
router.get('/rules', adminOnly, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM procurement_rules WHERE is_active = 1 ORDER BY ingredient_name');
    res.json({ rules: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/rules', adminOnly, async (req, res) => {
  try {
    const { ingredient_name, reorder_point, reorder_qty, preferred_supplier, auto_po } = req.body;
    if (!ingredient_name || !reorder_point || !reorder_qty)
      return res.status(400).json({ error: 'ingredient_name, reorder_point, reorder_qty required' });
    const record = await insert('procurement_rules', { ingredient_name, reorder_point, reorder_qty, preferred_supplier, auto_po: auto_po ? 1 : 0 });
    await logManualAudit(req.user.id, 'create', 'procurement_rules', record.id, null, record, req.ip, req.headers['user-agent']);
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/rules/:id', adminOnly, async (req, res) => {
  try {
    const old = await findOne('procurement_rules', { id: req.params.id });
    if (!old) return res.status(404).json({ error: 'Rule not found' });
    const { reorder_point, reorder_qty, preferred_supplier, auto_po, is_active } = req.body;
    await update('procurement_rules', { reorder_point, reorder_qty, preferred_supplier, auto_po, is_active }, { id: req.params.id });
    await logManualAudit(req.user.id, 'update', 'procurement_rules', req.params.id, old, req.body, req.ip, req.headers['user-agent']);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Auto-PO trigger ───────────────────────────────────────
router.post('/auto-po/trigger', adminOnly, async (req, res) => {
  try {
    const rules = await query('SELECT * FROM procurement_rules WHERE auto_po = 1 AND is_active = 1');
    const triggered = [];
    // In a real system this would check food_inventory levels and generate POs
    for (const rule of rules) {
      triggered.push({ ingredient: rule.ingredient_name, reorder_qty: rule.reorder_qty, supplier: rule.preferred_supplier });
    }
    res.json({ triggered_count: triggered.length, items: triggered });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

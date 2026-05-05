const express = require('express');
const { findOne, insert, update, query } = require('../config/database');
const { requireRole } = require('../middleware/auth');
const { logManualAudit } = require('../middleware/audit');
const router = express.Router();
const adminOnly = requireRole(['admin']);

const genDocRef = () => {
  const now = new Date();
  const ym = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0');
  return 'TXD-' + ym + '-' + Date.now().toString(36).toUpperCase().slice(-4);
};

// ── Tax documents (invoices / credit notes) ───────────────
router.get('/documents', adminOnly, async (req, res) => {
  try {
    const { doc_type, status, from, to, page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let sql = 'SELECT * FROM tax_documents WHERE 1=1';
    const params = [];
    if (doc_type) { sql += ' AND doc_type = ?'; params.push(doc_type); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (from) { sql += ' AND doc_date >= ?'; params.push(from); }
    if (to) { sql += ' AND doc_date <= ?'; params.push(to); }
    sql += ' ORDER BY doc_date DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    const rows = await query(sql, params);
    res.json({ documents: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/documents/:id', adminOnly, async (req, res) => {
  try {
    const doc = await findOne('tax_documents', { id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json({ document: doc });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/documents', adminOnly, async (req, res) => {
  try {
    const { doc_type, doc_date, party_name, party_tax_number, net_amount, tax_rate, tax_amount, gross_amount, order_id } = req.body;
    if (!doc_type || !net_amount) return res.status(400).json({ error: 'doc_type and net_amount required' });
    const record = await insert('tax_documents', {
      reference_number: genDocRef(), doc_type: doc_type || 'invoice', doc_date: doc_date || new Date().toISOString().split('T')[0],
      party_name, party_tax_number, net_amount, tax_rate: tax_rate || 5, tax_amount: tax_amount || parseFloat(net_amount) * 0.05, gross_amount: gross_amount || parseFloat(net_amount) * 1.05,
      order_id, created_by: req.user.id
    });
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/documents/:id', adminOnly, async (req, res) => {
  try {
    const { status, filing_reference } = req.body;
    await update('tax_documents', { status, filing_reference }, { id: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── VAT reports ───────────────────────────────────────────
router.get('/reports', adminOnly, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM tax_reports ORDER BY period_end DESC LIMIT 24');
    res.json({ reports: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/reports/generate', adminOnly, async (req, res) => {
  try {
    const { period_start, period_end, tax_type } = req.body;
    if (!period_start || !period_end) return res.status(400).json({ error: 'period_start and period_end required' });
    const [rev] = await query('SELECT SUM(total_amount) as total, SUM(tax_amount) as tax_collected FROM orders WHERE created_at BETWEEN ? AND ? AND status NOT IN ("cancelled")', [period_start, period_end + ' 23:59:59']);
    const [docs] = await query('SELECT SUM(tax_amount) as input_vat FROM tax_documents WHERE doc_type="purchase" AND doc_date BETWEEN ? AND ?', [period_start, period_end]);
    const output_vat = parseFloat(rev.tax_collected || 0);
    const input_vat = parseFloat(docs.input_vat || 0);
    const net_payable = output_vat - input_vat;
    const record = await insert('tax_reports', {
      report_type: tax_type || 'VAT', period_start, period_end,
      total_revenue: rev.total || 0, taxable_revenue: rev.total || 0, output_vat, input_vat, net_tax_payable: net_payable,
      generated_by: req.user.id
    });
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

const express = require('express');
const { findOne, insert, update, query } = require('../config/database');
const { requireRole } = require('../middleware/auth');
const router = express.Router();
const adminOnly = requireRole(['admin']);

// ── Categories ────────────────────────────────────────────
router.get('/categories', adminOnly, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM document_categories ORDER BY name');
    res.json({ categories: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/categories', adminOnly, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const record = await insert('document_categories', { name, description });
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Documents ─────────────────────────────────────────────
router.get('/', adminOnly, async (req, res) => {
  try {
    const { category_id, status, search, expiring_soon, page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let sql = 'SELECT d.*, dc.name as category_name FROM documents d LEFT JOIN document_categories dc ON d.category_id = dc.id WHERE d.status != "archived"';
    const params = [];
    if (category_id) { sql += ' AND d.category_id = ?'; params.push(category_id); }
    if (status) { sql += ' AND d.status = ?'; params.push(status); }
    if (search) { sql += ' AND (d.title LIKE ? OR d.tags LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (expiring_soon === 'true') { sql += ' AND d.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)'; }
    sql += ' ORDER BY d.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    const rows = await query(sql, params);
    res.json({ documents: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/expiring', adminOnly, async (req, res) => {
  try {
    const rows = await query(`SELECT d.*, dc.name as category_name FROM documents d LEFT JOIN document_categories dc ON d.category_id = dc.id WHERE d.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND d.status != 'archived' ORDER BY d.expiry_date ASC`);
    res.json({ documents: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', adminOnly, async (req, res) => {
  try {
    const doc = await findOne('documents', { id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json({ document: doc });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', adminOnly, async (req, res) => {
  try {
    const { title, category_id, file_path, file_type, file_size, expiry_date, tags, is_confidential } = req.body;
    if (!title || !file_path) return res.status(400).json({ error: 'title and file_path required' });
    const record = await insert('documents', {
      title, category_id, file_path, file_type, file_size, expiry_date, tags,
      is_confidential: is_confidential ? 1 : 0, version: 1, uploaded_by: req.user.id
    });
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', adminOnly, async (req, res) => {
  try {
    const doc = await findOne('documents', { id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    const allowed = ['title', 'category_id', 'file_path', 'expiry_date', 'tags', 'status'];
    const updates = { version: (doc.version || 1) + 1 };
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    await update('documents', updates, { id: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await update('documents', { status: 'archived' }, { id: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

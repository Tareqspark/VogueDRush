const express = require('express');
const { findOne, insert, update, query } = require('../config/database');
const { requireRole } = require('../middleware/auth');
const router = express.Router();
const authRole = requireRole(['admin', 'staff', 'kitchen', 'delivery']);

// ── Unread count ──────────────────────────────────────────
router.get('/unread-count', authRole, async (req, res) => {
  try {
    const [{ cnt }] = await query(
      "SELECT COUNT(*) as cnt FROM messages m JOIN message_threads mt ON m.thread_id = mt.id WHERE (mt.created_by = ? OR mt.participant_ids LIKE ?) AND m.sender_id != ? AND m.is_read = 0",
      [req.user.id, `%${req.user.id}%`, req.user.id]
    );
    res.json({ unread: cnt });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Threads ───────────────────────────────────────────────
router.get('/threads', authRole, async (req, res) => {
  try {
    const rows = await query(
      `SELECT mt.*, u.full_name as creator_name,
       (SELECT COUNT(*) FROM messages m WHERE m.thread_id = mt.id AND m.sender_id != ? AND m.is_read = 0) as unread_count,
       (SELECT m2.body FROM messages m2 WHERE m2.thread_id = mt.id ORDER BY m2.created_at DESC LIMIT 1) as last_message
       FROM message_threads mt JOIN users u ON mt.created_by = u.id
       WHERE mt.created_by = ? OR mt.participant_ids LIKE ?
       ORDER BY mt.updated_at DESC LIMIT 50`,
      [req.user.id, req.user.id, `%${req.user.id}%`]
    );
    res.json({ threads: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/threads', authRole, async (req, res) => {
  try {
    const { subject, participant_ids, thread_type } = req.body;
    if (!subject) return res.status(400).json({ error: 'subject required' });
    const allParticipants = Array.from(new Set([...(participant_ids || []), req.user.id]));
    const record = await insert('message_threads', {
      subject, thread_type: thread_type || 'direct', created_by: req.user.id, participant_ids: JSON.stringify(allParticipants)
    });
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Messages ──────────────────────────────────────────────
router.get('/threads/:id/messages', authRole, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const rows = await query(
      'SELECT m.*, u.full_name as sender_name, u.role as sender_role FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.thread_id = ? ORDER BY m.created_at ASC LIMIT ? OFFSET ?',
      [req.params.id, parseInt(limit), offset]
    );
    res.json({ messages: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/threads/:id/messages', authRole, async (req, res) => {
  try {
    const { body, attachment_url, message_type } = req.body;
    if (!body && !attachment_url) return res.status(400).json({ error: 'body or attachment_url required' });
    const record = await insert('messages', {
      thread_id: req.params.id, sender_id: req.user.id, body, attachment_url, message_type: message_type || 'text'
    });
    await update('message_threads', { updated_at: new Date() }, { id: req.params.id });
    // Emit socket event
    if (req.app.get('io')) {
      req.app.get('io').to(`thread-${req.params.id}`).emit('new-message', { ...record, sender_name: req.user.full_name });
    }
    res.status(201).json(record);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/messages/:id/read', authRole, async (req, res) => {
  try {
    await update('messages', { is_read: 1, read_at: new Date() }, { id: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

const express = require('express');
const { findOne, insert, update, query } = require('../config/database');
const { requireRole } = require('../middleware/auth');
const router = express.Router();
const adminOnly = requireRole(['admin']);
const staffRole = requireRole(['admin', 'staff']);
const crypto = require('crypto');

const genCode = () => 'GC-' + crypto.randomBytes(4).toString('hex').toUpperCase();

// ── List cards ────────────────────────────────────────────
router.get('/', adminOnly, async (req, res) => {
  try {
    const { status, page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let sql = 'SELECT * FROM gift_cards WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    sql += ' ORDER BY issued_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    const rows = await query(sql, params);
    res.json({ cards: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Issue new card ────────────────────────────────────────
router.post('/', staffRole, async (req, res) => {
  try {
    const { initial_balance, issued_to_name, issued_to_phone, expiry_date, notes } = req.body;
    if (!initial_balance) return res.status(400).json({ error: 'initial_balance required' });
    const card_code = genCode();
    const record = await insert('gift_cards', {
      card_code, initial_balance, current_balance: initial_balance,
      issued_to_name, issued_to_phone, expiry_date, notes, issued_by: req.user.id
    });
    res.status(201).json({ ...record, card_code });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Balance check ─────────────────────────────────────────
router.get('/:code/balance', staffRole, async (req, res) => {
  try {
    const card = await findOne('gift_cards', { card_code: req.params.code.toUpperCase() });
    if (!card) return res.status(404).json({ error: 'Card not found' });
    if (card.status === 'expired') return res.status(400).json({ error: 'Card is expired', balance: 0 });
    res.json({ card_code: card.card_code, balance: card.current_balance, status: card.status, expiry_date: card.expiry_date });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Redeem ────────────────────────────────────────────────
router.post('/:code/redeem', staffRole, async (req, res) => {
  try {
    const { amount, order_id, notes } = req.body;
    if (!amount) return res.status(400).json({ error: 'amount required' });
    const card = await findOne('gift_cards', { card_code: req.params.code.toUpperCase() });
    if (!card) return res.status(404).json({ error: 'Card not found' });
    if (card.status !== 'active') return res.status(400).json({ error: `Card is ${card.status}` });
    if (parseFloat(card.current_balance) < parseFloat(amount)) return res.status(400).json({ error: 'Insufficient balance', available: card.current_balance });
    const new_balance = (parseFloat(card.current_balance) - parseFloat(amount)).toFixed(2);
    await update('gift_cards', { current_balance: new_balance, status: parseFloat(new_balance) === 0 ? 'exhausted' : 'active' }, { card_code: card.card_code });
    await insert('gift_card_transactions', { gift_card_id: card.id, transaction_type: 'redeem', amount, balance_after: new_balance, order_id, processed_by: req.user.id, notes });
    res.json({ success: true, balance_after: new_balance });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Top-up ────────────────────────────────────────────────
router.post('/:code/topup', staffRole, async (req, res) => {
  try {
    const { amount, notes } = req.body;
    if (!amount) return res.status(400).json({ error: 'amount required' });
    const card = await findOne('gift_cards', { card_code: req.params.code.toUpperCase() });
    if (!card) return res.status(404).json({ error: 'Card not found' });
    const new_balance = (parseFloat(card.current_balance) + parseFloat(amount)).toFixed(2);
    await update('gift_cards', { current_balance: new_balance, status: 'active' }, { card_code: card.card_code });
    await insert('gift_card_transactions', { gift_card_id: card.id, transaction_type: 'topup', amount, balance_after: new_balance, processed_by: req.user.id, notes });
    res.json({ success: true, balance_after: new_balance });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Transactions ──────────────────────────────────────────
router.get('/:id/transactions', staffRole, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM gift_card_transactions WHERE gift_card_id = ? ORDER BY created_at DESC', [req.params.id]);
    res.json({ transactions: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

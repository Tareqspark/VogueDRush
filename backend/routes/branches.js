const express = require('express');
const router = express.Router();
const { query, findMany, findOne, insert, update } = require('../config/database');
const { requireRole, authenticateToken } = require('../middleware/auth');

// GET all branches
router.get('/', async (req, res) => {
  try {
    const branches = await query(
      'SELECT * FROM branches ORDER BY id',
      []
    );
    res.json({ branches });
  } catch (error) {
    console.error('Get branches error:', error);
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
});

// GET single branch
router.get('/:id', async (req, res) => {
  try {
    const branch = await findOne('branches', { id: req.params.id });
    if (!branch) return res.status(404).json({ error: 'Branch not found' });
    res.json({ branch });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch branch' });
  }
});

// POST create branch (admin only)
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { name, code, address, phone } = req.body;
    if (!name || !code) return res.status(400).json({ error: 'name and code are required' });

    const existing = await findOne('branches', { code: code.toUpperCase() });
    if (existing) return res.status(400).json({ error: 'Branch code already exists' });

    const branch = await insert('branches', {
      name,
      code: code.toUpperCase(),
      address: address || null,
      phone: phone || null,
      is_active: true,
    });
    res.status(201).json({ message: 'Branch created', branch });
  } catch (error) {
    console.error('Create branch error:', error);
    res.status(500).json({ error: 'Failed to create branch' });
  }
});

// PUT update branch (admin only)
router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { name, address, phone, is_active } = req.body;
    const branch = await findOne('branches', { id: req.params.id });
    if (!branch) return res.status(404).json({ error: 'Branch not found' });

    await update('branches', {
      ...(name       !== undefined && { name }),
      ...(address    !== undefined && { address }),
      ...(phone      !== undefined && { phone }),
      ...(is_active  !== undefined && { is_active }),
      updated_at: new Date(),
    }, { id: req.params.id });

    const updated = await findOne('branches', { id: req.params.id });
    res.json({ message: 'Branch updated', branch: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update branch' });
  }
});

module.exports = router;

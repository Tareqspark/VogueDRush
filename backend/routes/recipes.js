const express = require('express');
const { query, insert, update, findOne } = require('../config/database');
const { requireRole, scopeBranch } = require('../middleware/auth');
const router = express.Router();

router.use(scopeBranch);
const managerOrAdmin = requireRole(['admin', 'manager']);

// ── GET /  all food items with recipe status ──────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    if (!branchId) return res.status(400).json({ error: 'Branch required' });

    const rows = await query(`
      SELECT fi.id, fi.name, fi.price, fc.name AS category_name,
             COUNT(r.id) AS ingredient_count,
             COALESCE(SUM(r.qty_per_portion * i.cost_price), 0) AS recipe_cost
      FROM food_items fi
      LEFT JOIN food_categories fc ON fc.id = fi.category_id
      LEFT JOIN recipes r ON r.food_item_id = fi.id AND r.branch_id = ?
      LEFT JOIN ingredients i ON i.id = r.ingredient_id AND i.branch_id = ?
      WHERE fi.branch_id = ? AND fi.is_available = 1
      GROUP BY fi.id
      ORDER BY fc.name ASC, fi.name ASC`, [branchId, branchId, branchId]);

    res.json({ items: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /:foodItemId  get recipe lines for one food item ──────────────────────
router.get('/:foodItemId', async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    if (!branchId) return res.status(400).json({ error: 'Branch required' });

    const foodItem = await findOne('food_items', { id: req.params.foodItemId, branch_id: branchId });
    if (!foodItem) return res.status(404).json({ error: 'Food item not found' });

    const lines = await query(`
      SELECT r.id, r.ingredient_id, r.qty_per_portion,
             i.name AS ingredient_name, i.unit, i.cost_price,
             (r.qty_per_portion * i.cost_price) AS line_cost
      FROM recipes r
      JOIN ingredients i ON i.id = r.ingredient_id
      WHERE r.branch_id = ? AND r.food_item_id = ?
      ORDER BY i.name ASC`, [branchId, foodItem.id]);

    const totalCost = lines.reduce((s, l) => s + parseFloat(l.line_cost || 0), 0);
    res.json({ food_item: foodItem, lines, total_cost: totalCost });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PUT /:foodItemId  full recipe replace (upsert all lines at once) ──────────
// Body: { lines: [{ ingredient_id, qty_per_portion }] }
router.put('/:foodItemId', managerOrAdmin, async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    if (!branchId) return res.status(400).json({ error: 'Branch required' });

    const foodItem = await findOne('food_items', { id: req.params.foodItemId, branch_id: branchId });
    if (!foodItem) return res.status(404).json({ error: 'Food item not found' });

    const lines = Array.isArray(req.body.lines) ? req.body.lines : [];

    // Delete all existing recipe lines for this food item in this branch
    await query('DELETE FROM recipes WHERE branch_id = ? AND food_item_id = ?', [branchId, foodItem.id]);

    // Insert new lines
    for (const line of lines) {
      if (!line.ingredient_id || parseFloat(line.qty_per_portion) <= 0) continue;
      await insert('recipes', {
        branch_id: branchId,
        food_item_id: foodItem.id,
        ingredient_id: parseInt(line.ingredient_id),
        qty_per_portion: parseFloat(line.qty_per_portion),
      });
    }

    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE /:foodItemId  clear entire recipe ──────────────────────────────────
router.delete('/:foodItemId', managerOrAdmin, async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    if (!branchId) return res.status(400).json({ error: 'Branch required' });

    const foodItem = await findOne('food_items', { id: req.params.foodItemId, branch_id: branchId });
    if (!foodItem) return res.status(404).json({ error: 'Food item not found' });

    await query('DELETE FROM recipes WHERE branch_id = ? AND food_item_id = ?', [branchId, foodItem.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /cost/summary  all food items with their computed recipe cost ──────────
router.get('/cost/summary', async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    if (!branchId) return res.status(400).json({ error: 'Branch required' });

    const rows = await query(`
      SELECT fi.id, fi.name, fi.price,
             COALESCE(SUM(r.qty_per_portion * i.cost_price), 0) AS recipe_cost,
             COUNT(r.id) AS ingredient_count,
             CASE
               WHEN fi.price > 0 AND SUM(r.qty_per_portion * i.cost_price) > 0
               THEN ROUND(SUM(r.qty_per_portion * i.cost_price) / fi.price * 100, 1)
               ELSE NULL
             END AS food_cost_pct
      FROM food_items fi
      LEFT JOIN recipes r ON r.food_item_id = fi.id AND r.branch_id = ?
      LEFT JOIN ingredients i ON i.id = r.ingredient_id AND i.branch_id = ?
      WHERE fi.branch_id = ? AND fi.is_available = 1
      GROUP BY fi.id
      ORDER BY food_cost_pct DESC`, [branchId, branchId, branchId]);

    res.json({ items: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

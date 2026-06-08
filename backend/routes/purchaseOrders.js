const express = require('express');
const { query, insert, update, findOne } = require('../config/database');
const { requireRole, scopeBranch } = require('../middleware/auth');
const router = express.Router();

router.use(scopeBranch);
const managerOrAdmin = requireRole(['admin', 'manager']);

// ── number generators ─────────────────────────────────────────────────────────
async function nextPoNumber(branchId) {
  const now = new Date();
  const prefix = `PO-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [row] = await query(
    `SELECT COUNT(*) AS cnt FROM purchase_orders
     WHERE branch_id = ? AND po_number LIKE ?`, [branchId, `${prefix}%`]
  );
  return `${prefix}-${String((row.cnt || 0) + 1).padStart(3, '0')}`;
}

async function nextGrnNumber(branchId) {
  const now = new Date();
  const prefix = `GRN-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [row] = await query(
    `SELECT COUNT(*) AS cnt FROM goods_received_notes
     WHERE branch_id = ? AND grn_number LIKE ?`, [branchId, `${prefix}%`]
  );
  return `${prefix}-${String((row.cnt || 0) + 1).padStart(3, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  PURCHASE ORDERS
// ─────────────────────────────────────────────────────────────────────────────

// GET /  list POs
router.get('/', async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    if (!branchId) return res.status(400).json({ error: 'Branch required' });

    const { status, supplier_id, from, to } = req.query;
    let sql = `
      SELECT po.*, s.name AS supplier_name,
             u.full_name AS created_by_name
      FROM purchase_orders po
      JOIN suppliers s ON s.id = po.supplier_id
      LEFT JOIN users u ON u.id = po.created_by
      WHERE po.branch_id = ?`;
    const params = [branchId];

    if (status)      { sql += ' AND po.status = ?';      params.push(status); }
    if (supplier_id) { sql += ' AND po.supplier_id = ?'; params.push(supplier_id); }
    if (from)        { sql += ' AND po.order_date >= ?'; params.push(from); }
    if (to)          { sql += ' AND po.order_date <= ?'; params.push(to); }
    sql += ' ORDER BY po.created_at DESC LIMIT 200';

    const pos = await query(sql, params);
    res.json({ purchase_orders: pos });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /:id  PO with line items
router.get('/:id', async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    const po = await findOne('purchase_orders', { id: req.params.id, branch_id: branchId });
    if (!po) return res.status(404).json({ error: 'PO not found' });

    const [supplier, items] = await Promise.all([
      findOne('suppliers', { id: po.supplier_id }),
      query(`
        SELECT poi.*, i.name AS ingredient_name, i.unit
        FROM purchase_order_items poi
        JOIN ingredients i ON i.id = poi.ingredient_id
        WHERE poi.po_id = ?`, [po.id])
    ]);

    res.json({ purchase_order: { ...po, supplier, items } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /  create draft PO
router.post('/', managerOrAdmin, async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    if (!branchId) return res.status(400).json({ error: 'Branch required' });

    const { supplier_id, expected_date, notes, items } = req.body;
    if (!supplier_id) return res.status(400).json({ error: 'supplier_id required' });
    if (!items || !items.length) return res.status(400).json({ error: 'At least one item required' });

    const sup = await findOne('suppliers', { id: supplier_id, branch_id: branchId });
    if (!sup) return res.status(404).json({ error: 'Supplier not found' });

    // Validate items
    for (const it of items) {
      if (!it.ingredient_id || !it.qty_ordered || !it.unit_price)
        return res.status(400).json({ error: 'Each item needs ingredient_id, qty_ordered, unit_price' });
    }

    const subtotal = items.reduce((s, it) => s + parseFloat(it.qty_ordered) * parseFloat(it.unit_price), 0);
    const tax_amount = parseFloat(req.body.tax_amount) || 0;

    const po = await insert('purchase_orders', {
      branch_id: branchId,
      po_number: await nextPoNumber(branchId),
      supplier_id,
      status: 'draft',
      order_date: new Date().toISOString().split('T')[0],
      expected_date: expected_date || null,
      subtotal: subtotal.toFixed(2),
      tax_amount: tax_amount.toFixed(2),
      total_amount: (subtotal + tax_amount).toFixed(2),
      notes: notes || null,
      created_by: req.user.id
    });

    for (const it of items) {
      const qty = parseFloat(it.qty_ordered);
      const price = parseFloat(it.unit_price);
      await insert('purchase_order_items', {
        po_id: po.id, ingredient_id: it.ingredient_id,
        qty_ordered: qty, qty_received: 0,
        unit_price: price, total_price: (qty * price).toFixed(2)
      });
    }

    res.status(201).json({ purchase_order: { ...po, items } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /:id  update draft PO
router.put('/:id', managerOrAdmin, async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    const po = await findOne('purchase_orders', { id: req.params.id, branch_id: branchId });
    if (!po) return res.status(404).json({ error: 'PO not found' });
    if (po.status !== 'draft') return res.status(400).json({ error: 'Only draft POs can be edited' });

    const { expected_date, notes, items } = req.body;

    if (items && items.length) {
      await query('DELETE FROM purchase_order_items WHERE po_id = ?', [po.id]);
      const subtotal = items.reduce((s, it) => s + parseFloat(it.qty_ordered) * parseFloat(it.unit_price), 0);
      const tax_amount = parseFloat(req.body.tax_amount) || 0;
      for (const it of items) {
        const qty = parseFloat(it.qty_ordered);
        const price = parseFloat(it.unit_price);
        await insert('purchase_order_items', {
          po_id: po.id, ingredient_id: it.ingredient_id,
          qty_ordered: qty, qty_received: 0,
          unit_price: price, total_price: (qty * price).toFixed(2)
        });
      }
      await update('purchase_orders', {
        expected_date: expected_date || po.expected_date,
        notes: notes !== undefined ? notes : po.notes,
        subtotal: subtotal.toFixed(2),
        tax_amount: tax_amount.toFixed(2),
        total_amount: (subtotal + tax_amount).toFixed(2)
      }, { id: po.id });
    } else {
      await update('purchase_orders', {
        expected_date: expected_date || po.expected_date,
        notes: notes !== undefined ? notes : po.notes
      }, { id: po.id });
    }

    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /:id/confirm  draft → confirmed
router.put('/:id/confirm', managerOrAdmin, async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    const po = await findOne('purchase_orders', { id: req.params.id, branch_id: branchId });
    if (!po) return res.status(404).json({ error: 'PO not found' });
    if (po.status !== 'draft') return res.status(400).json({ error: 'PO is not in draft' });
    await update('purchase_orders', { status: 'confirmed' }, { id: po.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /:id/cancel
router.put('/:id/cancel', managerOrAdmin, async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    const po = await findOne('purchase_orders', { id: req.params.id, branch_id: branchId });
    if (!po) return res.status(404).json({ error: 'PO not found' });
    if (['received', 'cancelled'].includes(po.status))
      return res.status(400).json({ error: 'Cannot cancel a received or already-cancelled PO' });
    await update('purchase_orders', { status: 'cancelled' }, { id: po.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
//  GOODS RECEIVED NOTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /grn  list GRNs
router.get('/grn/list', async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    if (!branchId) return res.status(400).json({ error: 'Branch required' });

    const { supplier_id, from, to } = req.query;
    let sql = `
      SELECT g.*, s.name AS supplier_name, u.full_name AS created_by_name
      FROM goods_received_notes g
      JOIN suppliers s ON s.id = g.supplier_id
      LEFT JOIN users u ON u.id = g.created_by
      WHERE g.branch_id = ?`;
    const params = [branchId];
    if (supplier_id) { sql += ' AND g.supplier_id = ?'; params.push(supplier_id); }
    if (from) { sql += ' AND g.received_date >= ?'; params.push(from); }
    if (to)   { sql += ' AND g.received_date <= ?'; params.push(to); }
    sql += ' ORDER BY g.created_at DESC LIMIT 200';

    const grns = await query(sql, params);
    res.json({ grns });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /grn/:id  GRN detail
router.get('/grn/:id', async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    const grn = await findOne('goods_received_notes', { id: req.params.id, branch_id: branchId });
    if (!grn) return res.status(404).json({ error: 'GRN not found' });

    const [supplier, items] = await Promise.all([
      findOne('suppliers', { id: grn.supplier_id }),
      query(`
        SELECT gi.*, i.name AS ingredient_name, i.unit
        FROM grn_items gi
        JOIN ingredients i ON i.id = gi.ingredient_id
        WHERE gi.grn_id = ?`, [grn.id])
    ]);

    res.json({ grn: { ...grn, supplier, items } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /:po_id/receive  create GRN from PO + update stock
router.post('/:po_id/receive', managerOrAdmin, async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    if (!branchId) return res.status(400).json({ error: 'Branch required' });

    const po = await findOne('purchase_orders', { id: req.params.po_id, branch_id: branchId });
    if (!po) return res.status(404).json({ error: 'PO not found' });
    if (!['confirmed', 'partial'].includes(po.status))
      return res.status(400).json({ error: 'PO must be confirmed or partial to receive goods' });

    const { items, notes, received_date } = req.body;
    if (!items || !items.length) return res.status(400).json({ error: 'items required' });

    const date = received_date || new Date().toISOString().split('T')[0];
    let totalAmount = 0;

    // Create GRN header
    const grn = await insert('goods_received_notes', {
      branch_id: branchId, grn_number: await nextGrnNumber(branchId),
      po_id: po.id, supplier_id: po.supplier_id,
      received_date: date, notes: notes || null,
      total_amount: 0, created_by: req.user.id
    });

    // Process each received line
    for (const it of items) {
      const qty = parseFloat(it.qty_received);
      if (!qty || qty <= 0) continue;

      const unitCost = parseFloat(it.unit_cost);
      const lineCost = qty * unitCost;
      totalAmount += lineCost;

      // GRN line
      await insert('grn_items', {
        grn_id: grn.id, ingredient_id: it.ingredient_id,
        qty_received: qty, unit_cost: unitCost,
        total_cost: lineCost.toFixed(2),
        expiry_date: it.expiry_date || null
      });

      // Update ingredient stock
      const ing = await findOne('ingredients', { id: it.ingredient_id, branch_id: branchId });
      if (ing) {
        const newBalance = parseFloat(ing.current_stock) + qty;
        await update('ingredients', { current_stock: newBalance, cost_price: unitCost }, { id: ing.id });
        await insert('stock_ledger', {
          branch_id: branchId, ingredient_id: ing.id,
          movement_type: 'purchase', qty, balance_after: newBalance,
          unit_cost: unitCost, reference_type: 'grn', reference_id: grn.id,
          notes: `GRN ${grn.grn_number}`, created_by: req.user.id
        });
      }

      // Update PO line qty_received
      await query(
        `UPDATE purchase_order_items
         SET qty_received = qty_received + ?
         WHERE po_id = ? AND ingredient_id = ?`,
        [qty, po.id, it.ingredient_id]
      );
    }

    // Update GRN total
    await update('goods_received_notes', { total_amount: totalAmount.toFixed(2) }, { id: grn.id });

    // Update PO status: partial or received
    const poItems = await query(
      'SELECT qty_ordered, qty_received FROM purchase_order_items WHERE po_id = ?', [po.id]
    );
    const allReceived = poItems.every(r => parseFloat(r.qty_received) >= parseFloat(r.qty_ordered));
    await update('purchase_orders', { status: allReceived ? 'received' : 'partial' }, { id: po.id });

    // Update supplier balance + ledger
    const sup = await findOne('suppliers', { id: po.supplier_id, branch_id: branchId });
    if (sup) {
      const newBalance = parseFloat(sup.balance) + totalAmount;
      await update('suppliers', { balance: newBalance }, { id: sup.id });
      await insert('supplier_ledger', {
        branch_id: branchId, supplier_id: sup.id,
        transaction_type: 'invoice',
        reference_type: 'grn', reference_id: grn.id,
        amount: totalAmount.toFixed(2), running_balance: newBalance.toFixed(2),
        notes: `GRN ${grn.grn_number} against ${po.po_number}`,
        transaction_date: date, created_by: req.user.id
      });
    }

    res.status(201).json({ grn_number: grn.grn_number, total_amount: totalAmount, po_status: allReceived ? 'received' : 'partial' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /grn/standalone  GRN without PO (direct purchase)
router.post('/grn/standalone', managerOrAdmin, async (req, res) => {
  try {
    const branchId = req.scopedBranchId;
    if (!branchId) return res.status(400).json({ error: 'Branch required' });

    const { supplier_id, items, notes, received_date } = req.body;
    if (!supplier_id) return res.status(400).json({ error: 'supplier_id required' });
    if (!items || !items.length) return res.status(400).json({ error: 'items required' });

    const sup = await findOne('suppliers', { id: supplier_id, branch_id: branchId });
    if (!sup) return res.status(404).json({ error: 'Supplier not found' });

    const date = received_date || new Date().toISOString().split('T')[0];
    let totalAmount = 0;

    const grn = await insert('goods_received_notes', {
      branch_id: branchId, grn_number: await nextGrnNumber(branchId),
      po_id: null, supplier_id,
      received_date: date, notes: notes || null,
      total_amount: 0, created_by: req.user.id
    });

    for (const it of items) {
      const qty = parseFloat(it.qty_received);
      if (!qty || qty <= 0) continue;

      const unitCost = parseFloat(it.unit_cost);
      const lineCost = qty * unitCost;
      totalAmount += lineCost;

      await insert('grn_items', {
        grn_id: grn.id, ingredient_id: it.ingredient_id,
        qty_received: qty, unit_cost: unitCost,
        total_cost: lineCost.toFixed(2),
        expiry_date: it.expiry_date || null
      });

      const ing = await findOne('ingredients', { id: it.ingredient_id, branch_id: branchId });
      if (ing) {
        const newBalance = parseFloat(ing.current_stock) + qty;
        await update('ingredients', { current_stock: newBalance, cost_price: unitCost }, { id: ing.id });
        await insert('stock_ledger', {
          branch_id: branchId, ingredient_id: ing.id,
          movement_type: 'purchase', qty, balance_after: newBalance,
          unit_cost: unitCost, reference_type: 'grn', reference_id: grn.id,
          notes: `Direct GRN ${grn.grn_number}`, created_by: req.user.id
        });
      }
    }

    await update('goods_received_notes', { total_amount: totalAmount.toFixed(2) }, { id: grn.id });

    const newBalance = parseFloat(sup.balance) + totalAmount;
    await update('suppliers', { balance: newBalance }, { id: sup.id });
    await insert('supplier_ledger', {
      branch_id: branchId, supplier_id: sup.id,
      transaction_type: 'invoice',
      reference_type: 'grn', reference_id: grn.id,
      amount: totalAmount.toFixed(2), running_balance: newBalance.toFixed(2),
      notes: `Direct GRN ${grn.grn_number}`,
      transaction_date: date, created_by: req.user.id
    });

    res.status(201).json({ grn_number: grn.grn_number, total_amount: totalAmount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

const express = require('express');
const { findOne, findMany, insert, update, remove, transaction, transactionWithIsolation, query } = require('../config/database');
const { requireRole, scopeBranch } = require('../middleware/auth');
const { rateLimiters } = require('../middleware/rateLimiter');
const { validateOrder, validateId } = require('../middleware/validation');
const { logManualAudit } = require('../middleware/audit');

const router = express.Router();

// Generate unique order number — 4-digit random reduces birthday-paradox collision risk
const generateOrderNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = (Math.floor(Math.random() * 9000) + 1000).toString(); // 1000-9999
  return `ORD${year}${month}${day}${random}`;
};

// Calculate order totals.
// C-2 fix: accept an optional `connection` so this can run inside a SERIALIZABLE transaction
//          using the same connection, avoiding TOCTOU price races.
// M-2 fix: use global `vat_percentage` from system_settings so the Settings page is effective.
const calculateOrderTotals = async (items, orderType, connection = null, branchId = null) => {
  let subtotal = 0;

  const dbQuery = async (sql, params) => {
    if (connection) {
      const [rows] = await connection.query(sql, params);
      return rows;
    }
    return query(sql, params);
  };

  for (const item of items) {
    const rows = await dbQuery(
      'SELECT id, price, promotional_price, is_available FROM food_items WHERE id = ?',
      [item.food_item_id]
    );
    const foodItem = rows[0];
    if (!foodItem || !foodItem.is_available) {
      throw new Error(`Food item ${item.food_item_id} not available`);
    }

    // Branch-specific price takes priority over promotional price
    let unitPrice = foodItem.promotional_price || foodItem.price;
    if (branchId) {
      const branchPriceRows = await dbQuery(
        'SELECT price FROM branch_item_prices WHERE food_item_id = ? AND branch_id = ?',
        [item.food_item_id, branchId]
      );
      if (branchPriceRows.length > 0) unitPrice = branchPriceRows[0].price;
    }

    subtotal += unitPrice * item.quantity;
  }

  // Fetch relevant settings via the same connection
  const settingsRows = await dbQuery(
    "SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('vat_percentage', 'service_charge_percentage', 'delivery_fee')",
    []
  );
  const settingsMap = {};
  settingsRows.forEach(s => { settingsMap[s.setting_key] = s.setting_value; });

  const vatPercentage = parseFloat(settingsMap.vat_percentage || 15);
  const serviceChargePercentage = orderType === 'dine_in' ? parseFloat(settingsMap.service_charge_percentage || 10) : 0;
  const deliveryFee = orderType === 'delivery' ? parseFloat(settingsMap.delivery_fee || 0) : 0;

  const vatAmount = (subtotal * vatPercentage) / 100;
  const serviceCharge = (subtotal * serviceChargePercentage) / 100;
  const totalAmount = subtotal + vatAmount + serviceCharge + deliveryFee;

  return {
    subtotal,
    vat_amount: vatAmount,
    service_charge: serviceCharge,
    delivery_fee: deliveryFee,
    discount_amount: 0,
    total_amount: totalAmount
  };
};

// Get all orders with filtering and pagination
router.get('/', scopeBranch, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      status,
      order_type,
      waiter_id,
      start_date,
      end_date,
      table_id,
      branch_id,
    } = req.query;

    const limitInt = Math.min(parseInt(limit) || 50, 200);
    const offsetInt = (parseInt(page) - 1) * limitInt;
    let whereClause = '1=1';
    let values = [];

    // scopedBranchId wins over query param — staff always locked to their branch
    const effectiveBranch = req.scopedBranchId ?? (branch_id ? parseInt(branch_id) : null);
    if (effectiveBranch) {
      whereClause += ' AND o.branch_id = ?';
      values.push(effectiveBranch);
    }

    if (status) {
      whereClause += ' AND o.status = ?';
      values.push(status);
    }
    
    if (order_type) {
      whereClause += ' AND o.order_type = ?';
      values.push(order_type);
    }
    
    if (waiter_id) {
      whereClause += ' AND o.waiter_id = ?';
      values.push(waiter_id);
    }
    
    if (table_id) {
      whereClause += ' AND o.table_id = ?';
      values.push(table_id);
    }
    
    if (start_date) {
      whereClause += ' AND DATE(o.created_at) >= ?';
      values.push(start_date);
    }
    
    if (end_date) {
      whereClause += ' AND DATE(o.created_at) <= ?';
      values.push(end_date);
    }
    
    // Get orders with joins
    const ordersQuery = `
      SELECT o.*, u.username as waiter_name, u.full_name as waiter_full_name,
             t.table_number, t.location as table_location,
             o.bill_printed, o.bill_printed_at,
             (
               SELECT JSON_UNQUOTE(JSON_EXTRACT(a.new_values, '$.reason'))
               FROM audit_logs a
               WHERE a.table_name = 'orders'
                 AND a.record_id = o.id
                 AND a.action = 'update_status'
                 AND JSON_UNQUOTE(JSON_EXTRACT(a.new_values, '$.status')) = 'cancelled'
               ORDER BY a.created_at DESC
               LIMIT 1
             ) AS cancellation_reason
      FROM orders o
      LEFT JOIN users u ON o.waiter_id = u.id
      LEFT JOIN tables t ON o.table_id = t.id
      WHERE ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const orders = await query(ordersQuery, [...values, limitInt, offsetInt]);
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM orders o WHERE ${whereClause}`;
    const countResult = await query(countQuery, values);
    const total = countResult[0].total;
    
    res.json({
      orders,
      pagination: {
        page: parseInt(page),
        limit: limitInt,
        total,
        pages: Math.ceil(total / limitInt) // M-3 fix: use parsed limitInt, not raw query string
      }
    });
    
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ── Static sub-resource routes MUST come before /:id to avoid param capture ──

// Get order statistics with yesterday comparison for trend indicators (M-12)
router.get('/stats/overview', scopeBranch, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const branchId = req.scopedBranchId;

    const branchFilter = branchId ? `AND branch_id = ${branchId}` : '';

    let dateFilter = `WHERE 1=1 ${branchFilter}`;
    let values = [];

    if (start_date && end_date) {
      dateFilter = `WHERE DATE(created_at) BETWEEN ? AND ? ${branchFilter}`;
      values = [start_date, end_date];
    }

    const statusStats = await query(`
      SELECT status, COUNT(*) as count, SUM(total_amount) as total_revenue
      FROM orders ${dateFilter} GROUP BY status
    `, values);

    const typeStats = await query(`
      SELECT order_type, COUNT(*) as count, SUM(total_amount) as total_revenue
      FROM orders ${dateFilter} GROUP BY order_type
    `, values);

    const todayStats = await query(
      `SELECT COUNT(*) as today_orders, COALESCE(SUM(total_amount), 0) as today_revenue
       FROM orders WHERE DATE(created_at) = CURDATE() ${branchFilter}`
    );

    const yesterdayStats = await query(
      `SELECT COUNT(*) as yesterday_orders, COALESCE(SUM(total_amount), 0) as yesterday_revenue
       FROM orders WHERE DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) ${branchFilter}`
    );

    res.json({ statusStats, typeStats, todayStats: todayStats[0], yesterdayStats: yesterdayStats[0] });
  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({ error: 'Failed to fetch order statistics' });
  }
});

// Receipt history (admin management view)
router.get('/receipts/history', requireRole(['admin']), scopeBranch, async (req, res) => {
  try {
    const { page = 1, limit = 100, start_date, end_date } = req.query;
    const limitInt = parseInt(limit) || 100;
    const offsetInt = (parseInt(page) - 1) * limitInt;
    let whereClause = 'o.bill_printed = 1';
    const values = [];

    if (req.scopedBranchId) { whereClause += ' AND o.branch_id = ?'; values.push(req.scopedBranchId); }
    if (start_date) { whereClause += ' AND DATE(o.bill_printed_at) >= ?'; values.push(start_date); }
    if (end_date)   { whereClause += ' AND DATE(o.bill_printed_at) <= ?'; values.push(end_date); }

    const rows = await query(
      `SELECT o.id, o.order_number, o.order_type, o.status, o.customer_name, o.customer_phone,
              o.subtotal, o.vat_amount, o.service_charge, o.discount_amount, o.total_amount,
              o.bill_printed_at, u.full_name AS waiter_name, t.table_number,
              p.payment_method, p.transaction_id, p.amount AS paid_amount, p.created_at AS payment_time
       FROM orders o
       LEFT JOIN users u ON u.id = o.waiter_id
       LEFT JOIN tables t ON t.id = o.table_id
       LEFT JOIN payments p ON p.id = (
         SELECT p2.id FROM payments p2 WHERE p2.order_id = o.id AND p2.status = 'completed'
         ORDER BY p2.created_at DESC LIMIT 1
       )
       WHERE ${whereClause}
       ORDER BY o.bill_printed_at DESC
       LIMIT ? OFFSET ?`,
      [...values, limitInt, offsetInt]
    );
    res.json({ receipts: rows, page: parseInt(page), limit: limitInt });
  } catch (error) {
    console.error('Receipt history error:', error);
    res.status(500).json({ error: 'Failed to fetch receipt history' });
  }
});

// Transaction report for admin (cards/mobile wallet details)
router.get('/transactions/report', requireRole(['admin']), scopeBranch, async (req, res) => {
  try {
    const { page = 1, limit = 100, start_date, end_date } = req.query;
    const limitInt = parseInt(limit) || 100;
    const offsetInt = (parseInt(page) - 1) * limitInt;
    let whereClause = "p.status = 'completed'";
    const values = [];

    if (req.scopedBranchId) { whereClause += ' AND o.branch_id = ?'; values.push(req.scopedBranchId); }
    if (start_date) { whereClause += ' AND DATE(p.created_at) >= ?'; values.push(start_date); }
    if (end_date)   { whereClause += ' AND DATE(p.created_at) <= ?'; values.push(end_date); }

    const txns = await query(
      `SELECT p.id, p.order_id, p.payment_method, p.amount, p.transaction_id, p.created_at,
              o.order_number, o.order_type, o.status AS order_status, o.discount_amount, o.total_amount,
              o.customer_name, o.customer_phone, u.full_name AS waiter_name
       FROM payments p
       JOIN orders o ON o.id = p.order_id
       LEFT JOIN users u ON u.id = o.waiter_id
       WHERE ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...values, limitInt, offsetInt]
    );
    res.json({ transactions: txns, page: parseInt(page), limit: limitInt });
  } catch (error) {
    console.error('Transaction report error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions report' });
  }
});

// Get all hold orders (pay-later)
router.get('/hold', scopeBranch, async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const limitInt = Math.min(parseInt(limit) || 100, 200);
    const offsetInt = (parseInt(page) - 1) * limitInt;
    const branchFilter = req.scopedBranchId ? `AND o.branch_id = ${req.scopedBranchId}` : '';
    const rows = await query(
      `SELECT o.*, u.full_name AS waiter_full_name, t.table_number, t.location AS table_location
       FROM orders o
       LEFT JOIN users u ON u.id = o.waiter_id
       LEFT JOIN tables t ON t.id = o.table_id
       WHERE o.status = 'hold' ${branchFilter}
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [limitInt, offsetInt]
    );
    const countResult = await query(`SELECT COUNT(*) AS total FROM orders WHERE status = 'hold' ${branchFilter}`);
    res.json({ orders: rows, total: countResult[0].total, page: parseInt(page), limit: limitInt });
  } catch (error) {
    console.error('Get hold orders error:', error);
    res.status(500).json({ error: 'Failed to fetch hold orders' });
  }
});

// Get all cancelled orders
router.get('/cancelled', requireRole(['admin', 'waiter']), scopeBranch, async (req, res) => {
  try {
    const { page = 1, limit = 100, start_date, end_date } = req.query;
    const limitInt = Math.min(parseInt(limit) || 100, 200);
    const offsetInt = (parseInt(page) - 1) * limitInt;
    let whereClause = "o.status = 'cancelled'";
    const values = [];
    if (req.scopedBranchId) { whereClause += ' AND o.branch_id = ?'; values.push(req.scopedBranchId); }
    if (start_date) { whereClause += ' AND DATE(o.created_at) >= ?'; values.push(start_date); }
    if (end_date)   { whereClause += ' AND DATE(o.created_at) <= ?'; values.push(end_date); }
    const rows = await query(
      `SELECT o.*, u.full_name AS waiter_full_name, t.table_number,
              (SELECT JSON_UNQUOTE(JSON_EXTRACT(a.new_values, '$.reason'))
               FROM audit_logs a WHERE a.table_name = 'orders' AND a.record_id = o.id
               AND a.action = 'update_status'
               AND JSON_UNQUOTE(JSON_EXTRACT(a.new_values, '$.status')) = 'cancelled'
               ORDER BY a.created_at DESC LIMIT 1) AS cancellation_reason
       FROM orders o
       LEFT JOIN users u ON u.id = o.waiter_id
       LEFT JOIN tables t ON t.id = o.table_id
       WHERE ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [...values, limitInt, offsetInt]
    );
    const countResult = await query(`SELECT COUNT(*) AS total FROM orders o WHERE ${whereClause}`, values);
    res.json({ orders: rows, total: countResult[0].total, page: parseInt(page), limit: limitInt });
  } catch (error) {
    console.error('Get cancelled orders error:', error);
    res.status(500).json({ error: 'Failed to fetch cancelled orders' });
  }
});

// Get collected amount — payment breakdown by method (cash / card / bKash / Nagad)
router.get('/collected-amount', requireRole(['admin']), scopeBranch, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let dateFilter = '';
    const values = [];
    const branchJoin = req.scopedBranchId ? `JOIN orders o ON o.id = p.order_id AND o.branch_id = ${req.scopedBranchId}` : '';
    if (start_date) { dateFilter += ' AND DATE(p.created_at) >= ?'; values.push(start_date); }
    if (end_date)   { dateFilter += ' AND DATE(p.created_at) <= ?'; values.push(end_date); }
    const summary = await query(
      `SELECT p.payment_method, COUNT(*) AS count, SUM(p.amount) AS total_amount
       FROM payments p ${branchJoin} WHERE p.status = 'completed'${dateFilter}
       GROUP BY p.payment_method ORDER BY total_amount DESC`,
      values
    );
    const transactions = await query(
      `SELECT p.id, p.payment_method, p.amount, p.transaction_id, p.created_at,
              o.order_number, o.order_type, o.customer_name, o.customer_phone,
              o.total_amount AS order_total, o.discount_amount,
              u.full_name AS waiter_name, t.table_number
       FROM payments p
       JOIN orders o ON o.id = p.order_id
       LEFT JOIN users u ON u.id = o.waiter_id
       LEFT JOIN tables t ON t.id = o.table_id
       WHERE p.status = 'completed'${dateFilter}
       ORDER BY p.created_at DESC LIMIT 300`,
      values
    );
    const grandTotal = summary.reduce((s, r) => s + parseFloat(r.total_amount || 0), 0);
    res.json({ summary, transactions, grandTotal });
  } catch (error) {
    console.error('Get collected amount error:', error);
    res.status(500).json({ error: 'Failed to fetch collected amount' });
  }
});

// ── Parameterised route — must stay after all static GET sub-paths ──

// Get order by ID with items
router.get('/:id', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get order details
    const orderQuery = `
      SELECT o.*, u.username as waiter_name, u.full_name as waiter_full_name,
             t.table_number, t.location as table_location,
             o.bill_printed, o.bill_printed_at,
             (
               SELECT JSON_UNQUOTE(JSON_EXTRACT(a.new_values, '$.reason'))
               FROM audit_logs a
               WHERE a.table_name = 'orders'
                 AND a.record_id = o.id
                 AND a.action = 'update_status'
                 AND JSON_UNQUOTE(JSON_EXTRACT(a.new_values, '$.status')) = 'cancelled'
               ORDER BY a.created_at DESC
               LIMIT 1
             ) AS cancellation_reason
      FROM orders o
      LEFT JOIN users u ON o.waiter_id = u.id
      LEFT JOIN tables t ON o.table_id = t.id
      WHERE o.id = ?
    `;
    
    const orderResult = await query(orderQuery, [id]);
    const order = orderResult[0];
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Get order items
    const itemsQuery = `
      SELECT oi.*, fi.name as item_name, fi.description as item_description,
             fi.price as original_price, fi.promotional_price, fi.vat_rate
      FROM order_items oi
      LEFT JOIN food_items fi ON oi.food_item_id = fi.id
      WHERE oi.order_id = ?
      ORDER BY oi.created_at
    `;
    
    const items = await query(itemsQuery, [id]);
    
    // Get payments
    const payments = await findMany('payments', { order_id: id });
    
    // Get delivery details if applicable
    let deliveryDetails = null;
    if (order.order_type === 'delivery') {
      deliveryDetails = await findOne('delivery_details', { order_id: id });
    }
    
    res.json({
      order,
      items,
      payments,
      delivery_details: deliveryDetails
    });
    
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// ── Backdated order entry (admin only) ────────────────────────────────────────
router.post('/backdate', requireRole(['admin']), async (req, res) => {
  try {
    const {
      backdated_at,
      reason,
      order_type,
      table_id,
      customer_name,
      customer_phone,
      items,
      discount_amount = 0,
      payment_method = 'cash',
      payment_last4,
      branch_id,
    } = req.body;

    // Validate required fields
    if (!backdated_at) return res.status(400).json({ error: 'backdated_at is required' });
    if (!reason || !reason.trim()) return res.status(400).json({ error: 'Reason is required for backdated entries' });
    if (!order_type || !['dine_in', 'delivery', 'direct'].includes(order_type)) return res.status(400).json({ error: 'Invalid order_type' });
    if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'At least one item is required' });
    const validMethods = ['cash', 'card', 'bkash', 'nagad'];
    if (!validMethods.includes(payment_method)) return res.status(400).json({ error: 'Invalid payment method' });
    if (['card', 'bkash', 'nagad'].includes(payment_method)) {
      if (!/^\d{4}$/.test(String(payment_last4 || ''))) return res.status(400).json({ error: 'Last 4 digits required for card/bkash/nagad' });
    }

    const backdatedDate = new Date(backdated_at);
    if (isNaN(backdatedDate.getTime())) return res.status(400).json({ error: 'Invalid backdated_at date' });
    if (backdatedDate > new Date()) return res.status(400).json({ error: 'backdated_at cannot be in the future' });

    const orderBranchId = branch_id || req.headers['x-branch-id'] || 1;

    // Calculate totals using existing helper (no connection needed — read-only)
    const totals = await calculateOrderTotals(items, order_type, null, parseInt(orderBranchId) || null);
    const safeDiscount = Math.max(0, parseFloat(discount_amount) || 0);
    const adjustedTotal = Math.max(0, totals.total_amount - safeDiscount);

    // Insert order with backdated timestamps and final status
    const orderNumber = generateOrderNumber();
    const orderResult = await query(
      `INSERT INTO orders (order_number, branch_id, order_type, table_id, waiter_id,
        customer_name, customer_phone, status, subtotal, vat_amount, service_charge,
        delivery_fee, discount_amount, total_amount, bill_printed, bill_printed_at,
        created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'done', ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      [
        orderNumber, parseInt(orderBranchId) || 1, order_type,
        order_type === 'dine_in' ? (table_id || null) : null,
        req.user.id,
        ['delivery', 'direct'].includes(order_type) ? (customer_name || null) : null,
        ['delivery', 'direct'].includes(order_type) ? (customer_phone || null) : null,
        totals.subtotal, totals.vat_amount, totals.service_charge,
        totals.delivery_fee, safeDiscount, adjustedTotal,
        backdatedDate, backdatedDate, backdatedDate,
      ]
    );
    const orderId = orderResult.insertId;

    // Insert order items (status = ready, no kitchen queue)
    for (const item of items) {
      const foodRows = await query('SELECT * FROM food_items WHERE id = ?', [item.food_item_id]);
      const foodItem = foodRows[0];
      if (!foodItem) continue;
      const unitPrice = foodItem.promotional_price || foodItem.price;
      await query(
        `INSERT INTO order_items (order_id, food_item_id, quantity, unit_price, total_price, special_instructions, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'ready', ?)`,
        [orderId, item.food_item_id, item.quantity, unitPrice, unitPrice * item.quantity,
         item.special_instructions || null, backdatedDate]
      );
    }

    // Insert payment record
    const txnSuffix = payment_last4 ? `-${payment_last4}` : '';
    await query(
      `INSERT INTO payments (order_id, payment_method, amount, transaction_id, status, created_at)
       VALUES (?, ?, ?, ?, 'completed', ?)`,
      [orderId, payment_method, adjustedTotal,
       payment_last4 ? `${payment_method.toUpperCase()}${txnSuffix}` : null,
       backdatedDate]
    );

    // Audit log
    await logManualAudit(
      req.user.id, 'backdate_order', 'orders', orderId, null,
      { order_number: orderNumber, backdated_at, reason: reason.trim(), total: adjustedTotal },
      req.ip, req.headers['user-agent']
    );

    res.status(201).json({
      message: 'Backdated order created successfully',
      order_id: orderId,
      order_number: orderNumber,
    });
  } catch (error) {
    console.error('Backdate order error:', error);
    res.status(500).json({ error: error.message || 'Failed to create backdated order' });
  }
});

// Create new order with proper race condition prevention
router.post('/', rateLimiters.orderCreation, validateOrder, async (req, res) => {
  try {
    const {
      order_type,
      table_id,
      customer_name,
      customer_phone,
      items,
      special_instructions,
      delivery_details,
      branch_id,
    } = req.body;
    const orderBranchId = branch_id || req.headers['x-branch-id'] || 1;
    
    // M-5: Retry up to 3 times on order_number collision (ER_DUP_ENTRY)
    let result;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        result = await transactionWithIsolation(async (connection) => {
      // Validate table availability for dine-in with pessimistic locking
      if (order_type === 'dine_in' && table_id) {
        const [tableRows] = await connection.query(
          'SELECT * FROM tables WHERE id = ? FOR UPDATE',
          [table_id]
        );
        
        const table = tableRows[0];
        if (!table) {
          throw new Error('Table not found');
        }
        if (table.status !== 'available') {
          throw new Error('Table is not available');
        }
        
        // Update table status to occupied
        await connection.query(
          'UPDATE tables SET status = ?, updated_at = NOW() WHERE id = ?',
          ['occupied', table_id]
        );
      }
      
      // Check inventory for all items
      for (const item of items) {
        const [inventoryRows] = await connection.query(
          'SELECT current_stock, min_stock_threshold FROM food_inventory WHERE food_item_id = ? FOR UPDATE',
          [item.food_item_id]
        );
        
        const inventory = inventoryRows[0];
        if (inventory && inventory.current_stock < item.quantity) {
          throw new Error(`Insufficient stock for item ${item.food_item_id}`);
        }
      }
      
      // Calculate totals — pass connection and branchId so branch pricing is applied
      const totals = await calculateOrderTotals(items, order_type, connection, parseInt(orderBranchId) || null);
      
      // Insert order
      const orderData = {
        order_number: generateOrderNumber(),
        branch_id: parseInt(orderBranchId) || 1,
        order_type,
        table_id: order_type === 'dine_in' ? (table_id || null) : null,
        waiter_id: req.user.id,
        customer_name: ['delivery', 'direct'].includes(order_type) ? (customer_name || null) : null,
        customer_phone: ['delivery', 'direct'].includes(order_type) ? (customer_phone || null) : null,
        status: 'pending',
        special_instructions: special_instructions || null,
        ...totals
      };
      
      const [orderResult] = await connection.query(
        `INSERT INTO orders (${Object.keys(orderData).join(', ')}) 
         VALUES (${Object.keys(orderData).map(() => '?').join(', ')})`,
        Object.values(orderData)
      );
      
      const orderId = orderResult.insertId;
      
      // Insert order items and update inventory
      for (const item of items) {
        const [foodItemRows] = await connection.query(
          'SELECT * FROM food_items WHERE id = ?',
          [item.food_item_id]
        );
        
        const foodItem = foodItemRows[0];
        const unitPrice = foodItem.promotional_price || foodItem.price;
        const itemTotal = unitPrice * item.quantity;
        
        const itemData = {
          order_id: orderId,
          food_item_id: item.food_item_id,
          quantity: item.quantity,
          unit_price: unitPrice,
          total_price: itemTotal,
          special_instructions: item.special_instructions || null,
          status: 'pending'
        };
        
        const [itemResult] = await connection.query(
          `INSERT INTO order_items (${Object.keys(itemData).join(', ')}) 
           VALUES (${Object.keys(itemData).map(() => '?').join(', ')})`,
          Object.values(itemData)
        );
        
        // Update inventory
        await connection.query(
          'UPDATE food_inventory SET current_stock = current_stock - ?, last_updated = NOW() WHERE food_item_id = ?',
          [item.quantity, item.food_item_id]
        );
        
        // Add to kitchen queue with priority based on stock level
        const [inventoryRows] = await connection.query(
          'SELECT current_stock, min_stock_threshold FROM food_inventory WHERE food_item_id = ?',
          [item.food_item_id]
        );
        
        const inventory = inventoryRows[0];
        let priority = 0; // normal priority
        if (inventory && inventory.current_stock <= inventory.min_stock_threshold) {
          priority = 1; // high priority for low stock items
        }
        
        const kitchenData = {
          order_id: orderId,
          order_item_id: itemResult.insertId,
          priority: priority,
          estimated_prep_time: foodItem.preparation_time || 15,
          status: 'queued'
        };
        
        await connection.query(
          `INSERT INTO kitchen_queue (${Object.keys(kitchenData).join(', ')}) 
           VALUES (${Object.keys(kitchenData).map(() => '?').join(', ')})`,
          Object.values(kitchenData)
        );
      }
      
      // Insert delivery details if applicable
      if (order_type === 'delivery' && delivery_details) {
        const advance = parseFloat(delivery_details.advance_payment || 0);
        // M-6: Server computes due_amount from the verified total — do not trust client value
        const serverDue = Math.max(0, parseFloat(totals.total_amount) - advance);

        const deliveryData = {
          order_id: orderId,
          customer_address: delivery_details.customer_address || null,
          delivery_phone: delivery_details.delivery_phone || customer_phone || null,
          advance_payment: advance,
          due_amount: serverDue,
          order_time: delivery_details.order_time || null,
          delivery_time: delivery_details.delivery_time || null,
          delivery_notes: delivery_details.delivery_notes || null
        };
        
        await connection.query(
          `INSERT INTO delivery_details (${Object.keys(deliveryData).join(', ')}) 
           VALUES (${Object.keys(deliveryData).map(() => '?').join(', ')})`,
          Object.values(deliveryData)
        );
        // M-10: delivery_tracking table has no backend routes or UI — skip the dead INSERT
      }
      
      return orderId;
    }, 'SERIALIZABLE'); // Use highest isolation level to prevent race conditions
        break; // success — exit retry loop
      } catch (txErr) {
        // M-5: Retry only on duplicate order_number; rethrow anything else
        if (txErr.code === 'ER_DUP_ENTRY' && attempt < 2) continue;
        throw txErr;
      }
    }
    
    // Fetch the created order with all details
    const order = await findOne('orders', { id: result });
    
    // Emit real-time events
    const io = req.app.get('io');
    if (io) {
      io.to('kitchen').emit('new-order', {
        order_id: result,
        order_type: order.order_type,
        table_id: order.table_id,
        items_count: items.length
      });
      
      if (order.table_id) {
        io.to('waiter').emit('table-occupied', {
          table_id: order.table_id,
          order_id: result
        });
      }
    }
    
    // Log audit
    await logManualAudit(
      req.user.id,
      'create_order',
      'orders',
      result,
      null,
      { order_type, table_id, items_count: items.length },
      req.ip,
      req.headers['user-agent']
    );
    
    res.status(201).json({
      message: 'Order created successfully',
      order_id: result,
      order_number: order.order_number
    });
    
  } catch (error) {
    console.error('Create order error:', error);
    res.status(400).json({ 
      error: error.message || 'Failed to create order',
      code: 'ORDER_CREATION_FAILED'
    });
  }
});

// Put order on hold — customer pays later; table is auto-released
router.patch('/:id/hold', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_name, customer_phone } = req.body;
    if (!customer_name || !String(customer_name).trim()) {
      return res.status(400).json({ error: 'Customer name is required to hold an order' });
    }
    if (!customer_phone || !String(customer_phone).trim()) {
      return res.status(400).json({ error: 'Customer phone is required to hold an order' });
    }
    const order = await findOne('orders', { id });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (['done', 'cancelled', 'hold'].includes(order.status)) {
      return res.status(400).json({ error: `Order cannot be held — current status: ${order.status}` });
    }
    if (req.user.role !== 'admin' && order.waiter_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the assigned waiter or admin can hold this order' });
    }
    await transaction(async (connection) => {
      await connection.query(
        'UPDATE orders SET status = ?, customer_name = ?, customer_phone = ?, updated_at = NOW() WHERE id = ?',
        ['hold', customer_name.trim(), customer_phone.trim(), id]
      );
      if (order.order_type === 'dine_in' && order.table_id) {
        await connection.query(
          'UPDATE tables SET status = ?, updated_at = NOW() WHERE id = ?',
          ['available', order.table_id]
        );
      }
      // Auto-mark all pending kitchen items as ready so kitchen is cleared
      await connection.query(
        "UPDATE kitchen_queue SET status = 'ready', completed_at = NOW() WHERE order_id = ? AND status IN ('queued', 'preparing')",
        [id]
      );
    });
    await logManualAudit(
      req.user.id, 'hold_order', 'orders', parseInt(id),
      { status: order.status },
      { status: 'hold', customer_name, customer_phone },
      req.ip, req.headers['user-agent']
    );
    const io = req.app.get('io');
    if (io) {
      io.emit('order-status-update', { orderId: parseInt(id), oldStatus: order.status, newStatus: 'hold' });
      io.emit('kitchen-update', { orderId: parseInt(id), action: 'hold_cleared' });
      if (order.table_id) io.to('waiter').emit('table-available', { table_id: order.table_id });
    }
    const updatedOrder = await findOne('orders', { id });
    res.json({ message: 'Order put on hold. Table released. Kitchen items marked ready.', order: updatedOrder });
  } catch (error) {
    console.error('Hold order error:', error);
    res.status(500).json({ error: error.message || 'Failed to hold order' });
  }
});

// Update order status
router.patch('/:id/status', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    
    const validStatuses = ['pending', 'preparing', 'ready', 'done', 'cancelled', 'hold'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    // Check if order exists
    const order = await findOne('orders', { id });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Cancellation policy: only admin can cancel, and reason is mandatory
    if (status === 'cancelled') {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admin can cancel orders' });
      }
      if (!reason || !String(reason).trim()) {
        return res.status(400).json({ error: 'Cancellation reason is required' });
      }
    }

    // M-3: Enforce valid state transitions; admin can override
    const ALLOWED_TRANSITIONS = {
      pending:   ['preparing', 'cancelled'],
      preparing: ['ready', 'cancelled'],
      ready:     ['done', 'cancelled'],
      done:      [],
      cancelled: [],
      hold:      ['pending', 'cancelled'],  // reactivate or cancel a hold order
    };
    if (req.user.role !== 'admin') {
      const allowed = ALLOWED_TRANSITIONS[order.status] || [];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          error: `Cannot transition from '${order.status}' to '${status}'`,
          code: 'INVALID_TRANSITION',
          allowed_transitions: allowed
        });
      }
    }
    
    const oldStatus = order.status;
    
    // Update order status
    await update('orders', { 
      status, 
      updated_at: new Date()
    }, { id });
    
    // Update table status if order is done or cancelled
    if (order.order_type === 'dine_in' && order.table_id) {
      if (status === 'done' || status === 'cancelled') {
        await update('tables', { status: 'available' }, { id: order.table_id });
      }
    }
    
    // Handle cancellation side effects
    if (status === 'cancelled') {
      // C-5: Restore inventory for all non-cancelled items before marking them cancelled
      const activeItems = await findMany('order_items', { order_id: id });
      for (const item of activeItems) {
        if (item.status !== 'cancelled') {
          await query(
            'UPDATE food_inventory SET current_stock = current_stock + ?, last_updated = NOW() WHERE food_item_id = ?',
            [item.quantity, item.food_item_id]
          );
        }
      }

      await update('order_items', { status: 'cancelled' }, { order_id: id });
      await update('kitchen_queue', { status: 'cancelled' }, { order_id: id });

      // C-6: Sync delivery state when order is cancelled
      if (order.order_type === 'delivery') {
        await update('delivery_details', {
          delivery_status: 'cancelled',
          updated_at: new Date()
        }, { order_id: id });
      }
    }
    
    // C-3: Null-guard io before emitting (io may be null if Socket.IO failed to initialise)
    const io = req.app.get('io');
    if (io) {
      io.emit('order-status-update', { 
        orderId: parseInt(id), 
        oldStatus, 
        newStatus: status,
        updatedBy: req.user.username 
      });
      
      io.to(`order-${id}`).emit('order-update', { 
        orderId: parseInt(id), 
        status,
        updatedBy: req.user.username 
      });
      
      if (status === 'preparing' || status === 'ready') {
        io.to('kitchen').emit('kitchen-update', { 
          action: 'status-change', 
          orderId: parseInt(id), 
          status 
        });
      }
    }
    
    // Log audit
    await logManualAudit(
      req.user.id,
      'update_status',
      'orders',
      parseInt(id),
      { status: oldStatus },
      { status, reason },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({
      message: 'Order status updated successfully',
      old_status: oldStatus,
      new_status: status
    });
    
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Add payment to order
router.post('/:id/payments', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_method, amount, transaction_id } = req.body;

    const validMethods = ['cash', 'bkash', 'nagad', 'card'];
    if (!validMethods.includes(payment_method)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    // Check if order exists
    const order = await findOne('orders', { id });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // C-4: Block payments on orders that already have a printed bill
    if (order.bill_printed) {
      return res.status(400).json({
        error: 'Order is locked — bill has been printed. Use the bill endpoint to process payment.',
        code: 'ORDER_LOCKED'
      });
    }
    
    // Check if payment amount is valid
    const existingPayments = await findMany('payments', { order_id: id, status: 'completed' });
    const totalPaid = existingPayments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
    const remainingAmount = order.total_amount - totalPaid;
    
    if (amount > remainingAmount) {
      return res.status(400).json({ error: 'Payment amount exceeds remaining balance' });
    }
    
    // Create payment
    const paymentData = {
      order_id: parseInt(id),
      payment_method,
      amount,
      transaction_id: transaction_id || null,
      status: 'completed'
    };
    
    const payment = await insert('payments', paymentData);
    
    // Check if order is fully paid
    const newTotalPaid = totalPaid + amount;
    if (newTotalPaid >= order.total_amount) {
      await update('orders', { status: 'done' }, { id });
      
      // Emit real-time update
      const io = req.app.get('io');
      io.emit('order-status-update', { 
        orderId: parseInt(id), 
        newStatus: 'done',
        updatedBy: req.user.username 
      });
    }
    
    // Log audit
    await logManualAudit(
      req.user.id,
      'add_payment',
      'payments',
      payment.id,
      null,
      paymentData,
      req.ip,
      req.headers['user-agent']
    );
    
    res.status(201).json({
      message: 'Payment added successfully',
      payment,
      remaining_balance: remainingAmount - amount
    });
    
  } catch (error) {
    console.error('Add payment error:', error);
    res.status(500).json({ error: 'Failed to add payment' });
  }
});

// Modify order items (add/remove) — blocked once bill is printed
router.put('/:id/items', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const { add_items = [], remove_item_ids = [], update_items = [] } = req.body;

    // Load order
    const order = await findOne('orders', { id });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Lock after bill printed
    if (order.bill_printed) {
      return res.status(403).json({ error: 'Order is locked — bill has been printed', code: 'ORDER_LOCKED' });
    }

    // Permission check — waiter must own the order; admin can do anything
    if (req.user.role !== 'admin' && order.waiter_id !== req.user.id) {
      return res.status(403).json({ error: 'Insufficient permissions to modify this order' });
    }

    // Cannot modify cancelled / done orders
    if (['done', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ error: `Cannot modify order with status: ${order.status}` });
    }

    await transaction(async (conn) => {
      // Update quantity of existing items
      for (const ui of update_items) {
        const newQty = parseInt(ui.quantity);
        if (!newQty || newQty < 1) continue;
        const [rows] = await conn.query(
          "SELECT * FROM order_items WHERE id = ? AND order_id = ? AND status != 'cancelled'",
          [ui.order_item_id, id]
        );
        const oi = rows[0];
        if (!oi) continue;
        const qtyDiff = newQty - oi.quantity;
        const newTotal = oi.unit_price * newQty;
        await conn.query(
          'UPDATE order_items SET quantity = ?, total_price = ?, updated_at = NOW() WHERE id = ?',
          [newQty, newTotal, ui.order_item_id]
        );
        // Adjust inventory
        if (qtyDiff !== 0) {
          await conn.query(
            'UPDATE food_inventory SET current_stock = current_stock - ?, last_updated = NOW() WHERE food_item_id = ?',
            [qtyDiff, oi.food_item_id]
          );
        }
      }

      // Remove items
      for (const itemId of remove_item_ids) {
        const [rows] = await conn.query('SELECT * FROM order_items WHERE id = ? AND order_id = ?', [itemId, id]);
        const oi = rows[0];
        if (!oi) continue;
        if (oi.status === 'cancelled') continue; // already cancelled

        await conn.query('UPDATE order_items SET status = ?, updated_at = NOW() WHERE id = ?', ['cancelled', itemId]);
        await conn.query('UPDATE kitchen_queue SET status = ?, updated_at = NOW() WHERE order_item_id = ?', ['cancelled', itemId]);
      }

      // Add items
      for (const item of add_items) {
        const [foodRows] = await conn.query('SELECT * FROM food_items WHERE id = ? AND is_available = 1', [item.food_item_id]);
        const fi = foodRows[0];
        if (!fi) throw new Error(`Food item ${item.food_item_id} not found or unavailable`);

        const qty = parseInt(item.quantity) || 1;
        const unitPrice = fi.promotional_price || fi.price;
        const itemTotal = unitPrice * qty;

        const [oir] = await conn.query(
          'INSERT INTO order_items (order_id, food_item_id, quantity, unit_price, total_price, special_instructions, status) VALUES (?,?,?,?,?,?,?)',
          [id, fi.id, qty, unitPrice, itemTotal, item.special_instructions || null, 'pending']
        );

        await conn.query(
          'INSERT INTO kitchen_queue (order_id, order_item_id, priority, estimated_prep_time, status) VALUES (?,?,?,?,?)',
          [id, oir.insertId, 0, fi.preparation_time || 15, 'queued']
        );
      }

      // Recalculate totals from active items
      const [activeItems] = await conn.query(
        "SELECT oi.*, fi.vat_rate FROM order_items oi JOIN food_items fi ON oi.food_item_id = fi.id WHERE oi.order_id = ? AND oi.status != 'cancelled'",
        [id]
      );

      let subtotal = 0, vatAmount = 0;
      for (const ai of activeItems) {
        subtotal += parseFloat(ai.total_price);
        vatAmount += (parseFloat(ai.total_price) * parseFloat(ai.vat_rate)) / 100;
      }

      // M-4: also apply delivery_fee on recalculation
      const [settingsRows] = await conn.query(
        "SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('service_charge_percentage', 'delivery_fee')"
      );
      const settingsMap = {};
      settingsRows.forEach(r => { settingsMap[r.setting_key] = r.setting_value; });

      const svcPct = order.order_type === 'dine_in' ? parseFloat(settingsMap.service_charge_percentage || 10) : 0;
      const deliveryFee = order.order_type === 'delivery' ? parseFloat(settingsMap.delivery_fee || 0) : 0;
      const serviceCharge = (subtotal * svcPct) / 100;
      const totalAmount = subtotal + vatAmount + serviceCharge + deliveryFee;

      await conn.query(
        'UPDATE orders SET subtotal=?, vat_amount=?, service_charge=?, delivery_fee=?, total_amount=?, updated_at=NOW() WHERE id=?',
        [subtotal, vatAmount, serviceCharge, deliveryFee, totalAmount, id]
      );
    });

    // Return updated order
    const updatedOrder = await findOne('orders', { id });
    const items = await query(
      "SELECT oi.*, fi.name as item_name FROM order_items oi JOIN food_items fi ON oi.food_item_id = fi.id WHERE oi.order_id = ?",
      [id]
    );

    await logManualAudit(
      req.user.id, 'modify_items', 'orders', parseInt(id),
      null,
      { add_items, remove_item_ids, update_items },
      req.ip, req.headers['user-agent']
    );

    const io = req.app.get('io');
    if (io) io.emit('order-modified', { orderId: parseInt(id), modifiedBy: req.user.username });

    res.json({ message: 'Order items updated successfully', order: updatedOrder, items });
  } catch (error) {
    console.error('Modify order items error:', error);
    res.status(400).json({ error: error.message || 'Failed to modify order items' });
  }
});

// Print bill — locks the order against further modifications
router.post('/:id/bill', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const { discount_amount = 0, payment_method = 'cash', payment_last4, service_charge_percentage, service_charge_override } = req.body || {};

    const validMethods = ['cash', 'card', 'bkash', 'nagad'];
    if (!validMethods.includes(payment_method)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }
    if (['card', 'bkash', 'nagad'].includes(payment_method)) {
      const last4 = String(payment_last4 || '');
      if (!/^\d{4}$/.test(last4)) {
        return res.status(400).json({ error: 'Last 4 digits are required for card/bkash/nagad' });
      }
    }

    const order = await findOne('orders', { id });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.bill_printed) {
      return res.status(400).json({ error: 'Bill has already been printed for this order' });
    }

    if (['cancelled'].includes(order.status)) {
      return res.status(400).json({ error: 'Cannot print bill for a cancelled order' });
    }

    const safeDiscount = Math.max(0, parseFloat(discount_amount) || 0);

    // Allow service charge override from the bill popup
    let finalServiceCharge = parseFloat(order.service_charge) || 0;
    if (service_charge_override !== undefined && service_charge_override !== null) {
      // Named preset: fixed amount already computed on frontend
      finalServiceCharge = Math.max(0, parseFloat(service_charge_override) || 0);
    } else if (service_charge_percentage !== undefined && service_charge_percentage !== null) {
      // Legacy percentage-based override
      const pct = Math.max(0, parseFloat(service_charge_percentage) || 0);
      finalServiceCharge = (parseFloat(order.subtotal) * pct) / 100;
    }

    const baseTotal = parseFloat(order.subtotal) + parseFloat(order.vat_amount) + finalServiceCharge;
    const adjustedTotal = Math.max(0, baseTotal - safeDiscount);

    // Mark bill printed
    await update('orders', {
      bill_printed: true,
      bill_printed_at: new Date(),
      discount_amount: safeDiscount,
      service_charge: finalServiceCharge,
      total_amount: adjustedTotal,
      status: 'done',
      updated_at: new Date()
    }, { id });

    // Mark table available on completion
    if (order.order_type === 'dine_in' && order.table_id) {
      await update('tables', { status: 'available', updated_at: new Date() }, { id: order.table_id });
    }

    // Persist payment record
    const txnSuffix = payment_last4 ? `-${payment_last4}` : '';
    const txnPrefix = payment_method.toUpperCase();
    await insert('payments', {
      order_id: parseInt(id),
      payment_method: payment_method, // stored exactly as given — ENUM now includes 'nagad'
      amount: adjustedTotal,
      transaction_id: payment_last4 ? `${txnPrefix}${txnSuffix}` : null,
      status: 'completed'
    });

    // Fetch full bill data — JOIN users so waiter_full_name is available for receipt
    const orderRows = await query(
      `SELECT o.*, u.full_name AS waiter_full_name, u.username AS waiter_name
       FROM orders o LEFT JOIN users u ON o.waiter_id = u.id WHERE o.id = ?`,
      [id]
    );
    const updatedOrder = orderRows[0];
    const items = await query(
      "SELECT oi.*, fi.name as item_name FROM order_items oi JOIN food_items fi ON oi.food_item_id = fi.id WHERE oi.order_id = ? AND oi.status != 'cancelled'",
      [id]
    );

    const settings = await findMany('system_settings', {}, 'setting_key, setting_value');
    const settingsMap = {};
    settings.forEach(s => { settingsMap[s.setting_key] = s.setting_value; });

    await logManualAudit(
      req.user.id, 'print_bill', 'orders', parseInt(id),
      { bill_printed: false },
      { bill_printed: true, bill_printed_at: new Date() },
      req.ip, req.headers['user-agent']
    );

    const io = req.app.get('io');
    if (io) io.emit('bill-printed', { orderId: parseInt(id), printedBy: req.user.username });

    res.json({
      message: 'Bill printed successfully',
      order: updatedOrder,
      items,
      payment: {
        payment_method,
        payment_last4: payment_last4 || null,
      },
      restaurant: {
        name: settingsMap.restaurant_name || 'FoodPark',
        address: settingsMap.restaurant_address || '',
        phone: settingsMap.restaurant_phone || '',
        vat_number: settingsMap.restaurant_vat_number || '',
        currency: settingsMap.currency_symbol || '৳',
        vat_percentage: settingsMap.vat_percentage || '15',
        service_charge_percentage: settingsMap.service_charge_percentage || '10',
      }
    });
  } catch (error) {
    console.error('Print bill error:', error);
    res.status(500).json({ error: 'Failed to print bill' });
  }
});

// M-11: Admin unlock — clears the bill_printed flag so an accidentally printed bill can be corrected
router.patch('/:id/unlock-bill', validateId, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const order = await findOne('orders', { id });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (!order.bill_printed) {
      return res.status(400).json({ error: 'Order bill has not been printed — nothing to unlock' });
    }

    await update('orders', {
      bill_printed: false,
      bill_printed_at: null,
      status: 'ready',
      updated_at: new Date()
    }, { id });

    // Delete the payment record created when bill was printed
    await query(
      "DELETE FROM payments WHERE order_id = ? AND status = 'completed' ORDER BY created_at DESC LIMIT 1",
      [id]
    );

    await logManualAudit(
      req.user.id, 'unlock_bill', 'orders', parseInt(id),
      { bill_printed: true },
      { bill_printed: false, unlocked_by: req.user.username },
      req.ip, req.headers['user-agent']
    );

    const io = req.app.get('io');
    if (io) io.emit('order-unlocked', { orderId: parseInt(id), unlockedBy: req.user.username });

    res.json({ message: 'Bill lock removed. Order is back to ready status.', order_id: parseInt(id) });
  } catch (error) {
    console.error('Unlock bill error:', error);
    res.status(500).json({ error: 'Failed to unlock bill' });
  }
});

// ── Search orders by food name or table number ─────────────────────────────
router.get('/search/query', scopeBranch, async (req, res) => {
  try {
    const { q = '' } = req.query;
    const term = q.trim();
    if (!term) return res.json({ orders: [] });

    const searchQuery = `
      SELECT DISTINCT
        o.id, o.order_number, o.order_type, o.status,
        o.subtotal, o.vat_amount, o.service_charge, o.discount_amount, o.total_amount,
        o.created_at, o.bill_printed,
        u.full_name  AS waiter_full_name,
        t.table_number, t.location AS table_location,
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'id',        oi2.id,
              'item_name', fi2.name,
              'quantity',  oi2.quantity,
              'unit_price',oi2.unit_price,
              'total_price',oi2.total_price,
              'status',    oi2.status
            )
          )
          FROM order_items oi2
          LEFT JOIN food_items fi2 ON oi2.food_item_id = fi2.id
          WHERE oi2.order_id = o.id AND oi2.status != 'cancelled'
        ) AS items_json
      FROM orders o
      LEFT JOIN users   u  ON o.waiter_id   = u.id
      LEFT JOIN tables  t  ON o.table_id    = t.id
      LEFT JOIN order_items oi ON oi.order_id = o.id AND oi.status != 'cancelled'
      LEFT JOIN food_items  fi ON oi.food_item_id = fi.id
      WHERE o.status IN ('pending','preparing','ready')
        AND (
          fi.name          LIKE CONCAT('%', ?, '%')
          OR t.table_number LIKE CONCAT('%', ?, '%')
        )
      ORDER BY o.created_at DESC
      LIMIT 50
    `;

    const rows = await query(searchQuery, [term, term]);

    const orders = rows.map(row => ({
      ...row,
      items: (() => {
        try { return JSON.parse(row.items_json) || []; } catch { return []; }
      })(),
      items_json: undefined,
    }));

    res.json({ orders });
  } catch (error) {
    console.error('Order search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ── Change table for a dine-in order ───────────────────────────────────────
router.patch('/:id/table', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const { table_id } = req.body;

    if (!table_id) return res.status(400).json({ error: 'table_id is required' });

    const order = await findOne('orders', { id });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.order_type !== 'dine_in') {
      return res.status(400).json({ error: 'Table can only be changed for dine-in orders' });
    }
    if (order.bill_printed) {
      return res.status(400).json({ error: 'Bill already printed — unlock it before changing table' });
    }

    const newTable = await findOne('tables', { id: table_id });
    if (!newTable) return res.status(404).json({ error: 'Table not found' });
    if (newTable.status !== 'available' && newTable.id !== order.table_id) {
      return res.status(400).json({ error: `Table ${newTable.table_number} is not available` });
    }

    const oldTableId = order.table_id;

    await query('UPDATE orders SET table_id = ?, updated_at = NOW() WHERE id = ?', [table_id, id]);

    // Free old table if no other active orders remain on it
    if (oldTableId && oldTableId !== parseInt(table_id)) {
      const activeOnOld = await query(
        "SELECT id FROM orders WHERE table_id = ? AND status IN ('pending','preparing','ready') AND id != ?",
        [oldTableId, id]
      );
      if (activeOnOld.length === 0) {
        await query("UPDATE tables SET status = 'available', updated_at = NOW() WHERE id = ?", [oldTableId]);
      }
      // Mark new table occupied
      await query("UPDATE tables SET status = 'occupied', updated_at = NOW() WHERE id = ?", [table_id]);
    }

    await logManualAudit(
      req.user.id, 'change_table', 'orders', parseInt(id),
      { table_id: oldTableId },
      { table_id: parseInt(table_id), new_table_number: newTable.table_number },
      req.ip, req.headers['user-agent']
    );

    const io = req.app.get('io');
    if (io) {
      io.emit('table-status-changed', { tableId: oldTableId, status: 'available' });
      io.emit('table-status-changed', { tableId: parseInt(table_id), status: 'occupied' });
    }

    const updated = await query(
      `SELECT o.*, t.table_number, t.location AS table_location
       FROM orders o LEFT JOIN tables t ON o.table_id = t.id WHERE o.id = ?`,
      [id]
    );

    res.json({ message: `Order moved to table ${newTable.table_number}`, order: updated[0] });
  } catch (error) {
    console.error('Change table error:', error);
    res.status(500).json({ error: 'Failed to change table' });
  }
});

module.exports = router;

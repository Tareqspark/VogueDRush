const express = require('express');
const { findOne, findMany, insert, update, remove, transaction, transactionWithIsolation, query } = require('../config/database');
const { requireRole } = require('../middleware/auth');
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

// Calculate order totals (M-4: applies delivery_fee from settings for delivery orders)
const calculateOrderTotals = async (items, orderType) => {
  let subtotal = 0;
  let totalVat = 0;
  
  for (const item of items) {
    const foodItem = await findOne('food_items', { id: item.food_item_id });
    if (!foodItem || !foodItem.is_available) {
      throw new Error(`Food item ${item.food_item_id} not available`);
    }
    
    const unitPrice = foodItem.promotional_price || foodItem.price;
    const itemTotal = unitPrice * item.quantity;
    const itemVat = (itemTotal * foodItem.vat_rate) / 100;
    
    subtotal += itemTotal;
    totalVat += itemVat;
  }
  
  // Get system settings
  const settings = await findMany('system_settings', {}, 'setting_key, setting_value');
  const settingsMap = {};
  settings.forEach(setting => {
    settingsMap[setting.setting_key] = setting.setting_value;
  });
  
  const serviceChargePercentage = orderType === 'dine_in' ? parseFloat(settingsMap.service_charge_percentage || 10) : 0;
  const deliveryFee = orderType === 'delivery' ? parseFloat(settingsMap.delivery_fee || 0) : 0;
  
  const serviceCharge = (subtotal * serviceChargePercentage) / 100;
  const totalAmount = subtotal + totalVat + serviceCharge + deliveryFee;
  
  return {
    subtotal,
    vat_amount: totalVat,
    service_charge: serviceCharge,
    delivery_fee: deliveryFee,
    discount_amount: 0,
    total_amount: totalAmount
  };
};

// Get all orders with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      status, 
      order_type, 
      waiter_id, 
      start_date, 
      end_date,
      table_id 
    } = req.query;
    
    const limitInt = parseInt(limit) || 50;
    const offsetInt = (parseInt(page) - 1) * limitInt;
    let whereClause = '1=1';
    let values = [];
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
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ── Static sub-resource routes MUST come before /:id to avoid param capture ──

// Get order statistics with yesterday comparison for trend indicators (M-12)
router.get('/stats/overview', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let dateFilter = '';
    let values = [];

    if (start_date && end_date) {
      dateFilter = 'WHERE DATE(created_at) BETWEEN ? AND ?';
      values = [start_date, end_date];
    }

    const statusStats = await query(`
      SELECT status, COUNT(*) as count,
             SUM(total_amount) as total_revenue
      FROM orders
      ${dateFilter}
      GROUP BY status
    `, values);

    const typeStats = await query(`
      SELECT order_type, COUNT(*) as count,
             SUM(total_amount) as total_revenue
      FROM orders
      ${dateFilter}
      GROUP BY order_type
    `, values);

    const todayStats = await query(
      `SELECT COUNT(*) as today_orders, COALESCE(SUM(total_amount), 0) as today_revenue
       FROM orders WHERE DATE(created_at) = CURDATE()`
    );

    const yesterdayStats = await query(
      `SELECT COUNT(*) as yesterday_orders, COALESCE(SUM(total_amount), 0) as yesterday_revenue
       FROM orders WHERE DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`
    );

    res.json({ statusStats, typeStats, todayStats: todayStats[0], yesterdayStats: yesterdayStats[0] });
  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({ error: 'Failed to fetch order statistics' });
  }
});

// Receipt history (admin management view)
router.get('/receipts/history', requireRole(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 100, start_date, end_date } = req.query;
    const limitInt = parseInt(limit) || 100;
    const offsetInt = (parseInt(page) - 1) * limitInt;
    let whereClause = 'o.bill_printed = 1';
    const values = [];

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
router.get('/transactions/report', requireRole(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 100, start_date, end_date } = req.query;
    const limitInt = parseInt(limit) || 100;
    const offsetInt = (parseInt(page) - 1) * limitInt;
    let whereClause = "p.status = 'completed'";
    const values = [];

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
      delivery_details 
    } = req.body;
    
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
      
      // Calculate totals
      const totals = await calculateOrderTotals(items, order_type);
      
      // Insert order
      const orderData = {
        order_number: generateOrderNumber(),
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
        // M-1: Store order_time / delivery_time in proper TIME columns (not as a string)
        const deliveryData = {
          order_id: orderId,
          customer_address: delivery_details.customer_address || null,
          delivery_phone: delivery_details.delivery_phone || customer_phone || null,
          advance_payment: delivery_details.advance_payment || 0.00,
          due_amount: delivery_details.due_amount || 0.00,
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

// Update order status
router.patch('/:id/status', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    
    const validStatuses = ['pending', 'preparing', 'ready', 'done', 'cancelled'];
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
      cancelled: []
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
    
    // Update order items status
    if (status === 'cancelled') {
      await update('order_items', { status: 'cancelled' }, { order_id: id });
      await update('kitchen_queue', { status: 'cancelled' }, { order_id: id });
    }
    
    // Emit real-time updates
    const io = req.app.get('io');
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
    const { add_items = [], remove_item_ids = [] } = req.body;

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
      { add_items, remove_item_ids },
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
    const { discount_amount = 0, payment_method = 'cash', payment_last4 } = req.body || {};

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
    const baseTotal = parseFloat(order.subtotal) + parseFloat(order.vat_amount) + parseFloat(order.service_charge);
    const adjustedTotal = Math.max(0, baseTotal - safeDiscount);

    // Mark bill printed
    await update('orders', {
      bill_printed: true,
      bill_printed_at: new Date(),
      discount_amount: safeDiscount,
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

    // Fetch full bill data
    const updatedOrder = await findOne('orders', { id });
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

module.exports = router;

const express = require('express');
const { findOne, findMany, insert, update, remove, transaction, transactionWithIsolation } = require('../config/database');
const { requireRole } = require('../middleware/auth');
const { rateLimiters } = require('../middleware/rateLimiter');
const { validateOrder, validateId } = require('../middleware/validation');
const { logManualAudit } = require('../middleware/audit');

const router = express.Router();

// Generate unique order number
const generateOrderNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD${year}${month}${day}${random}`;
};

// Calculate order totals
const calculateOrderTotals = async (items, orderType) => {
  const { query } = require('../config/database');
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
  
  const vatPercentage = parseFloat(settingsMap.vat_percentage || 15);
  const serviceChargePercentage = orderType === 'dine_in' ? parseFloat(settingsMap.service_charge_percentage || 10) : 0;
  
  const serviceCharge = (subtotal * serviceChargePercentage) / 100;
  const totalAmount = subtotal + totalVat + serviceCharge;
  
  return {
    subtotal,
    vat_amount: totalVat,
    service_charge: serviceCharge,
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
    
    const { query } = require('../config/database');
    
    // Get orders with joins
    const ordersQuery = `
      SELECT o.*, u.username as waiter_name, u.full_name as waiter_full_name,
             t.table_number, t.location as table_location
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

// Get order by ID with items
router.get('/:id', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { query } = require('../config/database');
    
    // Get order details
    const orderQuery = `
      SELECT o.*, u.username as waiter_name, u.full_name as waiter_full_name,
             t.table_number, t.location as table_location
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
    
    // Use transaction with proper isolation level
    const result = await transactionWithIsolation(async (connection) => {
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
        customer_name: order_type === 'delivery' ? (customer_name || null) : null,
        customer_phone: order_type === 'delivery' ? (customer_phone || null) : null,
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
        const deliveryData = {
          order_id: orderId,
          customer_address: delivery_details.customer_address || null,
          delivery_phone: delivery_details.delivery_phone || customer_phone || null,
          advance_payment: delivery_details.advance_payment || 0.00,
          due_amount: delivery_details.due_amount || 0.00,
          delivery_notes: delivery_details.delivery_notes || null
        };
        
        const [deliveryResult] = await connection.query(
          `INSERT INTO delivery_details (${Object.keys(deliveryData).join(', ')}) 
           VALUES (${Object.keys(deliveryData).map(() => '?').join(', ')})`,
          Object.values(deliveryData)
        );
        
        // Create delivery tracking record
        const trackingData = {
          delivery_detail_id: deliveryResult.insertId,
          current_status: 'pending',
          estimated_delivery_time: new Date(Date.now() + 45 * 60 * 1000) // 45 minutes from now
        };
        
        await connection.query(
          `INSERT INTO delivery_tracking (${Object.keys(trackingData).join(', ')}) 
           VALUES (${Object.keys(trackingData).map(() => '?').join(', ')})`,
          Object.values(trackingData)
        );
      }
      
      return orderId;
    }, 'SERIALIZABLE'); // Use highest isolation level to prevent race conditions
    
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
    
    // Check permissions based on status
    if (status === 'cancelled' && req.user.role !== 'admin' && order.waiter_id !== req.user.id) {
      return res.status(403).json({ error: 'Only admin or order creator can cancel orders' });
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
    
    const validMethods = ['cash', 'bkash', 'card'];
    if (!validMethods.includes(payment_method)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }
    
    // Check if order exists
    const order = await findOne('orders', { id });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
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

// Get order statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const { query } = require('../config/database');
    const { start_date, end_date } = req.query;
    
    let dateFilter = '';
    let values = [];
    
    if (start_date && end_date) {
      dateFilter = 'WHERE DATE(created_at) BETWEEN ? AND ?';
      values = [start_date, end_date];
    }
    
    // Get order counts by status
    const statusStats = await query(`
      SELECT status, COUNT(*) as count, 
             SUM(total_amount) as total_revenue
      FROM orders 
      ${dateFilter}
      GROUP BY status
    `, values);
    
    // Get order counts by type
    const typeStats = await query(`
      SELECT order_type, COUNT(*) as count,
             SUM(total_amount) as total_revenue
      FROM orders 
      ${dateFilter}
      GROUP BY order_type
    `, values);
    
    // Get today's stats
    const todayQuery = dateFilter ? 
      `SELECT COUNT(*) as today_orders, SUM(total_amount) as today_revenue 
       FROM orders WHERE DATE(created_at) = CURDATE()` :
      `SELECT COUNT(*) as today_orders, SUM(total_amount) as today_revenue 
       FROM orders WHERE DATE(created_at) = CURDATE()`;
    
    const todayStats = await query(todayQuery);
    
    res.json({
      statusStats,
      typeStats,
      todayStats: todayStats[0]
    });
    
  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({ error: 'Failed to fetch order statistics' });
  }
});

module.exports = router;

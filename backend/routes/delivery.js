const express = require('express');
const { findOne, findMany, insert, update, remove } = require('../config/database');
const { requireRole } = require('../middleware/auth');
const { validateDeliveryDetails, validateId } = require('../middleware/validation');
const { logManualAudit } = require('../middleware/audit');

const router = express.Router();

// Get all delivery orders with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      delivery_status, 
      start_date, 
      end_date,
      customer_phone 
    } = req.query;
    
    const limitInt = parseInt(limit) || 50;
    const offsetInt = (parseInt(page) - 1) * limitInt;
    let whereClause = '1=1';
    let values = [];
    
    if (delivery_status) {
      whereClause += ' AND dd.delivery_status = ?';
      values.push(delivery_status);
    }
    
    if (start_date) {
      whereClause += ' AND DATE(o.created_at) >= ?';
      values.push(start_date);
    }
    
    if (end_date) {
      whereClause += ' AND DATE(o.created_at) <= ?';
      values.push(end_date);
    }
    
    if (customer_phone) {
      whereClause += ' AND (o.customer_phone LIKE ? OR dd.delivery_phone LIKE ?)';
      values.push(`%${customer_phone}%`, `%${customer_phone}%`);
    }
    
    const { query } = require('../config/database');
    
    // Get delivery orders with joins
    const deliveriesQuery = `
      SELECT o.*, dd.*, u.username as waiter_name, u.full_name as waiter_full_name,
             p.amount as paid_amount, p.payment_method, p.status as payment_status
      FROM orders o
      JOIN delivery_details dd ON o.id = dd.order_id
      LEFT JOIN users u ON o.waiter_id = u.id
      LEFT JOIN payments p ON o.id = p.order_id AND p.status = 'completed'
      WHERE o.order_type = 'delivery' AND ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const deliveries = await query(deliveriesQuery, [...values, limitInt, offsetInt]);
    
    // Get order items for each delivery
    for (const delivery of deliveries) {
      const items = await findMany(
        'order_items',
        { order_id: delivery.id },
        'food_item_id, quantity, unit_price, total_price, special_instructions, status'
      );
      
      // Get food item names
      for (const item of items) {
        const foodItem = await findOne('food_items', { id: item.food_item_id }, 'name, description');
        item.item_name = foodItem.name;
        item.item_description = foodItem.description;
      }
      
      delivery.items = items;
    }
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM orders o 
      JOIN delivery_details dd ON o.id = dd.order_id 
      WHERE o.order_type = 'delivery' AND ${whereClause}
    `;
    const countResult = await query(countQuery, values);
    const total = countResult[0].total;
    
    res.json({
      deliveries,
      pagination: {
        page: parseInt(page),
        limit: limitInt,
        total,
        pages: Math.ceil(total / limitInt)
      }
    });
    
  } catch (error) {
    console.error('Get deliveries error:', error);
    res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
});

// Get delivery order by ID
router.get('/:id', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { query } = require('../config/database');
    
    // Get delivery order details
    const deliveryQuery = `
      SELECT o.*, dd.*, u.username as waiter_name, u.full_name as waiter_full_name
      FROM orders o
      JOIN delivery_details dd ON o.id = dd.order_id
      LEFT JOIN users u ON o.waiter_id = u.id
      WHERE o.id = ? AND o.order_type = 'delivery'
    `;
    
    const deliveryResult = await query(deliveryQuery, [id]);
    const delivery = deliveryResult[0];
    
    if (!delivery) {
      return res.status(404).json({ error: 'Delivery order not found' });
    }
    
    // Get order items
    const itemsQuery = `
      SELECT oi.*, fi.name as item_name, fi.description as item_description
      FROM order_items oi
      LEFT JOIN food_items fi ON oi.food_item_id = fi.id
      WHERE oi.order_id = ?
      ORDER BY oi.created_at
    `;
    
    const items = await query(itemsQuery, [id]);
    delivery.items = items;
    
    // Get payments
    const payments = await findMany('payments', { order_id: id });
    delivery.payments = payments;
    
    // Calculate payment summary
    const totalPaid = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
    delivery.payment_summary = {
      total_paid: totalPaid,
      advance_payment: delivery.advance_payment,
      due_amount: delivery.due_amount,
      remaining_balance: delivery.due_amount - totalPaid
    };
    
    res.json(delivery);
    
  } catch (error) {
    console.error('Get delivery error:', error);
    res.status(500).json({ error: 'Failed to fetch delivery order' });
  }
});

// Update delivery status
router.patch('/:id/status', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, delivery_person } = req.body;
    
    const validStatuses = ['pending', 'assigned', 'picked_up', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid delivery status' });
    }
    
    // Check if delivery order exists
    const delivery = await findOne('delivery_details', { order_id: id });
    if (!delivery) {
      return res.status(404).json({ error: 'Delivery order not found' });
    }
    
    const order = await findOne('orders', { id });
    if (!order || order.order_type !== 'delivery') {
      return res.status(404).json({ error: 'Order not found or not a delivery order' });
    }
    
    const oldStatus = delivery.delivery_status;
    
    // Validate status transitions
    const validTransitions = {
      'pending': ['assigned', 'cancelled'],
      'assigned': ['picked_up', 'cancelled'],
      'picked_up': ['delivered', 'cancelled'],
      'delivered': [], // Final state
      'cancelled': [] // Final state
    };
    
    if (!validTransitions[oldStatus].includes(status) && oldStatus !== status) {
      return res.status(400).json({ 
        error: `Cannot transition from ${oldStatus} to ${status}` 
      });
    }
    
    // Update delivery status
    const updateData = {
      delivery_status: status,
      updated_at: new Date()
    };
    
    if (notes) updateData.delivery_notes = notes;
    if (delivery_person) updateData.delivery_person = delivery_person;
    
    if (status === 'delivered') {
      updateData.delivered_at = new Date();
    }
    
    await update('delivery_details', updateData, { order_id: id });
    
    // Update order status based on delivery status
    let orderStatus = order.status;
    if (status === 'delivered') {
      orderStatus = 'done';
    } else if (status === 'cancelled') {
      orderStatus = 'cancelled';
    }
    
    if (orderStatus !== order.status) {
      await update('orders', {
        status: orderStatus,
        updated_at: new Date()
      }, { id });
    }
    
    // Get updated delivery
    const updatedDelivery = await findOne('delivery_details', { order_id: id });
    
    // Emit real-time updates
    const io = req.app.get('io');
    io.emit('delivery-status-update', {
      orderId: parseInt(id),
      oldStatus,
      newStatus: status,
      updatedBy: req.user.username,
      notes
    });
    
    io.to(`order-${id}`).emit('order-update', {
      orderId: parseInt(id),
      delivery_status: status,
      updatedBy: req.user.username
    });
    
    // Log audit
    await logManualAudit(
      req.user.id,
      'update_delivery_status',
      'delivery_details',
      delivery.id,
      { delivery_status: oldStatus },
      { delivery_status: status, notes, delivery_person },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({
      message: 'Delivery status updated successfully',
      old_status: oldStatus,
      new_status: status,
      delivery: updatedDelivery
    });
    
  } catch (error) {
    console.error('Update delivery status error:', error);
    res.status(500).json({ error: 'Failed to update delivery status' });
  }
});

// Record payment collection for delivery
router.post('/:id/collect-payment', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_method, amount_collected, transaction_id } = req.body;
    
    const validMethods = ['cash', 'bkash', 'card'];
    if (!validMethods.includes(payment_method)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }
    
    // Check if delivery order exists
    const delivery = await findOne('delivery_details', { order_id: id });
    if (!delivery) {
      return res.status(404).json({ error: 'Delivery order not found' });
    }
    
    const order = await findOne('orders', { id });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Check if delivery is marked as delivered
    if (delivery.delivery_status !== 'delivered') {
      return res.status(400).json({ error: 'Cannot collect payment for undelivered order' });
    }
    
    // Get existing payments
    const existingPayments = await findMany('payments', { order_id: id, status: 'completed' });
    const totalPaid = existingPayments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
    
    // Validate payment amount
    const remainingAmount = delivery.due_amount - totalPaid;
    if (amount_collected > remainingAmount) {
      return res.status(400).json({ 
        error: 'Payment amount exceeds remaining balance',
        remaining_balance: remainingAmount
      });
    }
    
    // Create payment record
    const paymentData = {
      order_id: parseInt(id),
      payment_method,
      amount: parseFloat(amount_collected),
      transaction_id: transaction_id || null,
      status: 'completed'
    };
    
    const payment = await insert('payments', paymentData);
    
    // Update delivery details if fully paid
    const newTotalPaid = totalPaid + parseFloat(amount_collected);
    if (newTotalPaid >= delivery.due_amount) {
      await update('delivery_details', {
        payment_collected: true,
        payment_collected_at: new Date(),
        updated_at: new Date()
      }, { order_id: id });
    }
    
    // Emit real-time update
    const io = req.app.get('io');
    io.emit('delivery-payment-collected', {
      orderId: parseInt(id),
      amount: parseFloat(amount_collected),
      payment_method,
      collected_by: req.user.username,
      remaining_balance: remainingAmount - parseFloat(amount_collected)
    });
    
    // Log audit
    await logManualAudit(
      req.user.id,
      'collect_delivery_payment',
      'payments',
      payment.id,
      null,
      paymentData,
      req.ip,
      req.headers['user-agent']
    );
    
    res.status(201).json({
      message: 'Payment collected successfully',
      payment,
      remaining_balance: remainingAmount - parseFloat(amount_collected),
      fully_paid: newTotalPaid >= delivery.due_amount
    });
    
  } catch (error) {
    console.error('Collect delivery payment error:', error);
    res.status(500).json({ error: 'Failed to collect payment' });
  }
});

// Update delivery details
router.put('/:id', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      customer_address, 
      delivery_phone, 
      delivery_notes,
      advance_payment 
    } = req.body;
    
    // Check if delivery order exists
    const existingDelivery = await findOne('delivery_details', { order_id: id });
    if (!existingDelivery) {
      return res.status(404).json({ error: 'Delivery order not found' });
    }
    
    const order = await findOne('orders', { id });
    if (!order || order.order_type !== 'delivery') {
      return res.status(404).json({ error: 'Order not found or not a delivery order' });
    }
    
    // Check if order can be modified
    if (order.status === 'done' || order.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot modify completed or cancelled order' });
    }
    
    const updateData = { updated_at: new Date() };
    
    if (customer_address !== undefined) updateData.customer_address = customer_address;
    if (delivery_phone !== undefined) updateData.delivery_phone = delivery_phone;
    if (delivery_notes !== undefined) updateData.delivery_notes = delivery_notes;
    
    if (advance_payment !== undefined) {
      const newAdvancePayment = parseFloat(advance_payment);
      if (newAdvancePayment < 0 || newAdvancePayment > order.total_amount) {
        return res.status(400).json({ 
          error: 'Advance payment must be between 0 and total order amount' 
        });
      }
      updateData.advance_payment = newAdvancePayment;
      updateData.due_amount = order.total_amount - newAdvancePayment;
    }
    
    await update('delivery_details', updateData, { order_id: id });
    
    // Get updated delivery
    const updatedDelivery = await findOne('delivery_details', { order_id: id });
    
    // Log audit
    await logManualAudit(
      req.user.id,
      'update',
      'delivery_details',
      existingDelivery.id,
      existingDelivery,
      updateData,
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({
      message: 'Delivery details updated successfully',
      delivery: updatedDelivery
    });
    
  } catch (error) {
    console.error('Update delivery details error:', error);
    res.status(500).json({ error: 'Failed to update delivery details' });
  }
});

// Get pending deliveries for dashboard
router.get('/pending/list', async (req, res) => {
  try {
    const { query } = require('../config/database');
    
    const pendingQuery = `
      SELECT o.id, o.order_number, o.customer_name, o.customer_phone,
             o.total_amount, o.created_at,
             dd.customer_address, dd.delivery_phone, dd.advance_payment, dd.due_amount,
             dd.delivery_status, dd.delivery_notes,
             u.username as waiter_name,
             TIMESTAMPDIFF(MINUTE, o.created_at, NOW()) as time_elapsed
      FROM orders o
      JOIN delivery_details dd ON o.id = dd.order_id
      LEFT JOIN users u ON o.waiter_id = u.id
      WHERE o.order_type = 'delivery' 
        AND o.status NOT IN ('done', 'cancelled')
        AND dd.delivery_status NOT IN ('delivered', 'cancelled')
      ORDER BY o.created_at ASC
    `;
    
    const pendingDeliveries = await query(pendingQuery);
    
    res.json({
      pending_deliveries: pendingDeliveries,
      total_count: pendingDeliveries.length
    });
    
  } catch (error) {
    console.error('Get pending deliveries error:', error);
    res.status(500).json({ error: 'Failed to fetch pending deliveries' });
  }
});

// Get delivery statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    const { query } = require('../config/database');
    
    let dateFilter = '';
    let values = [];
    
    if (start_date && end_date) {
      dateFilter = 'WHERE DATE(o.created_at) BETWEEN ? AND ?';
      values = [start_date, end_date];
    }
    
    // Get delivery status counts
    const statusStats = await query(`
      SELECT dd.delivery_status, COUNT(*) as count,
             SUM(o.total_amount) as total_value,
             AVG(dd.advance_payment) as avg_advance_payment
      FROM orders o
      JOIN delivery_details dd ON o.id = dd.order_id
      WHERE o.order_type = 'delivery' ${dateFilter ? 'AND ' + dateFilter.substring(6) : ''}
      GROUP BY dd.delivery_status
    `, values);
    
    // Get payment collection stats
    const paymentStats = await query(`
      SELECT 
        COUNT(*) as total_deliveries,
        SUM(CASE WHEN dd.payment_collected = 1 THEN 1 ELSE 0 END) as paid_deliveries,
        SUM(o.total_amount) as total_order_value,
        SUM(dd.advance_payment) as total_advance_collected,
        SUM(dd.due_amount) as total_due_amount,
        ROUND(
          (SUM(CASE WHEN dd.payment_collected = 1 THEN 1 ELSE 0 END) * 100.0) / 
          NULLIF(COUNT(*), 0), 
          2
        ) as payment_collection_rate
      FROM orders o
      JOIN delivery_details dd ON o.id = dd.order_id
      WHERE o.order_type = 'delivery' ${dateFilter ? 'AND ' + dateFilter.substring(6) : ''}
    `, values);
    
    // Get delivery time performance
    const timeStats = await query(`
      SELECT 
        AVG(TIMESTAMPDIFF(MINUTE, o.created_at, dd.delivered_at)) as avg_delivery_time,
        MIN(TIMESTAMPDIFF(MINUTE, o.created_at, dd.delivered_at)) as min_delivery_time,
        MAX(TIMESTAMPDIFF(MINUTE, o.created_at, dd.delivered_at)) as max_delivery_time
      FROM orders o
      JOIN delivery_details dd ON o.id = dd.order_id
      WHERE o.order_type = 'delivery' 
        AND dd.delivery_status = 'delivered'
        AND dd.delivered_at IS NOT NULL
        ${dateFilter ? 'AND ' + dateFilter.substring(6) : ''}
    `, values);
    
    // Get daily delivery trends
    const dailyStats = await query(`
      SELECT DATE(o.created_at) as delivery_date,
             COUNT(*) as delivery_count,
             SUM(o.total_amount) as daily_revenue,
             SUM(dd.advance_payment) as daily_advance,
             SUM(CASE WHEN dd.delivery_status = 'delivered' THEN 1 ELSE 0 END) as delivered_count
      FROM orders o
      JOIN delivery_details dd ON o.id = dd.order_id
      WHERE o.order_type = 'delivery' ${dateFilter ? 'AND ' + dateFilter.substring(6) : ''}
      GROUP BY DATE(o.created_at)
      ORDER BY delivery_date DESC
      LIMIT 30
    `, values);
    
    res.json({
      statusStats,
      paymentStats: paymentStats[0],
      timeStats: timeStats[0],
      dailyStats
    });
    
  } catch (error) {
    console.error('Get delivery stats error:', error);
    res.status(500).json({ error: 'Failed to fetch delivery statistics' });
  }
});

// Get delivery areas/regions analytics
router.get('/analytics/areas', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    const { query } = require('../config/database');
    
    let dateFilter = '';
    let values = [];
    
    if (start_date && end_date) {
      dateFilter = 'AND DATE(o.created_at) BETWEEN ? AND ?';
      values = [start_date, end_date];
    }
    
    // Extract area information from addresses (simple pattern matching)
    const areaStats = await query(`
      SELECT 
        CASE 
          WHEN dd.customer_address LIKE '%Dhanmondi%' THEN 'Dhanmondi'
          WHEN dd.customer_address LIKE '%Gulshan%' THEN 'Gulshan'
          WHEN dd.customer_address LIKE '%Banani%' THEN 'Banani'
          WHEN dd.customer_address LIKE '%Mirpur%' THEN 'Mirpur'
          WHEN dd.customer_address LIKE '%Uttara%' THEN 'Uttara'
          WHEN dd.customer_address LIKE '%Mohammadpur%' THEN 'Mohammadpur'
          WHEN dd.customer_address LIKE '%Bashundhara%' THEN 'Bashundhara'
          ELSE 'Other Areas'
        END as area,
        COUNT(*) as delivery_count,
        SUM(o.total_amount) as total_revenue,
        AVG(o.total_amount) as avg_order_value,
        SUM(CASE WHEN dd.delivery_status = 'delivered' THEN 1 ELSE 0 END) as delivered_count
      FROM orders o
      JOIN delivery_details dd ON o.id = dd.order_id
      WHERE o.order_type = 'delivery' ${dateFilter}
      GROUP BY area
      ORDER BY delivery_count DESC
    `, values);
    
    res.json({
      area_stats: areaStats
    });
    
  } catch (error) {
    console.error('Get delivery areas analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch delivery areas analytics' });
  }
});

module.exports = router;

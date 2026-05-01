const express = require('express');
const { findOne, findMany, insert, update, remove } = require('../config/database');
const { requireRole } = require('../middleware/auth');
const { validateId } = require('../middleware/validation');
const { logManualAudit } = require('../middleware/audit');

const router = express.Router();

// Get kitchen queue with filtering and sorting
router.get('/', async (req, res) => {
  try {
    const { 
      status, 
      priority, 
      order_id,
      page = 1, 
      limit = 100 
    } = req.query;
    
    const limitInt = parseInt(limit) || 50;
    const offsetInt = (parseInt(page) - 1) * limitInt;
    let whereClause = '1=1';
    let values = [];
    
    if (status) {
      whereClause += ' AND kq.status = ?';
      values.push(status);
    }
    
    if (priority) {
      whereClause += ' AND kq.priority = ?';
      values.push(priority);
    }
    
    if (order_id) {
      whereClause += ' AND kq.order_id = ?';
      values.push(order_id);
    }
    
    const { query } = require('../config/database');
    
    // Get kitchen queue with order and item details
    const queueQuery = `
      SELECT kq.*, o.order_number, o.order_type, o.table_id, o.customer_name,
             oi.quantity, oi.unit_price, oi.total_price, oi.special_instructions,
             fi.name as item_name, fi.description as item_description,
             fi.preparation_time as standard_prep_time,
             t.table_number, t.location as table_location,
             u.username as waiter_name, u.full_name as waiter_full_name,
             TIMESTAMPDIFF(MINUTE, kq.created_at, NOW()) as time_in_queue
      FROM kitchen_queue kq
      JOIN orders o ON kq.order_id = o.id
      JOIN order_items oi ON kq.order_item_id = oi.id
      JOIN food_items fi ON oi.food_item_id = fi.id
      LEFT JOIN tables t ON o.table_id = t.id
      LEFT JOIN users u ON o.waiter_id = u.id
      WHERE ${whereClause}
      ORDER BY kq.priority DESC, kq.created_at ASC
      LIMIT ? OFFSET ?
    `;
    
    const queueItems = await query(queueQuery, [...values, limitInt, offsetInt]);
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM kitchen_queue kq WHERE ${whereClause}`;
    const countResult = await query(countQuery, values);
    const total = countResult[0].total;
    
    // Calculate estimated completion times
    for (const item of queueItems) {
      if (item.status === 'preparing' && item.started_at) {
        item.elapsed_prep_time = Math.floor((new Date() - new Date(item.started_at)) / 60000); // in minutes
        item.remaining_prep_time = Math.max(0, item.estimated_prep_time - item.elapsed_prep_time);
      } else {
        item.elapsed_prep_time = 0;
        item.remaining_prep_time = item.estimated_prep_time;
      }
    }
    
    res.json({
      queue: queueItems,
      pagination: {
        page: parseInt(page),
        limit: limitInt,
        total,
        pages: Math.ceil(total / limitInt)
      }
    });
    
  } catch (error) {
    console.error('Get kitchen queue error:', error);
    res.status(500).json({ error: 'Failed to fetch kitchen queue' });
  }
});

// Get kitchen queue item by ID
router.get('/:id', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { query } = require('../config/database');
    
    const itemQuery = `
      SELECT kq.*, o.order_number, o.order_type, o.table_id, o.customer_name, o.special_instructions as order_special_instructions,
             oi.quantity, oi.unit_price, oi.total_price, oi.special_instructions as item_special_instructions,
             fi.name as item_name, fi.description as item_description, fi.image_url,
             fi.preparation_time as standard_prep_time, fi.vat_rate,
             t.table_number, t.location as table_location,
             u.username as waiter_name, u.full_name as waiter_full_name,
             TIMESTAMPDIFF(MINUTE, kq.created_at, NOW()) as time_in_queue
      FROM kitchen_queue kq
      JOIN orders o ON kq.order_id = o.id
      JOIN order_items oi ON kq.order_item_id = oi.id
      JOIN food_items fi ON oi.food_item_id = fi.id
      LEFT JOIN tables t ON o.table_id = t.id
      LEFT JOIN users u ON o.waiter_id = u.id
      WHERE kq.id = ?
    `;
    
    const itemResult = await query(itemQuery, [id]);
    const item = itemResult[0];
    
    if (!item) {
      return res.status(404).json({ error: 'Kitchen queue item not found' });
    }
    
    // Calculate timing information
    if (item.status === 'preparing' && item.started_at) {
      item.elapsed_prep_time = Math.floor((new Date() - new Date(item.started_at)) / 60000);
      item.remaining_prep_time = Math.max(0, item.estimated_prep_time - item.elapsed_prep_time);
    } else {
      item.elapsed_prep_time = 0;
      item.remaining_prep_time = item.estimated_prep_time;
    }
    
    // Get other items from the same order
    const orderItemsQuery = `
      SELECT kq.id, kq.status, kq.priority, kq.estimated_prep_time,
             fi.name as item_name, oi.quantity,
             TIMESTAMPDIFF(MINUTE, kq.created_at, NOW()) as time_in_queue
      FROM kitchen_queue kq
      JOIN order_items oi ON kq.order_item_id = oi.id
      JOIN food_items fi ON oi.food_item_id = fi.id
      WHERE kq.order_id = ? AND kq.id != ?
      ORDER BY kq.priority DESC, kq.created_at ASC
    `;
    
    const orderItems = await query(orderItemsQuery, [item.order_id, id]);
    item.order_items = orderItems;
    
    res.json(item);
    
  } catch (error) {
    console.error('Get kitchen queue item error:', error);
    res.status(500).json({ error: 'Failed to fetch kitchen queue item' });
  }
});

// Start preparation for kitchen item
router.patch('/:id/start', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if item exists and is in correct status
    const queueItem = await findOne('kitchen_queue', { id });
    if (!queueItem) {
      return res.status(404).json({ error: 'Kitchen queue item not found' });
    }
    
    if (queueItem.status !== 'queued') {
      return res.status(400).json({ error: 'Item is not in queued status' });
    }
    
    // Update kitchen queue item
    await update('kitchen_queue', {
      status: 'preparing',
      started_at: new Date(),
      updated_at: new Date()
    }, { id });
    
    // Update order item status
    await update('order_items', {
      status: 'preparing',
      updated_at: new Date()
    }, { id: queueItem.order_item_id });
    
    // Check if order status should be updated to preparing
    const { query } = require('../config/database');
    const orderItemsResult = await query(
      'SELECT COUNT(*) as pending_count FROM order_items WHERE order_id = ? AND status = "pending"',
      [queueItem.order_id]
    );
    
    if (orderItemsResult[0].pending_count === 0) {
      await update('orders', {
        status: 'preparing',
        updated_at: new Date()
      }, { id: queueItem.order_id });
    }
    
    // Get updated item
    const updatedItem = await findOne('kitchen_queue', { id });
    
    // Emit real-time updates
    const io = req.app.get('io');
    io.emit('kitchen-item-started', {
      itemId: parseInt(id),
      orderId: queueItem.order_id,
      startedBy: req.user.username,
      startedAt: new Date()
    });
    
    io.to(`order-${queueItem.order_id}`).emit('order-item-update', {
      orderItemId: queueItem.order_item_id,
      status: 'preparing',
      started_by: req.user.username
    });
    
    // Log audit
    await logManualAudit(
      req.user.id,
      'start_preparation',
      'kitchen_queue',
      parseInt(id),
      { status: 'queued' },
      { status: 'preparing', started_at: new Date() },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({
      message: 'Preparation started successfully',
      item: updatedItem
    });
    
  } catch (error) {
    console.error('Start preparation error:', error);
    res.status(500).json({ error: 'Failed to start preparation' });
  }
});

// Mark kitchen item as ready
router.patch('/:id/ready', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if item exists and is in correct status
    const queueItem = await findOne('kitchen_queue', { id });
    if (!queueItem) {
      return res.status(404).json({ error: 'Kitchen queue item not found' });
    }
    
    if (queueItem.status !== 'preparing') {
      return res.status(400).json({ error: 'Item is not in preparing status' });
    }
    
    const now = new Date();
    let actualPrepTime = null;
    
    if (queueItem.started_at) {
      actualPrepTime = Math.floor((now - new Date(queueItem.started_at)) / 60000); // in minutes
    }
    
    // Update kitchen queue item
    await update('kitchen_queue', {
      status: 'ready',
      completed_at: now,
      actual_prep_time: actualPrepTime,
      updated_at: now
    }, { id });
    
    // Update order item status
    await update('order_items', {
      status: 'ready',
      updated_at: now
    }, { id: queueItem.order_item_id });
    
    // Check if all items in order are ready
    const { query } = require('../config/database');
    const orderItemsResult = await query(
      'SELECT COUNT(*) as not_ready_count FROM order_items WHERE order_id = ? AND status IN ("pending", "preparing")',
      [queueItem.order_id]
    );
    
    if (orderItemsResult[0].not_ready_count === 0) {
      await update('orders', {
        status: 'ready',
        updated_at: now
      }, { id: queueItem.order_id });
      
      // Emit order ready notification
      const io = req.app.get('io');
      io.emit('order-ready', {
        orderId: queueItem.order_id,
        readyAt: now,
        completedBy: req.user.username
      });
    }
    
    // Get updated item
    const updatedItem = await findOne('kitchen_queue', { id });
    
    // Emit real-time updates
    const io = req.app.get('io');
    io.emit('kitchen-item-ready', {
      itemId: parseInt(id),
      orderId: queueItem.order_id,
      readyBy: req.user.username,
      readyAt: now,
      actualPrepTime
    });
    
    io.to(`order-${queueItem.order_id}`).emit('order-item-update', {
      orderItemId: queueItem.order_item_id,
      status: 'ready',
      completed_by: req.user.username,
      actual_prep_time: actualPrepTime
    });
    
    // Log audit
    await logManualAudit(
      req.user.id,
      'mark_ready',
      'kitchen_queue',
      parseInt(id),
      { status: 'preparing' },
      { status: 'ready', completed_at: now, actual_prep_time: actualPrepTime },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({
      message: 'Item marked as ready successfully',
      item: updatedItem,
      actual_prep_time: actualPrepTime
    });
    
  } catch (error) {
    console.error('Mark item ready error:', error);
    res.status(500).json({ error: 'Failed to mark item as ready' });
  }
});

// Cancel kitchen item
router.patch('/:id/cancel', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    // Check if item exists
    const queueItem = await findOne('kitchen_queue', { id });
    if (!queueItem) {
      return res.status(404).json({ error: 'Kitchen queue item not found' });
    }
    
    if (queueItem.status === 'ready') {
      return res.status(400).json({ error: 'Cannot cancel ready item' });
    }
    
    // Check permissions - only admin or order creator can cancel
    const order = await findOne('orders', { id: queueItem.order_id });
    if (req.user.role !== 'admin' && order.waiter_id !== req.user.id) {
      return res.status(403).json({ error: 'Insufficient permissions to cancel item' });
    }
    
    // Update kitchen queue item
    await update('kitchen_queue', {
      status: 'cancelled',
      updated_at: new Date()
    }, { id });
    
    // Update order item status
    await update('order_items', {
      status: 'cancelled',
      updated_at: new Date()
    }, { id: queueItem.order_item_id });
    
    // Check if all items in order are cancelled
    const { query } = require('../config/database');
    const orderItemsResult = await query(
      'SELECT COUNT(*) as active_count FROM order_items WHERE order_id = ? AND status NOT IN ("cancelled", "ready")',
      [queueItem.order_id]
    );
    
    if (orderItemsResult[0].active_count === 0) {
      await update('orders', {
        status: 'cancelled',
        updated_at: new Date(),
        cancellation_reason: reason || 'Item cancelled from kitchen'
      }, { id: queueItem.order_id });
      
      // Free up table if dine-in
      if (order.order_type === 'dine_in' && order.table_id) {
        await update('tables', { status: 'available' }, { id: order.table_id });
      }
    }
    
    // Emit real-time updates
    const io = req.app.get('io');
    io.emit('kitchen-item-cancelled', {
      itemId: parseInt(id),
      orderId: queueItem.order_id,
      cancelledBy: req.user.username,
      reason
    });
    
    io.to(`order-${queueItem.order_id}`).emit('order-item-update', {
      orderItemId: queueItem.order_item_id,
      status: 'cancelled',
      cancelled_by: req.user.username,
      reason
    });
    
    // Log audit
    await logManualAudit(
      req.user.id,
      'cancel',
      'kitchen_queue',
      parseInt(id),
      { status: queueItem.status },
      { status: 'cancelled', reason },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({
      message: 'Item cancelled successfully',
      reason
    });
    
  } catch (error) {
    console.error('Cancel kitchen item error:', error);
    res.status(500).json({ error: 'Failed to cancel item' });
  }
});

// Update item priority
router.patch('/:id/priority', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const { priority } = req.body;
    
    const validPriorities = [0, 1, 2]; // 0=normal, 1=high, 2=urgent
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority level' });
    }
    
    // Check if item exists
    const queueItem = await findOne('kitchen_queue', { id });
    if (!queueItem) {
      return res.status(404).json({ error: 'Kitchen queue item not found' });
    }
    
    const oldPriority = queueItem.priority;
    
    // Update priority
    await update('kitchen_queue', {
      priority,
      updated_at: new Date()
    }, { id });
    
    // Emit real-time update
    const io = req.app.get('io');
    io.emit('kitchen-item-priority-updated', {
      itemId: parseInt(id),
      orderId: queueItem.order_id,
      oldPriority,
      newPriority: priority,
      updatedBy: req.user.username
    });
    
    // Log audit
    await logManualAudit(
      req.user.id,
      'update_priority',
      'kitchen_queue',
      parseInt(id),
      { priority: oldPriority },
      { priority },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({
      message: 'Priority updated successfully',
      old_priority: oldPriority,
      new_priority: priority
    });
    
  } catch (error) {
    console.error('Update priority error:', error);
    res.status(500).json({ error: 'Failed to update priority' });
  }
});

// Get kitchen statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    const { query } = require('../config/database');
    
    let dateFilter = '';
    let values = [];
    
    if (start_date && end_date) {
      dateFilter = 'WHERE DATE(kq.created_at) BETWEEN ? AND ?';
      values = [start_date, end_date];
    }
    
    // Get queue status counts
    const statusStats = await query(`
      SELECT status, COUNT(*) as count,
             AVG(estimated_prep_time) as avg_estimated_time,
             AVG(actual_prep_time) as avg_actual_time
      FROM kitchen_queue 
      ${dateFilter}
      GROUP BY status
    `, values);
    
    // Get priority distribution
    const priorityStats = await query(`
      SELECT priority, COUNT(*) as count,
             CASE priority
               WHEN 0 THEN 'Normal'
               WHEN 1 THEN 'High'
               WHEN 2 THEN 'Urgent'
             END as priority_name
      FROM kitchen_queue 
      ${dateFilter}
      GROUP BY priority
      ORDER BY priority DESC
    `, values);
    
    // Get performance metrics
    const performanceStats = await query(`
      SELECT 
        COUNT(*) as total_items,
        SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) as completed_items,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_items,
        ROUND(
          (SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) * 100.0) / 
          NULLIF(COUNT(*), 0), 
          2
        ) as completion_rate,
        AVG(CASE WHEN actual_prep_time IS NOT NULL THEN actual_prep_time ELSE NULL END) as avg_prep_time,
        AVG(CASE WHEN estimated_prep_time > 0 AND actual_prep_time IS NOT NULL 
                  THEN (actual_prep_time / estimated_prep_time) * 100 
                  ELSE NULL END) as efficiency_percentage
      FROM kitchen_queue 
      ${dateFilter}
    `, values);
    
    // Get item performance (most prepared items)
    const itemStats = await query(`
      SELECT fi.name, COUNT(*) as preparation_count,
             AVG(kq.actual_prep_time) as avg_prep_time,
             AVG(kq.estimated_prep_time) as avg_estimated_time
      FROM kitchen_queue kq
      JOIN order_items oi ON kq.order_item_id = oi.id
      JOIN food_items fi ON oi.food_item_id = fi.id
      ${dateFilter.replace('kq.', '')}
      GROUP BY fi.id, fi.name
      HAVING preparation_count > 0
      ORDER BY preparation_count DESC
      LIMIT 10
    `, values);
    
    // Get current workload
    const currentWorkload = await query(`
      SELECT 
        COUNT(*) as total_queued,
        SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as queued_items,
        SUM(CASE WHEN status = 'preparing' THEN 1 ELSE 0 END) as preparing_items,
        SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) as ready_items,
        SUM(CASE WHEN status = 'queued' THEN estimated_prep_time ELSE 0 END) as total_queued_time
      FROM kitchen_queue 
      WHERE status IN ('queued', 'preparing', 'ready')
    `);
    
    res.json({
      statusStats,
      priorityStats,
      performanceStats: performanceStats[0],
      itemStats,
      currentWorkload: currentWorkload[0]
    });
    
  } catch (error) {
    console.error('Get kitchen stats error:', error);
    res.status(500).json({ error: 'Failed to fetch kitchen statistics' });
  }
});

// Get kitchen display board data (optimized for kitchen display)
router.get('/display/board', async (req, res) => {
  try {
    const { status_filter = 'active' } = req.query; // active, all, ready
    
    let statusCondition = '';
    if (status_filter === 'active') {
      statusCondition = 'AND kq.status IN ("queued", "preparing")';
    } else if (status_filter === 'ready') {
      statusCondition = 'AND kq.status = "ready"';
    }
    
    const { query } = require('../config/database');
    
    const boardQuery = `
      SELECT kq.id, kq.status, kq.priority, kq.estimated_prep_time,
             kq.started_at, kq.completed_at,
             TIMESTAMPDIFF(MINUTE, kq.created_at, NOW()) as time_in_queue,
             o.order_number, o.order_type, o.created_at as order_time,
             oi.quantity, oi.special_instructions,
             fi.name as item_name,
             t.table_number,
             u.username as waiter_name,
             CASE 
               WHEN kq.status = 'preparing' AND kq.started_at IS NOT NULL 
               THEN TIMESTAMPDIFF(MINUTE, kq.started_at, NOW())
               ELSE 0 
             END as elapsed_time
      FROM kitchen_queue kq
      JOIN orders o ON kq.order_id = o.id
      JOIN order_items oi ON kq.order_item_id = oi.id
      JOIN food_items fi ON oi.food_item_id = fi.id
      LEFT JOIN tables t ON o.table_id = t.id
      LEFT JOIN users u ON o.waiter_id = u.id
      WHERE 1=1 ${statusCondition}
      ORDER BY kq.priority DESC, kq.created_at ASC
    `;
    
    const boardItems = await query(boardQuery);
    
    // Group by order for better display
    const groupedOrders = {};
    boardItems.forEach(item => {
      if (!groupedOrders[item.order_number]) {
        groupedOrders[item.order_number] = {
          order_number: item.order_number,
          order_type: item.order_type,
          table_number: item.table_number,
          waiter_name: item.waiter_name,
          order_time: item.order_time,
          items: [],
          status_summary: {
            queued: 0,
            preparing: 0,
            ready: 0
          }
        };
      }
      
      groupedOrders[item.order_number].items.push(item);
      groupedOrders[item.order_number].status_summary[item.status]++;
    });
    
    res.json({
      display_data: Object.values(groupedOrders),
      summary: {
        total_orders: Object.keys(groupedOrders).length,
        total_items: boardItems.length,
        queued_items: boardItems.filter(item => item.status === 'queued').length,
        preparing_items: boardItems.filter(item => item.status === 'preparing').length,
        ready_items: boardItems.filter(item => item.status === 'ready').length
      }
    });
    
  } catch (error) {
    console.error('Get kitchen display error:', error);
    res.status(500).json({ error: 'Failed to fetch kitchen display data' });
  }
});

module.exports = router;

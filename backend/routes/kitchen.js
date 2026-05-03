const express = require('express');
const { findOne, findMany, insert, update, remove, query } = require('../config/database');
const { requireRole } = require('../middleware/auth');
const { validateId } = require('../middleware/validation');
const { logManualAudit } = require('../middleware/audit');

const router = express.Router();

// Get kitchen queue with advanced filtering and priority sorting
router.get('/', async (req, res) => {
  try {
    const { 
      status, 
      priority, 
      order_id,
      page = 1, 
      limit = 100,
      sort_by = 'priority_created',
      filter_overdue = 'false'
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
    
    // Filter overdue items (items taking longer than estimated prep time)
    if (filter_overdue === 'true') {
      whereClause += ' AND (kq.status = "preparing" AND TIMESTAMPDIFF(MINUTE, kq.started_at, NOW()) > kq.estimated_prep_time)';
    }
    
    // Dynamic sorting based on priority and creation time
    let orderByClause;
    switch (sort_by) {
      case 'priority_created':
        orderByClause = 'kq.priority DESC, kq.created_at ASC';
        break;
      case 'prep_time':
        orderByClause = 'kq.estimated_prep_time ASC, kq.priority DESC';
        break;
      case 'time_in_queue':
        orderByClause = 'TIMESTAMPDIFF(MINUTE, kq.created_at, NOW()) DESC, kq.priority DESC';
        break;
      case 'order_type':
        orderByClause = 'o.order_type ASC, kq.priority DESC';
        break;
      default:
        orderByClause = 'kq.priority DESC, kq.created_at ASC';
    }
    
    // Get kitchen queue with comprehensive details
    const queueQuery = `
      SELECT kq.*, o.order_number, o.order_type, o.table_id, o.customer_name,
             oi.quantity, oi.unit_price, oi.total_price, oi.special_instructions,
             fi.name as item_name, fi.description as item_description,
             fi.preparation_time as standard_prep_time, fi.image_url,
             t.table_number, t.location as table_location,
             u.username as waiter_name, u.full_name as waiter_full_name,
             TIMESTAMPDIFF(MINUTE, kq.created_at, NOW()) as time_in_queue,
             CASE 
               WHEN kq.status = 'preparing' AND kq.started_at IS NOT NULL 
               THEN TIMESTAMPDIFF(MINUTE, kq.started_at, NOW())
               ELSE NULL
             END as prep_time_elapsed,
             CASE 
               WHEN kq.status = 'preparing' AND kq.started_at IS NOT NULL 
               AND TIMESTAMPDIFF(MINUTE, kq.started_at, NOW()) > kq.estimated_prep_time
               THEN true
               ELSE false
             END as is_overdue,
             inv.current_stock, inv.min_stock_threshold,
             CASE 
               WHEN inv.current_stock <= inv.min_stock_threshold THEN true
               ELSE false
             END as low_stock_warning
      FROM kitchen_queue kq
      LEFT JOIN orders o ON kq.order_id = o.id
      LEFT JOIN order_items oi ON kq.order_item_id = oi.id
      LEFT JOIN food_items fi ON oi.food_item_id = fi.id
      LEFT JOIN tables t ON o.table_id = t.id
      LEFT JOIN users u ON o.waiter_id = u.id
      LEFT JOIN food_inventory inv ON fi.id = inv.food_item_id
      WHERE ${whereClause}
      ORDER BY ${orderByClause}
      LIMIT ${limitInt} OFFSET ${offsetInt}
    `;
    
    const queueItems = await query(queueQuery, values);
    
    // Get queue statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_items,
        SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as queued,
        SUM(CASE WHEN status = 'preparing' THEN 1 ELSE 0 END) as preparing,
        SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) as ready,
        SUM(CASE WHEN priority = 2 THEN 1 ELSE 0 END) as urgent,
        SUM(CASE WHEN priority = 1 THEN 1 ELSE 0 END) as high_priority_count,
        SUM(CASE WHEN is_overdue = true THEN 1 ELSE 0 END) as overdue,
        AVG(TIMESTAMPDIFF(MINUTE, created_at, COALESCE(completed_at, NOW()))) as avg_completion_time
      FROM (
        SELECT kq.*, 
               CASE 
                 WHEN kq.status = 'preparing' AND kq.started_at IS NOT NULL 
                 AND TIMESTAMPDIFF(MINUTE, kq.started_at, NOW()) > kq.estimated_prep_time
                 THEN true
                 ELSE false
               END as is_overdue
        FROM kitchen_queue kq
        LEFT JOIN orders o ON kq.order_id = o.id
        WHERE ${whereClause}
      ) as filtered_queue
    `;
    
    const stats = await query(statsQuery, values);
    
    res.json({
      queue: queueItems,
      stats: stats[0],
      pagination: {
        page: parseInt(page),
        limit: limitInt,
        total: stats[0].total_items
      }
    });
    
  } catch (error) {
    console.error('Get kitchen queue error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch kitchen queue',
      code: 'KITCHEN_QUEUE_ERROR'
    });
  }
});

// Get kitchen queue item by ID
router.get('/:id', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    
    const item = await findOne('kitchen_queue', { id });
    
    if (!item) {
      return res.status(404).json({ error: 'Kitchen queue item not found' });
    }
    
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
      // Keep prep time compatible with DB check constraint (> 0)
      actualPrepTime = Math.max(1, Math.floor((now - new Date(queueItem.started_at)) / 60000)); // in minutes
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
    const orderItemsResult = await query(
      'SELECT COUNT(*) as active_count FROM order_items WHERE order_id = ? AND status NOT IN ("cancelled", "ready")',
      [queueItem.order_id]
    );
    
    if (orderItemsResult[0].active_count === 0) {
      await update('orders', {
        status: 'cancelled',
        updated_at: new Date()
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

module.exports = router;

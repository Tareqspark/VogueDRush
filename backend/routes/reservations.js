const express = require('express');
const { findOne, findMany, insert, update, remove, transaction } = require('../config/database');
const { requireRole, scopeBranch } = require('../middleware/auth');
const { validateReservation, validateId } = require('../middleware/validation');
const { logManualAudit } = require('../middleware/audit');

const router = express.Router();

// Get all reservations with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      status, 
      start_date, 
      end_date,
      customer_phone,
      table_id 
    } = req.query;
    
    const limitInt = parseInt(limit) || 50;
    const offsetInt = (parseInt(page) - 1) * limitInt;
    let whereClause = '1=1';
    let values = [];

    if (req.scopedBranchId) {
      whereClause += ' AND r.branch_id = ?';
      values.push(req.scopedBranchId);
    }

    if (status) {
      whereClause += ' AND r.status = ?';
      values.push(status);
    }
    
    if (start_date) {
      whereClause += ' AND r.reservation_date >= ?';
      values.push(start_date);
    }
    
    if (end_date) {
      whereClause += ' AND r.reservation_date <= ?';
      values.push(end_date);
    }
    
    if (customer_phone) {
      whereClause += ' AND r.customer_phone LIKE ?';
      values.push(`%${customer_phone}%`);
    }
    
    if (table_id) {
      whereClause += ' AND r.table_id = ?';
      values.push(table_id);
    }
    
    const { query } = require('../config/database');
    
    // Get reservations with joins
    const reservationsQuery = `
      SELECT r.*, u.username as created_by_name, u.full_name as created_by_full_name,
             t.table_number, t.location as table_location,
             o.order_number as pre_order_number
      FROM reservations r
      LEFT JOIN users u ON r.created_by = u.id
      LEFT JOIN tables t ON r.table_id = t.id
      LEFT JOIN orders o ON r.pre_order_id = o.id
      WHERE ${whereClause}
      ORDER BY r.reservation_date ASC, r.reservation_time ASC
      LIMIT ? OFFSET ?
    `;
    
    const reservations = await query(reservationsQuery, [...values, limitInt, offsetInt]);
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM reservations r WHERE ${whereClause}`;
    const countResult = await query(countQuery, values);
    const total = countResult[0].total;
    
    res.json({
      reservations,
      pagination: {
        page: parseInt(page),
        limit: limitInt,
        total,
        pages: Math.ceil(total / limitInt)
      }
    });
    
  } catch (error) {
    console.error('Get reservations error:', error);
    res.status(500).json({ error: 'Failed to fetch reservations' });
  }
});

// Get reservation by ID
router.get('/:id', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { query } = require('../config/database');
    
    // Get reservation details
    const reservationQuery = `
      SELECT r.*, u.username as created_by_name, u.full_name as created_by_full_name,
             t.table_number, t.location as table_location,
             o.order_number as pre_order_number
      FROM reservations r
      LEFT JOIN users u ON r.created_by = u.id
      LEFT JOIN tables t ON r.table_id = t.id
      LEFT JOIN orders o ON r.pre_order_id = o.id
      WHERE r.id = ?
    `;
    
    const reservationResult = await query(reservationQuery, [id]);
    const reservation = reservationResult[0];
    
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    
    // Get pre-order details if exists
    if (reservation.pre_order_id) {
      const preOrderQuery = `
        SELECT oi.*, fi.name as item_name
        FROM order_items oi
        LEFT JOIN food_items fi ON oi.food_item_id = fi.id
        WHERE oi.order_id = ?
        ORDER BY oi.created_at
      `;
      
      const preOrderItems = await query(preOrderQuery, [reservation.pre_order_id]);
      reservation.pre_order_items = preOrderItems;
    } else {
      reservation.pre_order_items = [];
    }
    
    res.json(reservation);
    
  } catch (error) {
    console.error('Get reservation error:', error);
    res.status(500).json({ error: 'Failed to fetch reservation' });
  }
});

// Create new reservation
router.post('/', validateReservation, async (req, res) => {
  try {
    const { 
      customer_name, 
      customer_phone, 
      customer_email, 
      party_size, 
      reservation_date, 
      reservation_time, 
      table_id,
      special_requests,
      pre_order_items 
    } = req.body;
    
    // Validate reservation date and time
    const reservationDateTime = new Date(`${reservation_date}T${reservation_time}`);
    const now = new Date();
    
    if (reservationDateTime < now) {
      return res.status(400).json({ error: 'Reservation cannot be in the past' });
    }
    
    // Check if table is available at requested time
    if (table_id) {
      const table = await findOne('tables', { id: table_id });
      if (!table) {
        return res.status(400).json({ error: 'Table not found' });
      }
      
      if (table.capacity < party_size) {
        return res.status(400).json({ 
          error: 'Table capacity insufficient for party size',
          table_capacity: table.capacity,
          party_size
        });
      }
      
      // Check for conflicting reservations
      const { query } = require('../config/database');
      const conflictQuery = `
        SELECT COUNT(*) as count
        FROM reservations
        WHERE table_id = ? 
          AND reservation_date = ?
          AND status IN ('pending', 'confirmed')
          AND (
            (reservation_time <= ? AND ADDTIME(reservation_time, '02:00:00') > ?) OR
            (reservation_time < ADDTIME(?, '02:00:00') AND ADDTIME(reservation_time, '02:00:00') >= ?)
          )
      `;
      
      const conflictResult = await query(conflictQuery, [
        table_id, reservation_date, reservation_time, reservation_time, reservation_time, reservation_time
      ]);
      
      if (conflictResult[0].count > 0) {
        return res.status(400).json({ error: 'Table already reserved at requested time' });
      }
    }
    
    // Create reservation in transaction
    const result = await transaction(async (connection) => {
      let preOrderId = null;
      
      // Create pre-order if items are provided
      if (pre_order_items && pre_order_items.length > 0) {
        // Calculate totals for pre-order
        let subtotal = 0;
        let totalVat = 0;
        
        for (const item of pre_order_items) {
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
        
        // Create pre-order
        const orderData = {
          order_number: `PRE${Date.now()}`,
          order_type: 'dine_in',
          table_id: table_id || null,
          waiter_id: req.user.id,
          customer_name,
          customer_phone,
          status: 'pending',
          subtotal,
          vat_amount: totalVat,
          service_charge: 0,
          discount_amount: 0,
          total_amount: subtotal + totalVat,
          special_requests
        };
        
        const [orderResult] = await connection.execute(
          `INSERT INTO orders (${Object.keys(orderData).join(', ')}) 
           VALUES (${Object.keys(orderData).map(() => '?').join(', ')})`,
          Object.values(orderData)
        );
        
        preOrderId = orderResult.insertId;
        
        // Add order items
        for (const item of pre_order_items) {
          const foodItem = await findOne('food_items', { id: item.food_item_id });
          const unitPrice = foodItem.promotional_price || foodItem.price;
          const itemTotal = unitPrice * item.quantity;
          
          const itemData = {
            order_id: preOrderId,
            food_item_id: item.food_item_id,
            quantity: item.quantity,
            unit_price: unitPrice,
            total_price: itemTotal,
            special_instructions: item.special_instructions || null,
            status: 'pending'
          };
          
          await connection.execute(
            `INSERT INTO order_items (${Object.keys(itemData).join(', ')}) 
             VALUES (${Object.keys(itemData).map(() => '?').join(', ')})`,
            Object.values(itemData)
          );
        }
      }
      
      // Create reservation
      const reservationData = {
        customer_name,
        customer_phone,
        customer_email: customer_email || null,
        party_size: parseInt(party_size),
        reservation_date,
        reservation_time,
        table_id: table_id || null,
        branch_id: req.scopedBranchId || parseInt(req.headers['x-branch-id']) || 1,
        status: 'pending',
        special_requests: special_requests || null,
        pre_order_id: preOrderId,
        created_by: req.user.id
      };
      
      const [reservationResult] = await connection.execute(
        `INSERT INTO reservations (${Object.keys(reservationData).join(', ')}) 
         VALUES (${Object.keys(reservationData).map(() => '?').join(', ')})`,
        Object.values(reservationData)
      );
      
      return {
        reservationId: reservationResult.insertId,
        preOrderId
      };
    });
    
    // Get created reservation
    const createdReservation = await findOne('reservations', { id: result.reservationId });
    
    // Emit real-time update
    const io = req.app.get('io');
    io.emit('new-reservation', { reservation: createdReservation });
    
    // Log audit
    await logManualAudit(
      req.user.id,
      'create',
      'reservations',
      result.reservationId,
      null,
      { 
        customer_name, 
        party_size, 
        reservation_date, 
        reservation_time,
        table_id,
        has_pre_order: !!result.preOrderId
      },
      req.ip,
      req.headers['user-agent']
    );
    
    res.status(201).json({
      message: 'Reservation created successfully',
      reservation: createdReservation
    });
    
  } catch (error) {
    console.error('Create reservation error:', error);
    res.status(500).json({ error: error.message || 'Failed to create reservation' });
  }
});

// Update reservation
router.put('/:id', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      customer_name, 
      customer_phone, 
      customer_email, 
      party_size, 
      reservation_date, 
      reservation_time, 
      table_id,
      special_requests,
      status 
    } = req.body;
    
    // Check if reservation exists
    const existingReservation = await findOne('reservations', { id });
    if (!existingReservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    
    // Check if reservation can be modified
    if (existingReservation.status === 'completed' || existingReservation.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot modify completed or cancelled reservation' });
    }
    
    // Validate date/time changes
    if (reservation_date && reservation_time) {
      const newDateTime = new Date(`${reservation_date}T${reservation_time}`);
      const now = new Date();
      
      if (newDateTime < now) {
        return res.status(400).json({ error: 'Reservation cannot be in the past' });
      }
    }
    
    // Validate table changes
    if (table_id && table_id !== existingReservation.table_id) {
      const table = await findOne('tables', { id: table_id });
      if (!table) {
        return res.status(400).json({ error: 'Table not found' });
      }
      
      if (party_size && table.capacity < party_size) {
        return res.status(400).json({ 
          error: 'Table capacity insufficient for party size',
          table_capacity: table.capacity,
          party_size
        });
      }
      
      // Check for conflicts with new table/time
      const checkDate = reservation_date || existingReservation.reservation_date;
      const checkTime = reservation_time || existingReservation.reservation_time;
      
      const { query } = require('../config/database');
      const conflictQuery = `
        SELECT COUNT(*) as count
        FROM reservations
        WHERE table_id = ? 
          AND reservation_date = ?
          AND status IN ('pending', 'confirmed')
          AND id != ?
          AND (
            (reservation_time <= ? AND ADDTIME(reservation_time, '02:00:00') > ?) OR
            (reservation_time < ADDTIME(?, '02:00:00') AND ADDTIME(reservation_time, '02:00:00') >= ?)
          )
      `;
      
      const conflictResult = await query(conflictQuery, [
        table_id, checkDate, id, checkTime, checkTime, checkTime, checkTime
      ]);
      
      if (conflictResult[0].count > 0) {
        return res.status(400).json({ error: 'Table already reserved at requested time' });
      }
    }
    
    const updateData = { updated_at: new Date() };
    
    if (customer_name !== undefined) updateData.customer_name = customer_name;
    if (customer_phone !== undefined) updateData.customer_phone = customer_phone;
    if (customer_email !== undefined) updateData.customer_email = customer_email;
    if (party_size !== undefined) updateData.party_size = parseInt(party_size);
    if (reservation_date !== undefined) updateData.reservation_date = reservation_date;
    if (reservation_time !== undefined) updateData.reservation_time = reservation_time;
    if (table_id !== undefined) updateData.table_id = table_id;
    if (special_requests !== undefined) updateData.special_requests = special_requests;
    if (status !== undefined) updateData.status = status;
    
    await update('reservations', updateData, { id });
    
    // Get updated reservation
    const updatedReservation = await findOne('reservations', { id });
    
    // Emit real-time update
    const io = req.app.get('io');
    io.emit('reservation-update', { 
      reservationId: parseInt(id), 
      reservation: updatedReservation,
      updatedBy: req.user.username 
    });
    
    // Log audit
    await logManualAudit(
      req.user.id,
      'update',
      'reservations',
      parseInt(id),
      existingReservation,
      updateData,
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({
      message: 'Reservation updated successfully',
      reservation: updatedReservation
    });
    
  } catch (error) {
    console.error('Update reservation error:', error);
    res.status(500).json({ error: 'Failed to update reservation' });
  }
});

// Update reservation status
router.patch('/:id/status', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    // Check if reservation exists
    const reservation = await findOne('reservations', { id });
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    
    const oldStatus = reservation.status;
    
    // Validate status transitions
    if (oldStatus === 'cancelled' && status !== 'pending') {
      return res.status(400).json({ error: 'Cannot change status from cancelled' });
    }
    
    if (oldStatus === 'completed' && status !== 'cancelled') {
      return res.status(400).json({ error: 'Cannot change status from completed' });
    }
    
    // Update reservation status
    await update('reservations', { 
      status, 
      updated_at: new Date()
    }, { id });
    
    // If confirming reservation, update table status
    if (status === 'confirmed' && reservation.table_id) {
      await update('tables', { status: 'reserved' }, { id: reservation.table_id });
    }
    
    // If cancelling or completing, free up the table
    if ((status === 'cancelled' || status === 'completed') && reservation.table_id) {
      await update('tables', { status: 'available' }, { id: reservation.table_id });
    }
    
    // Emit real-time update
    const io = req.app.get('io');
    io.emit('reservation-status-update', { 
      reservationId: parseInt(id), 
      oldStatus, 
      newStatus: status,
      updatedBy: req.user.username 
    });
    
    // Log audit
    await logManualAudit(
      req.user.id,
      'update_status',
      'reservations',
      parseInt(id),
      { status: oldStatus },
      { status, reason },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({
      message: 'Reservation status updated successfully',
      old_status: oldStatus,
      new_status: status
    });
    
  } catch (error) {
    console.error('Update reservation status error:', error);
    res.status(500).json({ error: 'Failed to update reservation status' });
  }
});

// Link an order to a reservation
router.patch('/:id/link-order', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const { order_id } = req.body;

    if (!order_id) return res.status(400).json({ error: 'order_id is required' });

    const reservation = await findOne('reservations', { id });
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });

    await update('reservations', { pre_order_id: order_id, updated_at: new Date() }, { id });

    res.json({ message: 'Order linked to reservation' });
  } catch (error) {
    console.error('Link order error:', error);
    res.status(500).json({ error: 'Failed to link order' });
  }
});

// Delete reservation
router.delete('/:id', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if reservation exists
    const existingReservation = await findOne('reservations', { id });
    if (!existingReservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    
    // Check if reservation can be deleted
    if (existingReservation.status === 'completed') {
      return res.status(400).json({ error: 'Cannot delete completed reservation' });
    }
    
    // Free up table if reserved
    if (existingReservation.table_id && existingReservation.status === 'confirmed') {
      await update('tables', { status: 'available' }, { id: existingReservation.table_id });
    }
    
    // Cancel associated pre-order if exists
    if (existingReservation.pre_order_id) {
      await update('orders', { status: 'cancelled' }, { id: existingReservation.pre_order_id });
    }
    
    // Soft delete by setting status to cancelled
    await update('reservations', { 
      status: 'cancelled', 
      updated_at: new Date()
    }, { id });
    
    // Emit real-time update
    const io = req.app.get('io');
    io.emit('reservation-deleted', { 
      reservationId: parseInt(id),
      deletedBy: req.user.username 
    });
    
    // Log audit
    await logManualAudit(
      req.user.id,
      'delete',
      'reservations',
      parseInt(id),
      existingReservation,
      { status: 'cancelled', deleted_at: new Date() },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({ message: 'Reservation deleted successfully' });
    
  } catch (error) {
    console.error('Delete reservation error:', error);
    res.status(500).json({ error: 'Failed to delete reservation' });
  }
});

// Get today's reservations
router.get('/today/list', scopeBranch, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { query } = require('../config/database');
    
    const branchFilter = req.scopedBranchId ? `AND r.branch_id = ${req.scopedBranchId}` : '';
    const reservationsQuery = `
      SELECT r.*, t.table_number, t.location as table_location,
             u.username as created_by_name
      FROM reservations r
      LEFT JOIN tables t ON r.table_id = t.id
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.reservation_date = ? ${branchFilter}
      ORDER BY r.reservation_time ASC
    `;

    const reservations = await query(reservationsQuery, [today]);
    
    res.json({
      date: today,
      reservations
    });
    
  } catch (error) {
    console.error('Get today reservations error:', error);
    res.status(500).json({ error: 'Failed to fetch today reservations' });
  }
});

// Get reservation statistics
router.get('/stats/overview', scopeBranch, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    const { query } = require('../config/database');
    
    let dateFilter = '';
    let values = [];
    const branchClause = req.scopedBranchId ? `AND branch_id = ${req.scopedBranchId}` : '';

    if (start_date && end_date) {
      dateFilter = `WHERE reservation_date BETWEEN ? AND ? ${branchClause}`;
      values = [start_date, end_date];
    } else {
      dateFilter = branchClause ? `WHERE ${branchClause.slice(4)}` : '';
    }

    // Get reservation counts by status
    const statusStats = await query(`
      SELECT status, COUNT(*) as count,
             AVG(party_size) as avg_party_size
      FROM reservations
      ${dateFilter}
      GROUP BY status
    `, values);
    
    // Get daily reservation trends
    const dailyStats = await query(`
      SELECT reservation_date, COUNT(*) as reservation_count,
             SUM(party_size) as total_guests
      FROM reservations 
      ${dateFilter}
      GROUP BY reservation_date
      ORDER BY reservation_date DESC
      LIMIT 30
    `, values);
    
    // Get time slot distribution
    const timeStats = await query(`
      SELECT 
        CASE 
          WHEN HOUR(reservation_time) BETWEEN 11 AND 14 THEN 'Lunch (11AM-2PM)'
          WHEN HOUR(reservation_time) BETWEEN 17 AND 21 THEN 'Dinner (5PM-9PM)'
          ELSE 'Other'
        END as time_slot,
        COUNT(*) as count
      FROM reservations 
      ${dateFilter}
      GROUP BY time_slot
      ORDER BY count DESC
    `, values);
    
    res.json({
      statusStats,
      dailyStats,
      timeStats
    });
    
  } catch (error) {
    console.error('Get reservation stats error:', error);
    res.status(500).json({ error: 'Failed to fetch reservation statistics' });
  }
});

module.exports = router;

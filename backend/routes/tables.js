const express = require('express');
const { findOne, findMany, insert, update, remove, query } = require('../config/database');
const { requireRole, requireAdmin } = require('../middleware/auth');
const { validateTable, validateId } = require('../middleware/validation');
const { logManualAudit } = require('../middleware/audit');

const router = express.Router();

// Get all tables with optional filtering
router.get('/', async (req, res) => {
  try {
    const { status, location, page = 1, limit = 100 } = req.query;
    const limitInt = parseInt(limit) || 50;
    const offsetInt = (parseInt(page) - 1) * limitInt;
    
    let whereClause = '1=1';
    let values = [];
    
    if (status) {
      whereClause += ' AND status = ?';
      values.push(status);
    }
    
    if (location) {
      whereClause += ' AND location LIKE ?';
      values.push(`%${location}%`);
    }
    
    const { query } = require('../config/database');
    const tables = await query(
      `SELECT * FROM tables WHERE ${whereClause} ORDER BY location ASC, table_number ASC LIMIT ? OFFSET ?`,
      [...values, limitInt, offsetInt]
    );
    
    // Get total count
    const countResult = await query(`SELECT COUNT(*) as total FROM tables WHERE ${whereClause}`, values);
    const total = countResult[0].total;
    
    // Get current orders for each table
    for (const table of tables) {
      if (table.status === 'occupied') {
        const activeOrders = await query(
          `SELECT id, order_number, status, created_at, total_amount FROM orders 
           WHERE table_id = ? AND status IN ('pending', 'preparing', 'ready') 
           ORDER BY created_at DESC LIMIT 1`,
          [table.id]
        );
        table.current_order = activeOrders[0] || null;
      } else {
        table.current_order = null;
      }
    }
    
    res.json({
      tables,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Get tables error:', error);
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
});

// Get table by ID with current order info
router.get('/:id', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    
    const table = await findOne('tables', { id });
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    // Get current order if table is occupied
    if (table.status === 'occupied') {
      const { query } = require('../config/database');
      const orderQuery = `
        SELECT o.*, u.username as waiter_name, u.full_name as waiter_full_name
        FROM orders o
        LEFT JOIN users u ON o.waiter_id = u.id
        WHERE o.table_id = ? AND o.status IN ('pending', 'preparing', 'ready')
        ORDER BY o.created_at DESC
        LIMIT 1
      `;
      
      const orderResult = await query(orderQuery, [id]);
      table.current_order = orderResult[0] || null;
      
      // Get order items if there's a current order
      if (table.current_order) {
        const itemsQuery = `
          SELECT oi.*, fi.name as item_name
          FROM order_items oi
          LEFT JOIN food_items fi ON oi.food_item_id = fi.id
          WHERE oi.order_id = ?
          ORDER BY oi.created_at
        `;
        
        const items = await query(itemsQuery, [table.current_order.id]);
        table.current_order.items = items;
      }
    } else {
      table.current_order = null;
    }
    
    // Get today's reservation for this table
    const todayReservation = await findOne(
      'reservations',
      { 
        table_id: id, 
        reservation_date: new Date().toISOString().split('T')[0],
        status: 'confirmed'
      },
      '*',
      'reservation_time ASC'
    );
    
    table.today_reservation = todayReservation;
    
    res.json(table);
    
  } catch (error) {
    console.error('Get table error:', error);
    res.status(500).json({ error: 'Failed to fetch table' });
  }
});

// Create new table (admin only)
router.post('/', requireAdmin, validateTable, async (req, res) => {
  try {
    const { table_number, capacity, location } = req.body;
    
    // Check if table number already exists
    const existingTable = await findOne('tables', { table_number });
    if (existingTable) {
      return res.status(400).json({ error: 'Table number already exists' });
    }
    
    const tableData = {
      table_number,
      capacity: parseInt(capacity),
      location: location || null,
      status: 'available'
    };
    
    const newTable = await insert('tables', tableData);
    
    // Log audit
    await logManualAudit(
      req.user.id,
      'create',
      'tables',
      newTable.id,
      null,
      tableData,
      req.ip,
      req.headers['user-agent']
    );
    
    res.status(201).json({
      message: 'Table created successfully',
      table: newTable
    });
    
  } catch (error) {
    console.error('Create table error:', error);
    res.status(500).json({ error: 'Failed to create table' });
  }
});

// Update table (admin only)
router.put('/:id', requireAdmin, validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const { table_number, capacity, location, status } = req.body;
    
    // Check if table exists
    const existingTable = await findOne('tables', { id });
    if (!existingTable) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    // Check if table number is being changed and if new number already exists
    if (table_number && table_number !== existingTable.table_number) {
      const duplicateTable = await findOne('tables', { table_number, id: { $ne: id } });
      if (duplicateTable) {
        return res.status(400).json({ error: 'Table number already exists' });
      }
    }
    
    // Validate status change
    if (status && status !== existingTable.status) {
      if (status === 'available' && existingTable.status === 'occupied') {
        // Check if table has active orders
        const { query } = require('../config/database');
        const activeOrderResult = await query(
          'SELECT COUNT(*) as count FROM orders WHERE table_id = ? AND status IN ("pending", "preparing", "ready")',
          [id]
        );
        
        if (activeOrderResult[0].count > 0) {
          return res.status(400).json({ 
            error: 'Cannot set table to available while there are active orders',
            active_orders: activeOrderResult[0].count
          });
        }
      }
    }
    
    const updateData = { updated_at: new Date() };
    
    if (table_number !== undefined) updateData.table_number = table_number;
    if (capacity !== undefined) updateData.capacity = parseInt(capacity);
    if (location !== undefined) updateData.location = location;
    if (status !== undefined) updateData.status = status;
    
    await update('tables', updateData, { id });
    
    // Get updated table
    const updatedTable = await findOne('tables', { id });
    
    // Log audit
    await logManualAudit(
      req.user.id,
      'update',
      'tables',
      parseInt(id),
      existingTable,
      updateData,
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({
      message: 'Table updated successfully',
      table: updatedTable
    });
    
  } catch (error) {
    console.error('Update table error:', error);
    res.status(500).json({ error: 'Failed to update table' });
  }
});

// Update table status
router.patch('/:id/status', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    
    const validStatuses = ['available', 'occupied', 'reserved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    // Check if table exists
    const existingTable = await findOne('tables', { id });
    if (!existingTable) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    const oldStatus = existingTable.status;
    
    // Validate status change logic
    if (status === 'available' && oldStatus === 'occupied') {
      // Check if table has active orders
      const { query } = require('../config/database');
      const activeOrderResult = await query(
        'SELECT COUNT(*) as count FROM orders WHERE table_id = ? AND status IN ("pending", "preparing", "ready")',
        [id]
      );
      
      if (activeOrderResult[0].count > 0) {
        return res.status(400).json({ 
          error: 'Cannot set table to available while there are active orders',
          active_orders: activeOrderResult[0].count
        });
      }
    }
    
    // Update table status
    await update('tables', { 
      status, 
      updated_at: new Date() 
    }, { id });
    
    // Emit real-time update
    const io = req.app.get('io');
    io.emit('table-status-update', { 
      tableId: parseInt(id), 
      oldStatus, 
      newStatus: status,
      updatedBy: req.user.username 
    });
    
    // Log audit
    await logManualAudit(
      req.user.id,
      'update_status',
      'tables',
      parseInt(id),
      { status: oldStatus },
      { status, reason },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({
      message: 'Table status updated successfully',
      old_status: oldStatus,
      new_status: status
    });
    
  } catch (error) {
    console.error('Update table status error:', error);
    res.status(500).json({ error: 'Failed to update table status' });
  }
});

// Delete table (admin only)
router.delete('/:id', requireAdmin, validateId, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if table exists
    const existingTable = await findOne('tables', { id });
    if (!existingTable) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    // Check if table has active orders
    const { query } = require('../config/database');
    const activeOrderResult = await query(
      'SELECT COUNT(*) as count FROM orders WHERE table_id = ? AND status IN ("pending", "preparing", "ready")',
      [id]
    );
    
    if (activeOrderResult[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete table with active orders',
        active_orders: activeOrderResult[0].count
      });
    }
    
    // Check if table has future reservations
    const reservationResult = await query(
      'SELECT COUNT(*) as count FROM reservations WHERE table_id = ? AND reservation_date >= CURDATE() AND status IN ("pending", "confirmed")',
      [id]
    );
    
    if (reservationResult[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete table with future reservations',
        future_reservations: reservationResult[0].count
      });
    }
    
    // Soft delete by setting status to unavailable (or you could actually delete)
    await update('tables', { 
      status: 'maintenance', 
      updated_at: new Date() 
    }, { id });
    
    // Log audit
    await logManualAudit(
      req.user.id,
      'delete',
      'tables',
      parseInt(id),
      existingTable,
      { status: 'maintenance', deleted_at: new Date() },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({ message: 'Table deleted successfully' });
    
  } catch (error) {
    console.error('Delete table error:', error);
    res.status(500).json({ error: 'Failed to delete table' });
  }
});

// Get available tables for a specific date/time
router.get('/available/:date/:time', async (req, res) => {
  try {
    const { date, time } = req.params;
    const { party_size, duration = 2 } = req.query; // duration in hours
    
    // Validate date and time format
    const reservationDateTime = new Date(`${date}T${time}`);
    if (isNaN(reservationDateTime.getTime())) {
      return res.status(400).json({ error: 'Invalid date or time format' });
    }
    
    const endTime = new Date(reservationDateTime.getTime() + duration * 60 * 60 * 1000);
    
    const { query } = require('../config/database');
    
    // Get tables that are not available due to existing reservations
    const unavailableTablesQuery = `
      SELECT DISTINCT t.id
      FROM tables t
      JOIN reservations r ON t.id = r.table_id
      WHERE r.status IN ('pending', 'confirmed')
        AND r.reservation_date = ?
        AND (
          (r.reservation_time <= ? AND ADDTIME(r.reservation_time, '02:00:00') > ?) OR
          (r.reservation_time < ADDTIME(?, '02:00:00') AND ADDTIME(r.reservation_time, '02:00:00') >= ?)
        )
    `;
    
    const unavailableResult = await query(unavailableTablesQuery, [
      date, time, time, time, time
    ]);
    
    const unavailableTableIds = unavailableResult.map(row => row.id);
    
    // Get available tables
    let whereClause = 'status = "available"';
    const values = [];
    
    if (unavailableTableIds.length > 0) {
      whereClause += ' AND id NOT IN (' + unavailableTableIds.map(() => '?').join(',') + ')';
      values.push(...unavailableTableIds);
    }
    
    if (party_size) {
      whereClause += ' AND capacity >= ?';
      values.push(parseInt(party_size));
    }
    
    const availableTables = await findMany(
      'tables',
      whereClause,
      '*',
      'location ASC, capacity ASC, table_number ASC',
      values.join(' ')
    );
    
    res.json({
      date,
      time,
      party_size: party_size || null,
      available_tables: availableTables,
      total_available: availableTables.length
    });
    
  } catch (error) {
    console.error('Get available tables error:', error);
    res.status(500).json({ error: 'Failed to fetch available tables' });
  }
});

// Get table statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const { query } = require('../config/database');
    
    // Get table counts by status
    const statusStats = await query(`
      SELECT status, COUNT(*) as count,
             SUM(capacity) as total_capacity
      FROM tables
      GROUP BY status
    `);
    
    // Get location statistics
    const locationStats = await query(`
      SELECT location, COUNT(*) as table_count,
             SUM(capacity) as total_capacity,
             SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available_count,
             SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied_count,
             SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) as reserved_count
      FROM tables
      GROUP BY location
      ORDER BY location
    `);
    
    // Get occupancy rate for today
    const todayOccupancy = await query(`
      SELECT 
        COUNT(*) as total_tables,
        SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied_tables,
        ROUND(
          (SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) * 100.0) / 
          NULLIF(COUNT(*), 0), 
          2
        ) as occupancy_rate
      FROM tables
    `);
    
    res.json({
      statusStats,
      locationStats,
      todayOccupancy: todayOccupancy[0]
    });
    
  } catch (error) {
    console.error('Get table stats error:', error);
    res.status(500).json({ error: 'Failed to fetch table statistics' });
  }
});

module.exports = router;

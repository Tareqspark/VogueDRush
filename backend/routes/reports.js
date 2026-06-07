const express = require('express');
const { findOne, findMany, query } = require('../config/database');
const { requireRole } = require('../middleware/auth');
const { validateDateRange } = require('../middleware/validation');

const router = express.Router();

// Sales reports - daily, weekly, monthly
router.get('/sales', validateDateRange, async (req, res) => {
  try {
    const { start_date, end_date, period = 'daily' } = req.query;
    
    let dateFormat = '';
    let groupBy = '';
    
    switch (period) {
      case 'daily':
        dateFormat = '%Y-%m-%d';
        groupBy = 'DATE(o.created_at)';
        break;
      case 'weekly':
        dateFormat = '%Y-%u';
        groupBy = 'YEARWEEK(o.created_at)';
        break;
      case 'monthly':
        dateFormat = '%Y-%m';
        groupBy = 'DATE_FORMAT(o.created_at, "%Y-%m")';
        break;
      default:
        return res.status(400).json({ error: 'Invalid period. Use daily, weekly, or monthly' });
    }
    
    let dateFilter = '';
    let values = [];
    
    if (start_date && end_date) {
      dateFilter = 'WHERE DATE(o.created_at) BETWEEN ? AND ?';
      values = [start_date, end_date];
    }
    
    const salesQuery = `
      SELECT 
        ${groupBy} as period,
        COUNT(*) as order_count,
        SUM(o.total_amount) as revenue,
        AVG(o.total_amount) as avg_order_value,
        SUM(o.subtotal) as subtotal,
        SUM(o.vat_amount) as total_vat,
        SUM(o.service_charge) as total_service_charge,
        SUM(o.discount_amount) as total_discount,
        COUNT(CASE WHEN o.order_type = 'dine_in' THEN 1 END) as dine_in_count,
        COUNT(CASE WHEN o.order_type = 'delivery' THEN 1 END) as delivery_count,
        COUNT(CASE WHEN o.order_type = 'direct' THEN 1 END) as direct_count
      FROM orders o
      WHERE o.status = 'done' ${dateFilter ? 'AND ' + dateFilter.substring(6) : ''}
      GROUP BY ${groupBy}
      ORDER BY period DESC
      LIMIT 100
    `;
    
    const salesData = await query(salesQuery, values);
    
    // Calculate totals
    const totals = salesData.reduce((acc, row) => ({
      total_orders: acc.total_orders + parseInt(row.order_count),
      total_revenue: acc.total_revenue + parseFloat(row.revenue),
      total_vat: acc.total_vat + parseFloat(row.total_vat),
      total_service_charge: acc.total_service_charge + parseFloat(row.total_service_charge),
      total_discount: acc.total_discount + parseFloat(row.total_discount)
    }), {
      total_orders: 0,
      total_revenue: 0,
      total_vat: 0,
      total_service_charge: 0,
      total_discount: 0
    });
    
    totals.avg_order_value = totals.total_orders > 0 ? totals.total_revenue / totals.total_orders : 0;
    
    res.json({
      period,
      sales_data: salesData,
      summary: totals
    });
    
  } catch (error) {
    console.error('Get sales report error:', error);
    res.status(500).json({ error: 'Failed to generate sales report' });
  }
});

// Category and item performance report
router.get('/menu-performance', validateDateRange, async (req, res) => {
  try {
    const { start_date, end_date, limit = 50 } = req.query;
    
    let dateFilter = '';
    let values = [];
    
    if (start_date && end_date) {
      dateFilter = 'AND DATE(o.created_at) BETWEEN ? AND ?';
      values = [start_date, end_date];
    }
    
    // Category performance
    const categoryQuery = `
      SELECT 
        fc.name as category_name,
        fc.icon as category_icon,
        COUNT(DISTINCT oi.order_id) as orders_count,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.total_price) as total_revenue,
        AVG(oi.total_price) as avg_item_revenue,
        COUNT(DISTINCT oi.food_item_id) as unique_items_sold
      FROM order_items oi
      JOIN food_items fi ON oi.food_item_id = fi.id
      JOIN food_categories fc ON fi.category_id = fc.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status IN ('done') ${dateFilter}
      GROUP BY fc.id, fc.name, fc.icon
      ORDER BY total_revenue DESC
    `;
    
    const categoryData = await query(categoryQuery, values);
    
    // Item performance
    const itemQuery = `
      SELECT 
        fi.id,
        fi.name as item_name,
        fc.name as category_name,
        COUNT(DISTINCT oi.order_id) as orders_count,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.total_price) as total_revenue,
        AVG(oi.unit_price) as avg_unit_price,
        AVG(oi.total_price) as avg_item_revenue,
        COUNT(CASE WHEN oi.status = 'cancelled' THEN 1 END) as cancelled_count
      FROM order_items oi
      JOIN food_items fi ON oi.food_item_id = fi.id
      JOIN food_categories fc ON fi.category_id = fc.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status IN ('done') ${dateFilter}
      GROUP BY fi.id, fi.name, fc.name
      ORDER BY total_revenue DESC
      LIMIT ?
    `;
    
    const itemData = await query(itemQuery, [...values, parseInt(limit)]);
    
    // Most profitable items
    const profitQuery = `
      SELECT 
        fi.name as item_name,
        fc.name as category_name,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.total_price) as total_revenue,
        SUM(oi.total_price * 0.7) as estimated_cost,
        SUM(oi.total_price) - SUM(oi.total_price * 0.7) as estimated_profit,
        ROUND((SUM(oi.total_price) - SUM(oi.total_price * 0.7)) / SUM(oi.total_price) * 100, 2) as profit_margin
      FROM order_items oi
      JOIN food_items fi ON oi.food_item_id = fi.id
      JOIN food_categories fc ON fi.category_id = fc.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status IN ('done') ${dateFilter}
      GROUP BY fi.id, fi.name, fc.name
      HAVING total_quantity > 0
      ORDER BY estimated_profit DESC
      LIMIT 20
    `;
    
    const profitData = await query(profitQuery, values);
    
    res.json({
      category_performance: categoryData,
      item_performance: itemData,
      most_profitable: profitData
    });
    
  } catch (error) {
    console.error('Get menu performance report error:', error);
    res.status(500).json({ error: 'Failed to generate menu performance report' });
  }
});

// User performance report (sales per staff)
router.get('/staff-performance', validateDateRange, async (req, res) => {
  try {
    const { start_date, end_date, user_id } = req.query;
    
    let dateFilter = '';
    let values = [];
    
    if (start_date && end_date) {
      dateFilter = 'AND DATE(o.created_at) BETWEEN ? AND ?';
      values = [start_date, end_date];
    }
    
    let userFilter = '';
    if (user_id) {
      userFilter = 'AND o.waiter_id = ?';
      values.push(user_id);
    }
    
    // Staff performance overview
    const staffQuery = `
      SELECT 
        u.id,
        u.username,
        u.full_name,
        u.role,
        COUNT(o.id) as total_orders,
        SUM(o.total_amount) as total_revenue,
        AVG(o.total_amount) as avg_order_value,
        COUNT(CASE WHEN o.order_type = 'dine_in' THEN 1 END) as dine_in_orders,
        COUNT(CASE WHEN o.order_type = 'delivery' THEN 1 END) as delivery_orders,
        COUNT(CASE WHEN o.order_type = 'direct' THEN 1 END) as direct_orders,
        COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END) as cancelled_orders,
        ROUND(COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END) * 100.0 / COUNT(o.id), 2) as cancellation_rate
      FROM users u
      LEFT JOIN orders o ON u.id = o.waiter_id
      WHERE u.is_active = 1 ${dateFilter} ${userFilter}
      GROUP BY u.id, u.username, u.full_name, u.role
      ORDER BY total_revenue DESC
    `;
    
    const staffData = await query(staffQuery, values);
    
    // Hourly performance for selected staff or overall
    const hourlyQuery = `
      SELECT 
        HOUR(o.created_at) as hour,
        COUNT(o.id) as order_count,
        SUM(o.total_amount) as revenue,
        AVG(o.total_amount) as avg_order_value
      FROM orders o
      WHERE o.status IN ('done') ${dateFilter} ${user_id ? 'AND o.waiter_id = ?' : ''}
      GROUP BY HOUR(o.created_at)
      ORDER BY hour
    `;
    
    const hourlyValues = user_id ? [...values, user_id] : values;
    const hourlyData = await query(hourlyQuery, hourlyValues);
    
    // Top performing items by staff
    const topItemsQuery = `
      SELECT 
        u.username,
        u.full_name,
        fi.name as item_name,
        COUNT(oi.id) as times_sold,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.total_price) as total_revenue
      FROM users u
      JOIN orders o ON u.id = o.waiter_id
      JOIN order_items oi ON o.id = oi.order_id
      JOIN food_items fi ON oi.food_item_id = fi.id
      WHERE o.status IN ('done') ${dateFilter} ${user_id ? 'AND o.waiter_id = ?' : ''}
      GROUP BY u.id, u.username, u.full_name, fi.name
      ORDER BY total_revenue DESC
      LIMIT 50
    `;
    
    const topItemsValues = user_id ? [...values, user_id] : values;
    const topItemsData = await query(topItemsQuery, topItemsValues);
    
    res.json({
      staff_performance: staffData,
      hourly_performance: hourlyData,
      top_items: topItemsData
    });
    
  } catch (error) {
    console.error('Get staff performance report error:', error);
    res.status(500).json({ error: 'Failed to generate staff performance report' });
  }
});

// Delivery reports
router.get('/delivery', validateDateRange, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let dateFilter = '';
    let values = [];
    
    if (start_date && end_date) {
      dateFilter = 'AND DATE(o.created_at) BETWEEN ? AND ?';
      values = [start_date, end_date];
    }
    
    // Delivery overview
    const deliveryQuery = `
      SELECT 
        COUNT(*) as total_deliveries,
        SUM(o.total_amount) as total_revenue,
        AVG(o.total_amount) as avg_order_value,
        SUM(dd.advance_payment) as total_advance_collected,
        SUM(dd.due_amount) as total_due_amount,
        COUNT(CASE WHEN dd.delivery_status = 'delivered' THEN 1 END) as delivered_count,
        COUNT(CASE WHEN dd.delivery_status = 'cancelled' THEN 1 END) as cancelled_count,
        COUNT(CASE WHEN dd.due_amount <= 0 THEN 1 END) as no_due_deliveries,
        AVG(TIMESTAMPDIFF(MINUTE, o.created_at, dt.actual_delivery_time)) as avg_delivery_time
      FROM orders o
      JOIN delivery_details dd ON o.id = dd.order_id
      LEFT JOIN delivery_tracking dt ON dt.delivery_detail_id = dd.id
      WHERE o.order_type = 'delivery' ${dateFilter}
    `;
    
    const deliveryOverview = await query(deliveryQuery, values);
    
    // Delivery status breakdown
    const statusQuery = `
      SELECT 
        dd.delivery_status,
        COUNT(*) as count,
        SUM(o.total_amount) as total_value,
        AVG(o.total_amount) as avg_value
      FROM orders o
      JOIN delivery_details dd ON o.id = dd.order_id
      WHERE o.order_type = 'delivery' ${dateFilter}
      GROUP BY dd.delivery_status
      ORDER BY count DESC
    `;
    
    const statusData = await query(statusQuery, values);
    
    // Delivery time analysis
    const timeAnalysisQuery = `
      SELECT 
        DATE(o.created_at) as delivery_date,
        COUNT(*) as delivery_count,
        AVG(TIMESTAMPDIFF(MINUTE, o.created_at, dt.actual_delivery_time)) as avg_delivery_time,
        MIN(TIMESTAMPDIFF(MINUTE, o.created_at, dt.actual_delivery_time)) as min_delivery_time,
        MAX(TIMESTAMPDIFF(MINUTE, o.created_at, dt.actual_delivery_time)) as max_delivery_time
      FROM orders o
      JOIN delivery_details dd ON o.id = dd.order_id
      LEFT JOIN delivery_tracking dt ON dt.delivery_detail_id = dd.id
      WHERE o.order_type = 'delivery' 
        AND dd.delivery_status = 'delivered'
        AND dt.actual_delivery_time IS NOT NULL
        ${dateFilter}
      GROUP BY DATE(o.created_at)
      ORDER BY delivery_date DESC
      LIMIT 30
    `;
    
    const timeAnalysisData = await query(timeAnalysisQuery, values);
    
    // Payment collection analysis
    const paymentQuery = `
      SELECT 
        COUNT(*) as total_deliveries,
        COUNT(CASE WHEN dd.advance_payment > 0 THEN 1 END) as with_advance_payment,
        SUM(dd.advance_payment) as total_advance_amount,
        AVG(dd.advance_payment) as avg_advance_amount,
        COUNT(CASE WHEN dd.due_amount <= 0 THEN 1 END) as no_due_deliveries,
        COUNT(CASE WHEN dd.due_amount > 0 AND dd.delivery_status = 'delivered' THEN 1 END) as delivered_with_due
      FROM orders o
      JOIN delivery_details dd ON o.id = dd.order_id
      WHERE o.order_type = 'delivery' ${dateFilter}
    `;
    
    const paymentData = await query(paymentQuery, values);
    
    res.json({
      overview: deliveryOverview[0],
      status_breakdown: statusData,
      time_analysis: timeAnalysisData,
      payment_analysis: paymentData[0]
    });
    
  } catch (error) {
    console.error('Get delivery report error:', error);
    res.status(500).json({ error: 'Failed to generate delivery report' });
  }
});

// Cancellation reports
router.get('/cancellations', validateDateRange, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let dateFilter = '';
    let values = [];
    
    if (start_date && end_date) {
      dateFilter = 'AND DATE(o.created_at) BETWEEN ? AND ?';
      values = [start_date, end_date];
    }
    
    // Cancellation overview
    const cancellationQuery = `
      SELECT 
        COUNT(*) as total_cancelled,
        SUM(o.total_amount) as lost_revenue,
        AVG(o.total_amount) as avg_cancelled_order_value,
        COUNT(CASE WHEN o.order_type = 'dine_in' THEN 1 END) as dine_in_cancelled,
        COUNT(CASE WHEN o.order_type = 'delivery' THEN 1 END) as delivery_cancelled,
        COUNT(CASE WHEN o.order_type = 'direct' THEN 1 END) as direct_cancelled
      FROM orders o
      WHERE o.status = 'cancelled' ${dateFilter}
    `;
    
    const cancellationOverview = await query(cancellationQuery, values);
    
    // Cancellation by order type
    const typeQuery = `
      SELECT 
        o.order_type,
        COUNT(*) as cancellation_count,
        SUM(o.total_amount) as lost_revenue,
        AVG(o.total_amount) as avg_order_value
      FROM orders o
      WHERE o.status = 'cancelled' ${dateFilter}
      GROUP BY o.order_type
      ORDER BY cancellation_count DESC
    `;
    
    const typeData = await query(typeQuery, values);
    
    // Kitchen item cancellations
    const kitchenCancellationQuery = `
      SELECT 
        fi.name as item_name,
        fc.name as category_name,
        COUNT(kq.id) as cancellation_count,
        SUM(oi.quantity) as total_quantity_cancelled,
        SUM(oi.total_price) as lost_revenue
      FROM kitchen_queue kq
      JOIN order_items oi ON kq.order_item_id = oi.id
      JOIN food_items fi ON oi.food_item_id = fi.id
      JOIN food_categories fc ON fi.category_id = fc.id
      JOIN orders o ON kq.order_id = o.id
      WHERE kq.status = 'cancelled' ${dateFilter}
      GROUP BY fi.id, fi.name, fc.name
      ORDER BY cancellation_count DESC
      LIMIT 50
    `;
    
    const kitchenData = await query(kitchenCancellationQuery, values);
    
    // Cancellation trends over time
    const trendQuery = `
      SELECT 
        DATE(o.created_at) as cancellation_date,
        COUNT(*) as cancellation_count,
        SUM(o.total_amount) as lost_revenue,
        COUNT(CASE WHEN o.order_type = 'dine_in' THEN 1 END) as dine_in_cancelled,
        COUNT(CASE WHEN o.order_type = 'delivery' THEN 1 END) as delivery_cancelled
      FROM orders o
      WHERE o.status = 'cancelled' ${dateFilter}
      GROUP BY DATE(o.created_at)
      ORDER BY cancellation_date DESC
      LIMIT 30
    `;
    
    const trendData = await query(trendQuery, values);
    
    res.json({
      overview: cancellationOverview[0],
      by_order_type: typeData,
      kitchen_items: kitchenData,
      trends: trendData
    });
    
  } catch (error) {
    console.error('Get cancellation report error:', error);
    res.status(500).json({ error: 'Failed to generate cancellation report' });
  }
});

// Bill-by-bill details
router.get('/bill-details', validateDateRange, async (req, res) => {
  try {
    const { 
      start_date, 
      end_date, 
      page = 1, 
      limit = 100,
      order_type,
      payment_method,
      min_amount,
      max_amount 
    } = req.query;
    
    const limitInt = parseInt(limit, 10) || 100;
    const offsetInt = (parseInt(page, 10) - 1) * limitInt;
    let whereClause = 'o.status IN ("done", "cancelled")';
    let values = [];
    
    if (start_date && end_date) {
      whereClause += ' AND DATE(o.created_at) BETWEEN ? AND ?';
      values.push(start_date, end_date);
    }
    
    if (order_type) {
      whereClause += ' AND o.order_type = ?';
      values.push(order_type);
    }
    
    if (min_amount) {
      whereClause += ' AND o.total_amount >= ?';
      values.push(parseFloat(min_amount));
    }
    
    if (max_amount) {
      whereClause += ' AND o.total_amount <= ?';
      values.push(parseFloat(max_amount));
    }
    
    // Get bill details
    const billsQuery = `
      SELECT 
        o.id,
        o.order_number,
        o.order_type,
        o.status,
        o.customer_name,
        o.customer_phone,
        o.subtotal,
        o.vat_amount,
        o.service_charge,
        o.discount_amount,
        o.total_amount,
        o.special_instructions,
        o.created_at,
        o.updated_at,
        u.username as waiter_name,
        u.full_name as waiter_full_name,
        t.table_number,
        t.location as table_location,
        p.payment_method,
        p.amount as paid_amount,
        dd.delivery_status,
        dd.customer_address
      FROM orders o
      LEFT JOIN users u ON o.waiter_id = u.id
      LEFT JOIN tables t ON o.table_id = t.id
      LEFT JOIN payments p ON o.id = p.order_id AND p.status = 'completed'
      LEFT JOIN delivery_details dd ON o.id = dd.order_id
      WHERE ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const bills = await query(billsQuery, [...values, limitInt, offsetInt]);
    
    // Get order items for each bill
    for (const bill of bills) {
      const items = await query(`
        SELECT oi.*, fi.name as item_name
        FROM order_items oi
        LEFT JOIN food_items fi ON oi.food_item_id = fi.id
        WHERE oi.order_id = ?
        ORDER BY oi.created_at
      `, [bill.id]);
      
      bill.items = items;
    }
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM orders o WHERE ${whereClause}`;
    const countResult = await query(countQuery, values);
    const total = countResult[0].total;
    
    // Calculate summary statistics
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_bills,
        SUM(o.total_amount) as total_revenue,
        AVG(o.total_amount) as avg_bill_amount,
        MIN(o.total_amount) as min_bill_amount,
        MAX(o.total_amount) as max_bill_amount,
        SUM(o.vat_amount) as total_vat,
        SUM(o.service_charge) as total_service_charge,
        SUM(o.discount_amount) as total_discount
      FROM orders o
      WHERE ${whereClause}
    `;
    
    const summaryResult = await query(summaryQuery, values);
    const summary = summaryResult[0];
    
    res.json({
      bills,
      pagination: {
        page: parseInt(page),
        limit: limitInt,
        total,
        pages: Math.ceil(total / limitInt)
      },
      summary
    });
    
  } catch (error) {
    console.error('Get bill details error:', error);
    res.status(500).json({ error: 'Failed to fetch bill details' });
  }
});

// Payment method analysis
router.get('/payment-methods', validateDateRange, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let dateFilter = '';
    let values = [];
    
    if (start_date && end_date) {
      dateFilter = 'AND DATE(p.created_at) BETWEEN ? AND ?';
      values = [start_date, end_date];
    }
    
    // Payment method breakdown
    const paymentQuery = `
      SELECT 
        p.payment_method,
        COUNT(*) as transaction_count,
        SUM(p.amount) as total_amount,
        AVG(p.amount) as avg_transaction_amount,
        MIN(p.amount) as min_transaction_amount,
        MAX(p.amount) as max_transaction_amount,
        COUNT(CASE WHEN o.order_type = 'dine_in' THEN 1 END) as dine_in_count,
        COUNT(CASE WHEN o.order_type = 'delivery' THEN 1 END) as delivery_count,
        COUNT(CASE WHEN o.order_type = 'direct' THEN 1 END) as direct_count
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      WHERE p.status = 'completed' ${dateFilter}
      GROUP BY p.payment_method
      ORDER BY total_amount DESC
    `;
    
    const paymentData = await query(paymentQuery, values);
    
    // Payment trends over time
    const trendQuery = `
      SELECT 
        DATE(p.created_at) as payment_date,
        p.payment_method,
        COUNT(*) as transaction_count,
        SUM(p.amount) as total_amount
      FROM payments p
      WHERE p.status = 'completed' ${dateFilter}
      GROUP BY DATE(p.created_at), p.payment_method
      ORDER BY payment_date DESC, p.payment_method
      LIMIT 100
    `;
    
    const trendData = await query(trendQuery, values);
    
    // Payment method by order type
    const orderTypeQuery = `
      SELECT 
        o.order_type,
        p.payment_method,
        COUNT(*) as count,
        SUM(p.amount) as total_amount,
        AVG(p.amount) as avg_amount
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      WHERE p.status = 'completed' ${dateFilter}
      GROUP BY o.order_type, p.payment_method
      ORDER BY o.order_type, total_amount DESC
    `;
    
    const orderTypeData = await query(orderTypeQuery, values);
    
    res.json({
      payment_breakdown: paymentData,
      payment_trends: trendData,
      by_order_type: orderTypeData
    });
    
  } catch (error) {
    console.error('Get payment methods report error:', error);
    res.status(500).json({ error: 'Failed to generate payment methods report' });
  }
});

// Export data endpoint
router.get('/export/:type', validateDateRange, async (req, res) => {
  try {
    const { type } = req.params;
    const { start_date, end_date, format = 'json' } = req.query;
    
    let data = [];
    let filename = '';
    
    switch (type) {
      case 'orders':
        data = await query(`
          SELECT o.*, u.username as waiter_name, t.table_number
          FROM orders o
          LEFT JOIN users u ON o.waiter_id = u.id
          LEFT JOIN tables t ON o.table_id = t.id
          WHERE DATE(o.created_at) BETWEEN ? AND ?
          ORDER BY o.created_at DESC
        `, [start_date, end_date]);
        filename = `orders_${start_date}_to_${end_date}`;
        break;
        
      case 'payments':
        data = await query(`
          SELECT p.*, o.order_number, o.order_type, u.username as waiter_name
          FROM payments p
          JOIN orders o ON p.order_id = o.id
          LEFT JOIN users u ON o.waiter_id = u.id
          WHERE DATE(p.created_at) BETWEEN ? AND ?
          ORDER BY p.created_at DESC
        `, [start_date, end_date]);
        filename = `payments_${start_date}_to_${end_date}`;
        break;
        
      case 'menu-items':
        data = await query(`
          SELECT fi.*, fc.name as category_name
          FROM food_items fi
          LEFT JOIN food_categories fc ON fi.category_id = fc.id
          ORDER BY fc.display_order ASC, fi.display_order ASC
        `);
        filename = `menu_items_${new Date().toISOString().split('T')[0]}`;
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid export type' });
    }
    
    if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(csv);
    } else {
      // Return JSON
      res.json({
        export_type: type,
        date_range: { start_date, end_date },
        data_count: data.length,
        data
      });
    }
    
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Helper function to convert data to CSV
const convertToCSV = (data) => {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      // Handle null/undefined values and escape commas in strings
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });
  
  return [csvHeaders, ...csvRows].join('\n');
};

// ── Today's Revenue (status=done orders with payment info) ────────
router.get('/today-revenue', async (req, res) => {
  try {
    const { start_date, end_date, page = 1, limit = 200 } = req.query;
    const today = new Date().toISOString().split('T')[0];
    const from = start_date || today;
    const to   = end_date   || today;
    const limitInt = Math.min(parseInt(limit) || 200, 500);
    const offset   = (parseInt(page) - 1) * limitInt;

    const orders = await query(`
      SELECT o.id, o.order_number, o.order_type, o.customer_name, o.status,
             o.subtotal, o.vat_amount, o.service_charge, o.discount_amount,
             o.delivery_fee, o.total_amount, o.created_at,
             u.full_name AS waiter_name,
             p.payment_method, p.amount AS paid_amount, p.transaction_id AS last4
      FROM orders o
      LEFT JOIN users u ON o.waiter_id = u.id
      LEFT JOIN payments p ON p.order_id = o.id AND p.status = 'completed'
      WHERE o.status = 'done' AND DATE(o.created_at) BETWEEN ? AND ?
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `, [from, to, limitInt, offset]);

    const [totals] = await query(`
      SELECT COUNT(*) AS total_orders,
             SUM(total_amount)    AS total_revenue,
             SUM(vat_amount)      AS total_vat,
             SUM(discount_amount) AS total_discount,
             SUM(service_charge)  AS total_service_charge
      FROM orders WHERE status = 'done' AND DATE(created_at) BETWEEN ? AND ?
    `, [from, to]);

    res.json({ orders, totals, pagination: { page: parseInt(page), limit: limitInt, total: parseInt(totals.total_orders) } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── VAT Report ────────────────────────────────────────────────────
router.get('/vat-report', validateDateRange, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const df = start_date && end_date ? 'AND DATE(created_at) BETWEEN ? AND ?' : '';
    const v  = start_date && end_date ? [start_date, end_date] : [];

    const daily = await query(`
      SELECT DATE(created_at) AS date,
             COUNT(*)             AS orders,
             SUM(total_amount)    AS gross,
             SUM(vat_amount)      AS vat_collected,
             SUM(subtotal)        AS net_sales
      FROM orders WHERE status = 'done' ${df}
      GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 90
    `, v);

    const [totals] = await query(`
      SELECT COUNT(*)          AS total_orders,
             SUM(total_amount) AS total_revenue,
             SUM(vat_amount)   AS total_vat,
             SUM(subtotal)     AS total_net_sales
      FROM orders WHERE status = 'done' ${df}
    `, v);

    res.json({ daily, totals });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Discount Report ───────────────────────────────────────────────
router.get('/discount-report', validateDateRange, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const df = start_date && end_date ? 'AND DATE(o.created_at) BETWEEN ? AND ?' : '';
    const dfu = start_date && end_date ? 'AND DATE(created_at) BETWEEN ? AND ?' : '';
    const v  = start_date && end_date ? [start_date, end_date] : [];

    const byUser = await query(`
      SELECT u.full_name, u.username,
             COUNT(o.id)             AS order_count,
             SUM(o.discount_amount)  AS total_discount,
             AVG(o.discount_amount)  AS avg_discount
      FROM orders o JOIN users u ON o.waiter_id = u.id
      WHERE o.status = 'done' AND o.discount_amount > 0 ${df}
      GROUP BY u.id, u.full_name, u.username ORDER BY total_discount DESC
    `, v);

    const [totals] = await query(`
      SELECT COUNT(*)                AS orders_with_discount,
             SUM(discount_amount)    AS total_discount
      FROM orders WHERE status = 'done' AND discount_amount > 0 ${dfu}
    `, v);

    const orders = await query(`
      SELECT o.id, o.order_number, o.customer_name, o.order_type, o.total_amount,
             o.discount_amount, o.created_at, u.full_name AS waiter_name
      FROM orders o JOIN users u ON o.waiter_id = u.id
      WHERE o.status = 'done' AND o.discount_amount > 0 ${df}
      ORDER BY o.discount_amount DESC LIMIT 200
    `, v);

    res.json({ by_user: byUser, totals, orders });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── User Sales Summary ────────────────────────────────────────────
router.get('/user-summary', validateDateRange, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const df = start_date && end_date ? 'AND DATE(o.created_at) BETWEEN ? AND ?' : '';
    const v  = start_date && end_date ? [start_date, end_date] : [];

    const users = await query(`
      SELECT u.full_name, u.username,
             COUNT(o.id)             AS orders_completed,
             SUM(o.total_amount)     AS total_sales,
             SUM(p.amount)           AS total_collected,
             SUM(o.discount_amount)  AS total_discount,
             SUM(o.vat_amount)       AS total_vat,
             AVG(o.total_amount)     AS avg_order
      FROM users u
      LEFT JOIN orders o  ON o.waiter_id = u.id AND o.status = 'done' ${df}
      LEFT JOIN payments p ON p.order_id = o.id AND p.status = 'completed'
      WHERE u.is_active = 1
      GROUP BY u.id, u.full_name, u.username ORDER BY total_sales DESC
    `, v);

    res.json({ users });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Collection Summary (dine-in / takeaway / delivery per day) ────
router.get('/collection-summary', validateDateRange, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const df = start_date && end_date ? 'AND DATE(created_at) BETWEEN ? AND ?' : '';
    const v  = start_date && end_date ? [start_date, end_date] : [];

    const rows = await query(`
      SELECT DATE(created_at) AS date,
             SUM(CASE WHEN order_type = 'dine_in'  THEN total_amount ELSE 0 END) AS dine_in,
             SUM(CASE WHEN order_type = 'delivery' THEN total_amount ELSE 0 END) AS delivery,
             SUM(CASE WHEN order_type = 'direct'   THEN total_amount ELSE 0 END) AS takeaway,
             SUM(total_amount) AS daily_total
      FROM orders WHERE status = 'done' ${df}
      GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 90
    `, v);

    const [totals] = await query(`
      SELECT SUM(CASE WHEN order_type = 'dine_in'  THEN total_amount ELSE 0 END) AS dine_in,
             SUM(CASE WHEN order_type = 'delivery' THEN total_amount ELSE 0 END) AS delivery,
             SUM(CASE WHEN order_type = 'direct'   THEN total_amount ELSE 0 END) AS takeaway,
             SUM(total_amount) AS grand_total
      FROM orders WHERE status = 'done' ${df}
    `, v);

    res.json({ rows, totals });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Payment Collection (cash / card / bKash / Nagad per day) ──────
router.get('/payment-collection', validateDateRange, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const df  = start_date && end_date ? 'AND DATE(p.created_at) BETWEEN ? AND ?' : '';
    const dfu = start_date && end_date ? 'AND DATE(created_at) BETWEEN ? AND ?' : '';
    const v   = start_date && end_date ? [start_date, end_date] : [];
    const df2 = start_date && end_date ? 'AND DATE(o.created_at) BETWEEN ? AND ?' : '';

    const rows = await query(`
      SELECT DATE(p.created_at) AS date,
             SUM(CASE WHEN p.payment_method = 'cash'  THEN p.amount ELSE 0 END) AS cash,
             SUM(CASE WHEN p.payment_method = 'card'  THEN p.amount ELSE 0 END) AS card,
             SUM(CASE WHEN p.payment_method = 'bkash' THEN p.amount ELSE 0 END) AS bkash,
             SUM(CASE WHEN p.payment_method = 'nagad' THEN p.amount ELSE 0 END) AS nagad,
             SUM(p.amount) AS daily_total
      FROM payments p WHERE p.status = 'completed' ${df}
      GROUP BY DATE(p.created_at) ORDER BY date DESC LIMIT 90
    `, v);

    const [totals] = await query(`
      SELECT SUM(CASE WHEN payment_method = 'cash'  THEN amount ELSE 0 END) AS cash,
             SUM(CASE WHEN payment_method = 'card'  THEN amount ELSE 0 END) AS card,
             SUM(CASE WHEN payment_method = 'bkash' THEN amount ELSE 0 END) AS bkash,
             SUM(CASE WHEN payment_method = 'nagad' THEN amount ELSE 0 END) AS nagad,
             SUM(amount) AS grand_total
      FROM payments WHERE status = 'completed' ${dfu}
    `, v);

    const due = await query(`
      SELECT DATE(o.created_at) AS date, SUM(dd.due_amount) AS due_total
      FROM orders o JOIN delivery_details dd ON dd.order_id = o.id
      WHERE dd.due_amount > 0 AND o.status = 'done' ${df2}
      GROUP BY DATE(o.created_at) ORDER BY date DESC LIMIT 90
    `, v);

    res.json({ rows, totals, due_by_date: due });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Yearly Sales Summary ──────────────────────────────────────────
router.get('/yearly-summary', async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const current = await query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') AS month,
             COUNT(*)             AS orders,
             SUM(total_amount)    AS revenue,
             SUM(vat_amount)      AS vat,
             SUM(discount_amount) AS discount
      FROM orders WHERE status = 'done' AND YEAR(created_at) = ?
      GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY month
    `, [parseInt(year)]);

    const previous = await query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') AS month,
             SUM(total_amount) AS revenue
      FROM orders WHERE status = 'done' AND YEAR(created_at) = ?
      GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY month
    `, [parseInt(year) - 1]);

    res.json({ current_year: current, previous_year: previous, year: parseInt(year) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Due Collection ────────────────────────────────────────────────
router.get('/due-collection', validateDateRange, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const df = start_date && end_date ? 'AND DATE(o.created_at) BETWEEN ? AND ?' : '';
    const v  = start_date && end_date ? [start_date, end_date] : [];

    const orders = await query(`
      SELECT o.id, o.order_number, o.customer_name, dd.delivery_phone,
             o.total_amount, dd.advance_payment, dd.due_amount,
             dd.delivery_status, o.created_at
      FROM orders o JOIN delivery_details dd ON dd.order_id = o.id
      WHERE dd.due_amount > 0 ${df}
      ORDER BY dd.due_amount DESC LIMIT 200
    `, v);

    const [totals] = await query(`
      SELECT COUNT(*) AS count,
             SUM(dd.due_amount)      AS total_due,
             SUM(dd.advance_payment) AS total_advance
      FROM orders o JOIN delivery_details dd ON dd.order_id = o.id
      WHERE dd.due_amount > 0 ${df}
    `, v);

    res.json({ orders, totals });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Menu List ─────────────────────────────────────────────────────
router.get('/menu-list', async (req, res) => {
  try {
    const rows = await query(`
      SELECT fc.name AS category, fi.name, fi.price, fi.promotional_price,
             fi.is_available, fi.preparation_time, fi.vat_rate
      FROM food_items fi JOIN food_categories fc ON fi.category_id = fc.id
      WHERE fc.is_active = 1
      ORDER BY fc.display_order ASC, fi.display_order ASC, fi.name ASC
    `);

    const grouped = {};
    rows.forEach(r => {
      if (!grouped[r.category]) grouped[r.category] = [];
      grouped[r.category].push(r);
    });

    res.json({ menu: grouped, total_items: rows.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Hold/Due Report ───────────────────────────────────────────────
router.get('/hold-report', validateDateRange, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const df = start_date && end_date ? 'AND DATE(o.created_at) BETWEEN ? AND ?' : '';
    const dfu = start_date && end_date ? 'AND DATE(created_at) BETWEEN ? AND ?' : '';
    const v  = start_date && end_date ? [start_date, end_date] : [];

    const orders = await query(`
      SELECT o.id, o.order_number, o.order_type, o.customer_name,
             o.customer_phone, o.total_amount, o.status,
             o.created_at, o.updated_at,
             u.full_name AS waiter_name, t.table_number
      FROM orders o
      LEFT JOIN users u ON o.waiter_id = u.id
      LEFT JOIN tables t ON o.table_id = t.id
      WHERE o.status = 'hold' ${df}
      ORDER BY o.updated_at DESC
    `, v);

    const [totals] = await query(`
      SELECT COUNT(*) AS count, SUM(total_amount) AS total_value
      FROM orders WHERE status = 'hold' ${dfu}
    `, v);

    res.json({ orders, totals });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Reservations Report ───────────────────────────────────────────
router.get('/reservations-report', validateDateRange, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const df = start_date && end_date ? 'AND DATE(r.reservation_date) BETWEEN ? AND ?' : '';
    const v  = start_date && end_date ? [start_date, end_date] : [];

    const reservations = await query(`
      SELECT r.id, r.customer_name, r.customer_phone, r.party_size,
             r.reservation_date, r.reservation_time, r.status,
             r.special_requests, r.created_at, t.table_number
      FROM reservations r LEFT JOIN tables t ON r.table_id = t.id
      WHERE 1=1 ${df}
      ORDER BY r.reservation_date DESC, r.reservation_time DESC LIMIT 200
    `, v);

    const [totals] = await query(`
      SELECT COUNT(*) AS total,
             SUM(CASE WHEN status = 'confirmed'  THEN 1 ELSE 0 END) AS confirmed,
             SUM(CASE WHEN status = 'completed'  THEN 1 ELSE 0 END) AS completed,
             SUM(CASE WHEN status = 'cancelled'  THEN 1 ELSE 0 END) AS cancelled,
             SUM(party_size) AS total_covers
      FROM reservations WHERE 1=1 ${df}
    `, v);

    res.json({ reservations, totals });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Customer Search Report ────────────────────────────────────────
router.get('/customer-search', validateDateRange, async (req, res) => {
  try {
    const { start_date, end_date, phone, name } = req.query;
    const df = start_date && end_date ? 'AND DATE(o.created_at) BETWEEN ? AND ?' : '';
    const v  = start_date && end_date ? [start_date, end_date] : [];

    if (phone) v.push(`%${phone}%`);
    if (name)  v.push(`%${name}%`);

    const customerFilter =
      (phone ? 'AND o.customer_phone LIKE ?' : '') +
      (name  ? 'AND o.customer_name  LIKE ?' : '');

    const customers = await query(`
      SELECT o.customer_name, o.customer_phone,
             COUNT(o.id)              AS total_orders,
             SUM(o.total_amount)      AS total_spent,
             SUM(o.discount_amount)   AS total_discount,
             MAX(o.created_at)        AS last_order,
             COALESCE(SUM(dd.due_amount), 0) AS total_due
      FROM orders o
      LEFT JOIN delivery_details dd ON dd.order_id = o.id
      WHERE o.status IN ('done') ${df} ${customerFilter}
      GROUP BY o.customer_name, o.customer_phone
      ORDER BY total_spent DESC LIMIT 200
    `, v);

    res.json({ customers });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Takeaway Report ───────────────────────────────────────────────
router.get('/takeaway-report', validateDateRange, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const df  = start_date && end_date ? 'AND DATE(o.created_at) BETWEEN ? AND ?' : '';
    const dfu = start_date && end_date ? 'AND DATE(created_at) BETWEEN ? AND ?' : '';
    const v  = start_date && end_date ? [start_date, end_date] : [];

    const orders = await query(`
      SELECT o.order_number, o.customer_name, o.customer_phone,
             o.total_amount, o.vat_amount, o.discount_amount,
             o.status, o.created_at,
             p.payment_method, p.amount AS paid_amount,
             u.full_name AS waiter_name
      FROM orders o
      LEFT JOIN payments p ON p.order_id = o.id AND p.status = 'completed'
      LEFT JOIN users u ON o.waiter_id = u.id
      WHERE o.order_type = 'direct' ${df}
      ORDER BY o.created_at DESC LIMIT 200
    `, v);

    const [totals] = await query(`
      SELECT COUNT(*) AS orders,
             SUM(total_amount)    AS revenue,
             SUM(vat_amount)      AS vat,
             SUM(discount_amount) AS discount
      FROM orders WHERE order_type = 'direct' ${dfu}
    `, v);

    res.json({ orders, totals });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Daily Sales Detail (order-by-order with items) ────────────────
router.get('/daily-sales-detail', validateDateRange, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const today = new Date().toISOString().split('T')[0];
    const from = start_date || today;
    const to   = end_date   || today;

    const orders = await query(`
      SELECT o.id, o.order_number, o.order_type, o.customer_name,
             o.subtotal, o.vat_amount, o.service_charge,
             o.discount_amount, o.total_amount, o.created_at,
             u.full_name AS waiter_name,
             p.payment_method, p.amount AS paid_amount
      FROM orders o
      LEFT JOIN users u  ON o.waiter_id = u.id
      LEFT JOIN payments p ON p.order_id = o.id AND p.status = 'completed'
      WHERE o.status = 'done' AND DATE(o.created_at) BETWEEN ? AND ?
      ORDER BY o.created_at DESC LIMIT 300
    `, [from, to]);

    // Attach items
    for (const ord of orders) {
      ord.items = await query(`
        SELECT oi.quantity, oi.unit_price, oi.total_price,
               fi.name AS item_name, fc.name AS category_name
        FROM order_items oi
        JOIN food_items fi     ON oi.food_item_id = fi.id
        JOIN food_categories fc ON fi.category_id  = fc.id
        WHERE oi.order_id = ?
      `, [ord.id]);
    }

    const [totals] = await query(`
      SELECT COUNT(*)          AS total_orders,
             SUM(total_amount) AS total_revenue,
             SUM(vat_amount)   AS total_vat,
             SUM(discount_amount) AS total_discount
      FROM orders WHERE status = 'done' AND DATE(created_at) BETWEEN ? AND ?
    `, [from, to]);

    res.json({ orders, totals });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Branch summary report ─────────────────────────────────────────────────────
router.get('/branch-summary', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { branch_id, date_from, date_to } = req.query;

    let dateWhere = '';
    const values = [];

    if (date_from) { dateWhere += ' AND DATE(o.created_at) >= ?'; values.push(date_from); }
    if (date_to)   { dateWhere += ' AND DATE(o.created_at) <= ?'; values.push(date_to); }

    // Determine which branches to include
    const targetBranchId = req.user?.branch_id || (branch_id ? parseInt(branch_id) : null);

    let branchWhere = '';
    if (targetBranchId) {
      branchWhere = ' AND o.branch_id = ?';
      values.push(targetBranchId);
    }

    const summary = await query(`
      SELECT
        b.id AS branch_id, b.name AS branch_name, b.code AS branch_code,
        COUNT(o.id) AS total_orders,
        COALESCE(SUM(o.total_amount), 0) AS total_revenue,
        COALESCE(AVG(o.total_amount), 0) AS avg_order_value,
        COUNT(CASE WHEN o.status = 'done' THEN 1 END) AS completed_orders,
        COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END) AS cancelled_orders,
        COALESCE(SUM(o.discount_amount), 0) AS total_discount,
        COUNT(CASE WHEN o.order_type = 'dine_in' THEN 1 END) AS dine_in_orders,
        COUNT(CASE WHEN o.order_type = 'delivery' THEN 1 END) AS delivery_orders,
        COUNT(CASE WHEN o.order_type = 'direct' THEN 1 END) AS takeaway_orders
      FROM branches b
      LEFT JOIN orders o ON o.branch_id = b.id AND o.status != 'cancelled' ${dateWhere} ${branchWhere}
      WHERE b.is_active = 1
      GROUP BY b.id, b.name, b.code
      ORDER BY total_revenue DESC
    `, values);

    // Top items per branch
    const topItems = await query(`
      SELECT o.branch_id, fi.name AS item_name,
             SUM(oi.quantity) AS qty, COALESCE(SUM(oi.total_price), 0) AS revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN food_items fi ON fi.id = oi.food_item_id
      WHERE o.status = 'done' ${date_from ? 'AND DATE(o.created_at) >= ?' : ''} ${date_to ? 'AND DATE(o.created_at) <= ?' : ''}
      ${targetBranchId ? 'AND o.branch_id = ?' : ''}
      GROUP BY o.branch_id, oi.food_item_id
      ORDER BY qty DESC
    `, [
      ...(date_from ? [date_from] : []),
      ...(date_to ? [date_to] : []),
      ...(targetBranchId ? [targetBranchId] : []),
    ]);

    // Group top items by branch
    const topItemsByBranch = {};
    topItems.forEach(row => {
      if (!topItemsByBranch[row.branch_id]) topItemsByBranch[row.branch_id] = [];
      if (topItemsByBranch[row.branch_id].length < 5) topItemsByBranch[row.branch_id].push(row);
    });

    res.json({
      summary: summary.map(b => ({
        ...b,
        total_revenue: parseFloat(b.total_revenue),
        avg_order_value: parseFloat(b.avg_order_value),
        total_discount: parseFloat(b.total_discount),
        top_items: topItemsByBranch[b.branch_id] || [],
      }))
    });
  } catch (err) {
    console.error('Branch summary error:', err);
    res.status(500).json({ error: 'Failed to fetch branch summary' });
  }
});

// ── Branch comparison (admin only) ───────────────────────────────────────────
router.get('/branch-comparison', requireRole(['admin']), async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    const values = [];
    let dateWhere = '';
    if (date_from) { dateWhere += ' AND DATE(o.created_at) >= ?'; values.push(date_from); }
    if (date_to)   { dateWhere += ' AND DATE(o.created_at) <= ?'; values.push(date_to); }

    const rows = await query(`
      SELECT
        b.id, b.name, b.code,
        COUNT(o.id) AS orders,
        COALESCE(SUM(CASE WHEN o.status = 'done' THEN o.total_amount END), 0) AS revenue,
        COALESCE(AVG(CASE WHEN o.status = 'done' THEN o.total_amount END), 0) AS avg_check,
        COUNT(CASE WHEN DATE(o.created_at) = CURDATE() THEN 1 END) AS today_orders,
        COALESCE(SUM(CASE WHEN DATE(o.created_at) = CURDATE() AND o.status = 'done' THEN o.total_amount END), 0) AS today_revenue
      FROM branches b
      LEFT JOIN orders o ON o.branch_id = b.id ${dateWhere}
      WHERE b.is_active = 1
      GROUP BY b.id, b.name, b.code
      ORDER BY revenue DESC
    `, values);

    res.json({
      comparison: rows.map(r => ({
        ...r,
        revenue: parseFloat(r.revenue),
        avg_check: parseFloat(r.avg_check),
        today_revenue: parseFloat(r.today_revenue),
      }))
    });
  } catch (err) {
    console.error('Branch comparison error:', err);
    res.status(500).json({ error: 'Failed to fetch branch comparison' });
  }
});

module.exports = router;

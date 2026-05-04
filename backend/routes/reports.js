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

module.exports = router;

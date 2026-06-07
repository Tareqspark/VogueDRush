const express = require('express');
const { findOne, findMany, insert, update, remove } = require('../config/database');
const { requireRole } = require('../middleware/auth');
const { validateFoodItem, validateFoodCategory, validateId } = require('../middleware/validation');
const { logManualAudit } = require('../middleware/audit');

const router = express.Router();

// Get all food categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await findMany(
      'food_categories',
      { is_active: true },
      '*',
      'display_order ASC, name ASC'
    );
    
    res.json(categories);
    
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get category by ID
router.get('/categories/:id', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await findOne('food_categories', { id, is_active: true });
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // Get item count for this category
    const { query } = require('../config/database');
    const countResult = await query(
      'SELECT COUNT(*) as item_count FROM food_items WHERE category_id = ? AND is_available = true',
      [id]
    );
    
    category.item_count = countResult[0].item_count;
    
    res.json(category);
    
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// Create new food category (admin only)
router.post('/categories', requireRole(['admin']), validateFoodCategory, async (req, res) => {
  try {
    const { name, description, icon, display_order } = req.body;
    
    // Check if category name already exists
    const existingCategory = await findOne('food_categories', { name });
    if (existingCategory) {
      return res.status(400).json({ error: 'Category name already exists' });
    }
    
    const categoryData = {
      name,
      description: description || null,
      icon: icon || null,
      display_order: display_order || 0,
      is_active: true
    };
    
    const newCategory = await insert('food_categories', categoryData);
    
    // Log audit
    await logManualAudit(
      req.user.id,
      'create',
      'food_categories',
      newCategory.id,
      null,
      newCategory,
      req.ip,
      req.headers['user-agent']
    );
    
    res.status(201).json({
      message: 'Category created successfully',
      category: newCategory
    });
    
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update food category (admin only)
router.put('/categories/:id', requireRole(['admin']), validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, display_order, is_active } = req.body;
    
    // Check if category exists
    const existingCategory = await findOne('food_categories', { id });
    if (!existingCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // Check if name is being changed and if new name already exists
    if (name && name !== existingCategory.name) {
      const duplicateCategory = await findOne('food_categories', { name, id: { $ne: id } });
      if (duplicateCategory) {
        return res.status(400).json({ error: 'Category name already exists' });
      }
    }
    
    const updateData = {
      updated_at: new Date()
    };
    
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (icon !== undefined) updateData.icon = icon;
    if (display_order !== undefined) updateData.display_order = display_order;
    if (is_active !== undefined) updateData.is_active = is_active;
    
    await update('food_categories', updateData, { id });
    
    // Get updated category
    const updatedCategory = await findOne('food_categories', { id });
    
    // Log audit
    await logManualAudit(
      req.user.id,
      'update',
      'food_categories',
      parseInt(id),
      existingCategory,
      updateData,
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({
      message: 'Category updated successfully',
      category: updatedCategory
    });
    
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete food category (admin only)
router.delete('/categories/:id', requireRole(['admin']), validateId, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if category exists
    const existingCategory = await findOne('food_categories', { id });
    if (!existingCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // Check if category has items
    const { query } = require('../config/database');
    const itemResult = await query(
      'SELECT COUNT(*) as item_count FROM food_items WHERE category_id = ?',
      [id]
    );
    
    if (itemResult[0].item_count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with existing items',
        item_count: itemResult[0].item_count
      });
    }
    
    // Soft delete by setting is_active to false
    await update('food_categories', { is_active: false, updated_at: new Date() }, { id });
    
    // Log audit
    await logManualAudit(
      req.user.id,
      'delete',
      'food_categories',
      parseInt(id),
      existingCategory,
      { is_active: false, deleted_at: new Date() },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({ message: 'Category deleted successfully' });
    
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Get all food items with optional filtering
router.get('/items', async (req, res) => {
  try {
    const { 
      category_id, 
      is_available, 
      search, 
      min_price, 
      max_price,
      page = 1, 
      limit = 100 
    } = req.query;
    
    const limitInt = parseInt(limit) || 100;
    const offsetInt = (parseInt(page) - 1) * limitInt;
    let whereClause = '1=1';
    let values = [];
    
    if (category_id) {
      whereClause += ' AND fi.category_id = ?';
      values.push(category_id);
    }
    
    if (is_available !== undefined) {
      whereClause += ' AND fi.is_available = ?';
      values.push(is_available === 'true' ? 1 : 0);
    }
    
    if (search) {
      whereClause += ' AND (fi.name LIKE ? OR fi.description LIKE ?)';
      values.push(`%${search}%`, `%${search}%`);
    }
    
    if (min_price) {
      whereClause += ' AND (fi.promotional_price IS NOT NULL ? fi.promotional_price : fi.price) >= ?';
      values.push(parseFloat(min_price));
    }
    
    if (max_price) {
      whereClause += ' AND (fi.promotional_price IS NOT NULL ? fi.promotional_price : fi.price) <= ?';
      values.push(parseFloat(max_price));
    }
    
    const { query } = require('../config/database');

    // Apply branch menu override filter when a branch is selected
    const branchId = req.headers['x-branch-id'] || req.query.branch_id;
    if (branchId) {
      whereClause += ` AND (
        SELECT COALESCE(bmo.is_available, 1)
        FROM branch_menu_overrides bmo
        WHERE bmo.food_item_id = fi.id AND bmo.branch_id = ${parseInt(branchId)}
        LIMIT 1
      ) = 1`;
    }

    // Get items with category info
    const itemsQuery = `
      SELECT fi.*, fc.name as category_name, fc.icon as category_icon
      FROM food_items fi
      LEFT JOIN food_categories fc ON fi.category_id = fc.id
      WHERE ${whereClause}
      ORDER BY fc.display_order ASC, fi.display_order ASC, fi.name ASC
      LIMIT ? OFFSET ?
    `;

    const items = await query(itemsQuery, [...values, limitInt, offsetInt]);
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM food_items fi WHERE ${whereClause}`;
    const countResult = await query(countQuery, values);
    const total = countResult[0].total;
    
    res.json({
      items,
      pagination: {
        page: parseInt(page),
        limit: limitInt,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Get food items error:', error);
    res.status(500).json({ error: 'Failed to fetch food items' });
  }
});

// Get food item by ID
router.get('/items/:id', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { query } = require('../config/database');
    
    const itemQuery = `
      SELECT fi.*, fc.name as category_name, fc.icon as category_icon
      FROM food_items fi
      LEFT JOIN food_categories fc ON fi.category_id = fc.id
      WHERE fi.id = ?
    `;
    
    const itemResult = await query(itemQuery, [id]);
    const item = itemResult[0];
    
    if (!item) {
      return res.status(404).json({ error: 'Food item not found' });
    }
    
    res.json(item);
    
  } catch (error) {
    console.error('Get food item error:', error);
    res.status(500).json({ error: 'Failed to fetch food item' });
  }
});

// Create new food item (admin only)
router.post('/items', requireRole(['admin']), validateFoodItem, async (req, res) => {
  try {
    const { 
      category_id, 
      name, 
      description, 
      price, 
      promotional_price, 
      vat_rate, 
      image_url, 
      preparation_time, 
      display_order 
    } = req.body;
    
    // Check if category exists
    const category = await findOne('food_categories', { id: category_id, is_active: true });
    if (!category) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    
    // Check if item name already exists in the same category
    const existingItem = await findOne('food_items', { category_id, name });
    if (existingItem) {
      return res.status(400).json({ error: 'Item name already exists in this category' });
    }
    
    const itemData = {
      category_id,
      name,
      description: description || null,
      price: parseFloat(price),
      promotional_price: promotional_price ? parseFloat(promotional_price) : null,
      vat_rate: vat_rate ? parseFloat(vat_rate) : 0.00,
      image_url: image_url || null,
      is_available: true,
      preparation_time: preparation_time || 15,
      display_order: display_order || 0
    };
    
    const newItem = await insert('food_items', itemData);
    
    // Log audit
    await logManualAudit(
      req.user.id,
      'create',
      'food_items',
      newItem.id,
      null,
      itemData,
      req.ip,
      req.headers['user-agent']
    );
    
    res.status(201).json({
      message: 'Food item created successfully',
      item: newItem
    });
    
  } catch (error) {
    console.error('Create food item error:', error);
    res.status(500).json({ error: 'Failed to create food item' });
  }
});

// Update food item (admin only)
router.put('/items/:id', requireRole(['admin']), validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      category_id, 
      name, 
      description, 
      price, 
      promotional_price, 
      vat_rate, 
      image_url, 
      is_available, 
      preparation_time, 
      display_order 
    } = req.body;
    
    // Check if item exists
    const existingItem = await findOne('food_items', { id });
    if (!existingItem) {
      return res.status(404).json({ error: 'Food item not found' });
    }
    
    // Check if category is being changed and if new category exists
    if (category_id && category_id !== existingItem.category_id) {
      const category = await findOne('food_categories', { id: category_id, is_active: true });
      if (!category) {
        return res.status(400).json({ error: 'Invalid category' });
      }
    }
    
    // Check if name is being changed and if new name already exists in the category
    if (name && (name !== existingItem.name || category_id !== existingItem.category_id)) {
      const targetCategoryId = category_id || existingItem.category_id;
      const duplicateItem = await findOne('food_items', { 
        category_id: targetCategoryId, 
        name,
        id: { $ne: id } 
      });
      if (duplicateItem) {
        return res.status(400).json({ error: 'Item name already exists in this category' });
      }
    }
    
    const updateData = { updated_at: new Date() };
    
    if (category_id !== undefined) updateData.category_id = category_id;
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (promotional_price !== undefined) updateData.promotional_price = promotional_price ? parseFloat(promotional_price) : null;
    if (vat_rate !== undefined) updateData.vat_rate = parseFloat(vat_rate);
    if (image_url !== undefined) updateData.image_url = image_url;
    if (is_available !== undefined) updateData.is_available = is_available;
    if (preparation_time !== undefined) updateData.preparation_time = preparation_time;
    if (display_order !== undefined) updateData.display_order = display_order;
    
    await update('food_items', updateData, { id });
    
    // Get updated item
    const { query } = require('../config/database');
    const updatedItemResult = await query(`
      SELECT fi.*, fc.name as category_name
      FROM food_items fi
      LEFT JOIN food_categories fc ON fi.category_id = fc.id
      WHERE fi.id = ?
    `, [id]);
    
    const updatedItem = updatedItemResult[0];
    
    // Log audit
    await logManualAudit(
      req.user.id,
      'update',
      'food_items',
      parseInt(id),
      existingItem,
      updateData,
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({
      message: 'Food item updated successfully',
      item: updatedItem
    });
    
  } catch (error) {
    console.error('Update food item error:', error);
    res.status(500).json({ error: 'Failed to update food item' });
  }
});

// Toggle food item availability (admin only)
router.patch('/items/:id/toggle-availability', requireRole(['admin']), validateId, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if item exists
    const existingItem = await findOne('food_items', { id });
    if (!existingItem) {
      return res.status(404).json({ error: 'Food item not found' });
    }
    
    const newAvailability = !existingItem.is_available;
    
    await update('food_items', { 
      is_available: newAvailability, 
      updated_at: new Date() 
    }, { id });
    
    // Log audit
    await logManualAudit(
      req.user.id,
      'toggle_availability',
      'food_items',
      parseInt(id),
      { is_available: existingItem.is_available },
      { is_available: newAvailability },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({
      message: `Food item ${newAvailability ? 'enabled' : 'disabled'} successfully`,
      is_available: newAvailability
    });
    
  } catch (error) {
    console.error('Toggle item availability error:', error);
    res.status(500).json({ error: 'Failed to toggle item availability' });
  }
});

// Delete food item (admin only)
router.delete('/items/:id', requireRole(['admin']), validateId, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if item exists
    const existingItem = await findOne('food_items', { id });
    if (!existingItem) {
      return res.status(404).json({ error: 'Food item not found' });
    }
    
    // Check if item is in any active orders
    const { query } = require('../config/database');
    const orderResult = await query(`
      SELECT COUNT(*) as order_count 
      FROM order_items oi 
      JOIN orders o ON oi.order_id = o.id 
      WHERE oi.food_item_id = ? AND o.status NOT IN ('done', 'cancelled')
    `, [id]);
    
    if (orderResult[0].order_count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete item that is in active orders',
        active_orders: orderResult[0].order_count
      });
    }
    
    // Soft delete by setting is_available to false
    await update('food_items', { is_available: false, updated_at: new Date() }, { id });
    
    // Log audit
    await logManualAudit(
      req.user.id,
      'delete',
      'food_items',
      parseInt(id),
      existingItem,
      { is_available: false, deleted_at: new Date() },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({ message: 'Food item deleted successfully' });
    
  } catch (error) {
    console.error('Delete food item error:', error);
    res.status(500).json({ error: 'Failed to delete food item' });
  }
});

// Get menu statistics (admin only)
router.get('/stats/overview', requireRole(['admin']), async (req, res) => {
  try {
    const { query } = require('../config/database');
    
    // Get category counts
    const categoryStats = await query(`
      SELECT fc.name, COUNT(fi.id) as item_count,
             SUM(CASE WHEN fi.is_available = 1 THEN 1 ELSE 0 END) as available_count
      FROM food_categories fc
      LEFT JOIN food_items fi ON fc.id = fi.category_id
      WHERE fc.is_active = 1
      GROUP BY fc.id, fc.name
      ORDER BY fc.display_order ASC
    `);
    
    // Get price ranges
    const priceStats = await query(`
      SELECT 
        COUNT(*) as total_items,
        COUNT(CASE WHEN is_available = 1 THEN 1 END) as available_items,
        MIN(CASE WHEN promotional_price IS NOT NULL THEN promotional_price ELSE price END) as min_price,
        MAX(CASE WHEN promotional_price IS NOT NULL THEN promotional_price ELSE price END) as max_price,
        AVG(CASE WHEN promotional_price IS NOT NULL THEN promotional_price ELSE price END) as avg_price
      FROM food_items
    `);
    
    // Get promotional items
    const promotionalStats = await query(`
      SELECT COUNT(*) as promotional_count,
             AVG(price - promotional_price) as avg_discount
      FROM food_items 
      WHERE promotional_price IS NOT NULL AND is_available = 1
    `);
    
    res.json({
      categoryStats,
      priceStats: priceStats[0],
      promotionalStats: promotionalStats[0]
    });
    
  } catch (error) {
    console.error('Get menu stats error:', error);
    res.status(500).json({ error: 'Failed to fetch menu statistics' });
  }
});

module.exports = router;

const express = require('express');
const { findOne, findMany, insert, update, remove } = require('../config/database');
const { requireRole } = require('../middleware/auth');
const { validateSystemSetting, validateId } = require('../middleware/validation');
const { logManualAudit } = require('../middleware/audit');

const router = express.Router();

// Get all system settings
router.get('/', async (req, res) => {
  try {
    const { category, editable_only } = req.query;
    
    let whereClause = '1=1';
    const values = [];
    
    if (category) {
      whereClause += ' AND setting_key LIKE ?';
      values.push(`${category}%`);
    }
    
    if (editable_only === 'true') {
      whereClause += ' AND is_editable = 1';
    }
    
    const { query } = require('../config/database');
    const settings = await query(
      `SELECT * FROM system_settings WHERE ${whereClause} ORDER BY setting_key ASC`,
      values
    );
    
    // Parse values based on data type
    const parsedSettings = settings.map(setting => {
      let parsedValue = setting.setting_value;
      
      switch (setting.data_type) {
        case 'number':
          parsedValue = parseFloat(setting.setting_value);
          break;
        case 'boolean':
          parsedValue = setting.setting_value === 'true';
          break;
        case 'json':
          try {
            parsedValue = JSON.parse(setting.setting_value);
          } catch (e) {
            parsedValue = setting.setting_value;
          }
          break;
        default:
          parsedValue = setting.setting_value;
      }
      
      return {
        ...setting,
        parsed_value: parsedValue
      };
    });
    
    // Group settings by category
    const groupedSettings = {};
    parsedSettings.forEach(setting => {
      const category = setting.setting_key.split('_')[0];
      if (!groupedSettings[category]) {
        groupedSettings[category] = [];
      }
      groupedSettings[category].push(setting);
    });
    
    res.json({
      settings: parsedSettings,
      grouped: groupedSettings
    });
    
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// ── Service Charge Presets ──────────────────────────────────────────────────
const DEFAULT_SC_PRESETS = JSON.stringify([
  { id: 1, name: 'Standard',     value: '10',  type: 'percentage' },
  { id: 2, name: 'AC Room',      value: '15',  type: 'percentage' },
  { id: 3, name: 'VIP Service',  value: '20',  type: 'percentage' },
  { id: 4, name: 'Banquet Hall', value: '500', type: 'fixed' }
]);

router.get('/service-charge-presets', async (req, res) => {
  try {
    let row = await findOne('system_settings', { setting_key: 'service_charge_presets' });
    if (!row) {
      await insert('system_settings', {
        setting_key: 'service_charge_presets',
        setting_value: DEFAULT_SC_PRESETS,
        description: 'Named service charge presets',
        data_type: 'json',
        is_editable: 1
      });
      row = { setting_value: DEFAULT_SC_PRESETS };
    }
    res.json({ presets: JSON.parse(row.setting_value) });
  } catch (e) {
    console.error('SC presets get error:', e);
    res.status(500).json({ error: e.message });
  }
});

router.put('/service-charge-presets', requireRole(['admin']), async (req, res) => {
  try {
    const { presets } = req.body;
    if (!Array.isArray(presets) || presets.length === 0) {
      return res.status(400).json({ error: 'presets must be a non-empty array' });
    }
    for (const p of presets) {
      if (!p.name || p.name.trim() === '') return res.status(400).json({ error: 'Each preset must have a name' });
      if (isNaN(parseFloat(p.value))) return res.status(400).json({ error: 'Each preset value must be a number' });
      if (!['percentage', 'fixed'].includes(p.type)) return res.status(400).json({ error: 'Type must be percentage or fixed' });
    }
    const value = JSON.stringify(presets);
    const existing = await findOne('system_settings', { setting_key: 'service_charge_presets' });
    if (existing) {
      await update('system_settings', { setting_value: value, updated_at: new Date() }, { setting_key: 'service_charge_presets' });
    } else {
      await insert('system_settings', {
        setting_key: 'service_charge_presets',
        setting_value: value,
        description: 'Named service charge presets',
        data_type: 'json',
        is_editable: 1
      });
    }
    res.json({ message: 'Service charge presets saved', presets });
  } catch (e) {
    console.error('SC presets save error:', e);
    res.status(500).json({ error: e.message });
  }
});
// ───────────────────────────────────────────────────────────────────────────

// Get specific setting by key
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    
    const setting = await findOne('system_settings', { setting_key: key });
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    // Parse value based on data type
    let parsedValue = setting.setting_value;
    
    switch (setting.data_type) {
      case 'number':
        parsedValue = parseFloat(setting.setting_value);
        break;
      case 'boolean':
        parsedValue = setting.setting_value === 'true';
        break;
      case 'json':
        try {
          parsedValue = JSON.parse(setting.setting_value);
        } catch (e) {
          parsedValue = setting.setting_value;
        }
        break;
    }
    
    res.json({
      ...setting,
      parsed_value: parsedValue
    });
    
  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// Create new system setting (admin only)
router.post('/', requireRole(['admin']), validateSystemSetting, async (req, res) => {
  try {
    const { setting_key, setting_value, description, data_type } = req.body;
    
    // Check if setting already exists
    const existingSetting = await findOne('system_settings', { setting_key });
    if (existingSetting) {
      return res.status(400).json({ error: 'Setting key already exists' });
    }
    
    // Validate value based on data type
    let validatedValue = setting_value;
    switch (data_type) {
      case 'number':
        const numValue = parseFloat(setting_value);
        if (isNaN(numValue)) {
          return res.status(400).json({ error: 'Invalid number value' });
        }
        validatedValue = numValue.toString();
        break;
      case 'boolean':
        if (typeof setting_value === 'boolean') {
          validatedValue = setting_value.toString();
        } else if (setting_value.toLowerCase() === 'true' || setting_value.toLowerCase() === 'false') {
          validatedValue = setting_value.toLowerCase();
        } else {
          return res.status(400).json({ error: 'Invalid boolean value' });
        }
        break;
      case 'json':
        try {
          JSON.parse(setting_value);
        } catch (e) {
          return res.status(400).json({ error: 'Invalid JSON value' });
        }
        break;
    }
    
    const settingData = {
      setting_key,
      setting_value: validatedValue,
      description: description || '',
      data_type,
      is_editable: true
    };
    
    const newSetting = await insert('system_settings', settingData);
    
    // Log audit
    await logManualAudit(
      req.user.id,
      'create',
      'system_settings',
      newSetting.id,
      null,
      settingData,
      req.ip,
      req.headers['user-agent']
    );
    
    res.status(201).json({
      message: 'Setting created successfully',
      setting: newSetting
    });
    
  } catch (error) {
    console.error('Create setting error:', error);
    res.status(500).json({ error: 'Failed to create setting' });
  }
});

// Update system setting (admin only)
router.put('/:key', requireRole(['admin']), async (req, res) => {
  try {
    const { key } = req.params;
    const { setting_value, description, is_editable } = req.body;
    
    // Check if setting exists
    const existingSetting = await findOne('system_settings', { setting_key: key });
    if (!existingSetting) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    // Check if setting is editable
    if (!existingSetting.is_editable) {
      return res.status(400).json({ error: 'This setting cannot be modified' });
    }
    
    // Validate value based on data type
    let validatedValue = setting_value;
    if (setting_value !== undefined) {
      switch (existingSetting.data_type) {
        case 'number':
          const numValue = parseFloat(setting_value);
          if (isNaN(numValue)) {
            return res.status(400).json({ error: 'Invalid number value' });
          }
          validatedValue = numValue.toString();
          break;
        case 'boolean':
          if (typeof setting_value === 'boolean') {
            validatedValue = setting_value.toString();
          } else if (setting_value.toLowerCase() === 'true' || setting_value.toLowerCase() === 'false') {
            validatedValue = setting_value.toLowerCase();
          } else {
            return res.status(400).json({ error: 'Invalid boolean value' });
          }
          break;
        case 'json':
          try {
            JSON.parse(setting_value);
          } catch (e) {
            return res.status(400).json({ error: 'Invalid JSON value' });
          }
          break;
      }
    }
    
    const updateData = { updated_at: new Date() };
    
    if (setting_value !== undefined) updateData.setting_value = validatedValue;
    if (description !== undefined) updateData.description = description;
    if (is_editable !== undefined) updateData.is_editable = is_editable;
    
    await update('system_settings', updateData, { setting_key: key });
    
    // Get updated setting
    const updatedSetting = await findOne('system_settings', { setting_key: key });
    
    // Log audit
    await logManualAudit(
      req.user.id,
      'update',
      'system_settings',
      existingSetting.id,
      existingSetting,
      updateData,
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({
      message: 'Setting updated successfully',
      setting: updatedSetting
    });
    
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// Delete system setting (admin only)
router.delete('/:key', requireRole(['admin']), async (req, res) => {
  try {
    const { key } = req.params;
    
    // Check if setting exists
    const existingSetting = await findOne('system_settings', { setting_key: key });
    if (!existingSetting) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    // Prevent deletion of critical settings
    const criticalSettings = [
      'vat_percentage',
      'service_charge_percentage',
      'restaurant_name',
      'currency_symbol'
    ];
    
    if (criticalSettings.includes(key)) {
      return res.status(400).json({ error: 'Cannot delete critical system setting' });
    }
    
    await remove('system_settings', { setting_key: key });
    
    // Log audit
    await logManualAudit(
      req.user.id,
      'delete',
      'system_settings',
      existingSetting.id,
      existingSetting,
      { deleted_at: new Date() },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({ message: 'Setting deleted successfully' });
    
  } catch (error) {
    console.error('Delete setting error:', error);
    res.status(500).json({ error: 'Failed to delete setting' });
  }
});

// Bulk update settings (admin only)
router.post('/bulk-update', requireRole(['admin']), async (req, res) => {
  try {
    const { settings } = req.body;
    
    if (!Array.isArray(settings) || settings.length === 0) {
      return res.status(400).json({ error: 'Settings array is required' });
    }
    
    const results = [];
    const errors = [];
    
    for (const settingUpdate of settings) {
      try {
        const { setting_key, setting_value } = settingUpdate;
        
        // Check if setting exists and is editable
        const existingSetting = await findOne('system_settings', { setting_key });
        if (!existingSetting) {
          errors.push({ key: setting_key, error: 'Setting not found' });
          continue;
        }
        
        if (!existingSetting.is_editable) {
          errors.push({ key: setting_key, error: 'Setting is not editable' });
          continue;
        }
        
        // Validate value
        let validatedValue = setting_value;
        switch (existingSetting.data_type) {
          case 'number':
            const numValue = parseFloat(setting_value);
            if (isNaN(numValue)) {
              errors.push({ key: setting_key, error: 'Invalid number value' });
              continue;
            }
            validatedValue = numValue.toString();
            break;
          case 'boolean':
            if (typeof setting_value === 'boolean') {
              validatedValue = setting_value.toString();
            } else if (setting_value.toLowerCase() === 'true' || setting_value.toLowerCase() === 'false') {
              validatedValue = setting_value.toLowerCase();
            } else {
              errors.push({ key: setting_key, error: 'Invalid boolean value' });
              continue;
            }
            break;
          case 'json':
            try {
              JSON.parse(setting_value);
            } catch (e) {
              errors.push({ key: setting_key, error: 'Invalid JSON value' });
              continue;
            }
            break;
        }
        
        await update('system_settings', {
          setting_value: validatedValue,
          updated_at: new Date()
        }, { setting_key });
        
        results.push({ key: setting_key, success: true });
        
      } catch (error) {
        errors.push({ key: settingUpdate.setting_key, error: error.message });
      }
    }
    
    // Log audit for bulk update
    await logManualAudit(
      req.user.id,
      'bulk_update',
      'system_settings',
      0,
      null,
      { 
        updated_count: results.length,
        error_count: errors.length,
        settings: settings.map(s => s.setting_key)
      },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({
      message: 'Bulk update completed',
      updated: results.length,
      errors: errors.length,
      results,
      errors
    });
    
  } catch (error) {
    console.error('Bulk update settings error:', error);
    res.status(500).json({ error: 'Failed to bulk update settings' });
  }
});

// Get restaurant configuration
router.get('/config/restaurant', async (req, res) => {
  try {
    const settings = await findMany('system_settings', {}, 'setting_key, setting_value, data_type');
    
    // Convert to key-value object
    const config = {};
    settings.forEach(setting => {
      let value = setting.setting_value;
      
      switch (setting.data_type) {
        case 'number':
          value = parseFloat(setting.setting_value);
          break;
        case 'boolean':
          value = setting.setting_value === 'true';
          break;
        case 'json':
          try {
            value = JSON.parse(setting.setting_value);
          } catch (e) {
            value = setting.setting_value;
          }
          break;
      }
      
      config[setting.setting_key] = value;
    });
    
    // Extract restaurant-specific configuration
    const restaurantConfig = {
      name: config.restaurant_name || 'FoodPark',
      address: config.restaurant_address || '',
      phone: config.restaurant_phone || '',
      currency: config.currency_symbol || '৳',
      vat_percentage: config.vat_percentage || 15,
      service_charge_percentage: config.service_charge_percentage || 10,
      enable_delivery: config.enable_delivery || false,
      delivery_fee: config.delivery_fee || 0,
      advance_payment_required: config.advance_payment_required || false,
      min_advance_percentage: config.min_advance_percentage || 30
    };
    
    res.json(restaurantConfig);
    
  } catch (error) {
    console.error('Get restaurant config error:', error);
    res.status(500).json({ error: 'Failed to fetch restaurant configuration' });
  }
});

// Reset settings to defaults (admin only)
router.post('/reset-to-defaults', requireRole(['admin']), async (req, res) => {
  try {
    const { confirm } = req.body;
    
    if (confirm !== true) {
      return res.status(400).json({ error: 'Confirmation required to reset settings' });
    }
    
    // Default settings
    const defaultSettings = [
      { key: 'vat_percentage', value: '15.00', type: 'number' },
      { key: 'service_charge_percentage', value: '10.00', type: 'number' },
      { key: 'restaurant_name', value: 'FoodPark', type: 'string' },
      { key: 'restaurant_vat_number', value: '', type: 'string' },
      { key: 'restaurant_address', value: '123 Fashion Street, Dhaka', type: 'string' },
      { key: 'restaurant_phone', value: '+8801234567890', type: 'string' },
      { key: 'currency_symbol', value: '৳', type: 'string' },
      { key: 'enable_delivery', value: 'true', type: 'boolean' },
      { key: 'delivery_fee', value: '50.00', type: 'number' },
      { key: 'advance_payment_required', value: 'false', type: 'boolean' },
      { key: 'min_advance_percentage', value: '30.00', type: 'number' }
    ];
    
    const results = [];
    
    for (const defaultSetting of defaultSettings) {
      try {
        const { query } = require('../config/database');
        await query(
          `INSERT INTO system_settings (setting_key, setting_value, data_type, updated_at)
           VALUES (?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()`,
          [defaultSetting.key, defaultSetting.value, defaultSetting.type]
        );
        results.push({ key: defaultSetting.key, success: true });
      } catch (error) {
        results.push({ key: defaultSetting.key, success: false, error: error.message });
      }
    }
    
    // Log audit
    await logManualAudit(
      req.user.id,
      'reset_defaults',
      'system_settings',
      0,
      null,
      { reset_count: defaultSettings.length, results },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({
      message: 'Settings reset to defaults completed',
      results
    });
    
  } catch (error) {
    console.error('Reset settings error:', error);
    res.status(500).json({ error: 'Failed to reset settings' });
  }
});

// Ensure all default setting keys exist (INSERT IGNORE — safe to run on live DB)
router.post('/ensure-defaults', requireRole(['admin']), async (req, res) => {
  try {
    const { query } = require('../config/database');
    const defaults = [
      { key: 'vat_percentage',             value: '15.00',                        type: 'number'  },
      { key: 'service_charge_percentage',  value: '10.00',                        type: 'number'  },
      { key: 'restaurant_name',            value: 'FoodPark',                     type: 'string'  },
      { key: 'restaurant_address',         value: '123 Fashion Street, Dhaka',    type: 'string'  },
      { key: 'restaurant_phone',           value: '+8801234567890',               type: 'string'  },
      { key: 'restaurant_email',           value: '',                             type: 'string'  },
      { key: 'restaurant_vat_number',      value: '',                             type: 'string'  },
      { key: 'currency_symbol',            value: '৳',                            type: 'string'  },
      { key: 'enable_delivery',            value: 'true',                         type: 'boolean' },
      { key: 'delivery_fee',               value: '50.00',                        type: 'number'  },
      { key: 'advance_payment_required',   value: 'false',                        type: 'boolean' },
      { key: 'min_advance_percentage',     value: '30.00',                        type: 'number'  },
    ];
    const results = [];
    for (const d of defaults) {
      const result = await query(
        `INSERT IGNORE INTO system_settings (setting_key, setting_value, data_type, description, updated_at)
         VALUES (?, ?, ?, '', NOW())`,
        [d.key, d.value, d.type]
      );
      results.push({ key: d.key, inserted: result.affectedRows > 0 });
    }
    res.json({ message: 'ensure-defaults complete', results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get system health and statistics
router.get('/health/system', requireRole(['admin']), async (req, res) => {
  try {
    const { query } = require('../config/database');
    
    // Database statistics
    const dbStats = await query(`
      SELECT 
        'orders' as table_name, COUNT(*) as record_count
      FROM orders
      UNION ALL
      SELECT 
        'users' as table_name, COUNT(*) as record_count
      FROM users
      UNION ALL
      SELECT 
        'food_items' as table_name, COUNT(*) as record_count
      FROM food_items
      UNION ALL
      SELECT 
        'reservations' as table_name, COUNT(*) as record_count
      FROM reservations
      UNION ALL
      SELECT 
        'audit_logs' as table_name, COUNT(*) as record_count
      FROM audit_logs
    `);
    
    // Recent activity
    const recentActivity = await query(`
      SELECT action, table_name, created_at
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    // System settings count
    const settingsCount = await query('SELECT COUNT(*) as count FROM system_settings');
    
    // Active users
    const activeUsers = await query('SELECT COUNT(*) as count FROM users WHERE is_active = 1');
    
    // Today's orders
    const todayOrders = await query(`
      SELECT COUNT(*) as count, SUM(total_amount) as revenue
      FROM orders
      WHERE DATE(created_at) = CURDATE() AND status IN ('done', 'cancelled')
    `);
    
    res.json({
      database_stats: dbStats,
      recent_activity: recentActivity,
      system_info: {
        settings_count: settingsCount[0].count,
        active_users: activeUsers[0].count,
        today_orders: todayOrders[0],
        server_uptime: process.uptime(),
        node_version: process.version,
        memory_usage: process.memoryUsage()
      }
    });
    
  } catch (error) {
    console.error('Get system health error:', error);
    res.status(500).json({ error: 'Failed to fetch system health information' });
  }
});

module.exports = router;

const { insert } = require('../config/database');

// Log audit trail for database changes
const logAudit = async (req, res, next) => {
  // Store original res.json to intercept responses
  const originalJson = res.json;
  
  res.json = function(data) {
    // Only log successful operations that modify data
    if (req.user && res.statusCode >= 200 && res.statusCode < 300) {
      const method = req.method.toLowerCase();
      const path = req.path;
      
      // Define operations that should be audited
      const auditableOperations = [
        { method: 'post', paths: ['/api/users', '/api/orders', '/api/reservations', '/api/menu/items'] },
        { method: 'put', paths: ['/api/users', '/api/orders', '/api/reservations', '/api/menu/items', '/api/tables'] },
        { method: 'patch', paths: ['/api/orders', '/api/delivery', '/api/tables', '/api/reservations', '/api/kitchen'] },
        { method: 'delete', paths: ['/api/users', '/api/orders', '/api/reservations', '/api/menu/items', '/api/tables'] }
      ];
      
      const shouldAudit = auditableOperations.some(op => 
        op.method === method && 
        op.paths.some(p => path.startsWith(p))
      );
      
      if (shouldAudit) {
        _createAuditLog(req, data);
      }
    }
    
    // Call original json method
    originalJson.call(this, data);
  };
  
  next();
};

// Create audit log entry
const _createAuditLog = async (req, responseData) => {
  try {
    const { user, body, method, path, ip, headers } = req;
    
    // Extract table name and record ID from path
    const pathParts = path.split('/').filter(p => p);
    let tableName = '';
    let recordId = null;
    
    if (pathParts.length >= 2) {
      tableName = pathParts[1]; // e.g., /api/users -> users
      
      // Try to extract ID from response data or request params
      if (responseData && responseData.id) {
        recordId = responseData.id;
      } else if (req.params.id) {
        recordId = req.params.id;
      } else if (req.body && req.body.id) {
        recordId = req.body.id;
      }
    }
    
    const auditData = {
      user_id: user.id,
      action: _getActionFromMethod(method),
      table_name: tableName,
      record_id: recordId || 0,
      old_values: method === 'put' ? JSON.stringify(req.body.oldValues || {}) : null,
      new_values: JSON.stringify(req.body),
      ip_address: ip || req.connection.remoteAddress,
      user_agent: headers['user-agent'] || ''
    };
    
    await insert('audit_logs', auditData);
  } catch (error) {
    console.error('Audit logging error:', error);
    // Don't fail the request if audit logging fails
  }
};

// Map HTTP methods to audit actions
const _getActionFromMethod = (method) => {
  const actionMap = {
    'post': 'create',
    'put': 'update',
    'patch': 'update',
    'delete': 'delete'
  };
  return actionMap[method.toLowerCase()] || 'unknown';
};

// Manual audit logging for specific operations
const logManualAudit = async (userId, action, tableName, recordId, oldValues = null, newValues = null, ipAddress = null, userAgent = null) => {
  try {
    const auditData = {
      user_id: userId,
      action,
      table_name: tableName,
      record_id: recordId,
      old_values: oldValues ? JSON.stringify(oldValues) : null,
      new_values: newValues ? JSON.stringify(newValues) : null,
      ip_address: ipAddress,
      user_agent: userAgent || ''
    };
    
    await insert('audit_logs', auditData);
  } catch (error) {
    console.error('Manual audit logging error:', error);
  }
};

// Get audit logs for a record
const getAuditLogs = async (tableName, recordId) => {
  const { findMany } = require('../config/database');
  
  try {
    const logs = await findMany(
      'audit_logs',
      { table_name: tableName, record_id },
      '*',
      'created_at DESC',
      '50'
    );
    
    // Parse JSON fields
    return logs.map(log => ({
      ...log,
      old_values: log.old_values ? JSON.parse(log.old_values) : null,
      new_values: log.new_values ? JSON.parse(log.new_values) : null
    }));
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }
};

module.exports = {
  logAudit,
  logManualAudit,
  getAuditLogs
};

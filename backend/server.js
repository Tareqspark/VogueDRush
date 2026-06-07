const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const branchRoutes = require('./routes/branches');
const userRoutes = require('./routes/users');
const orderRoutes = require('./routes/orders');
const menuRoutes = require('./routes/menu');
const tableRoutes = require('./routes/tables');
const reservationRoutes = require('./routes/reservations');
const kitchenRoutes = require('./routes/kitchen');
const deliveryRoutes = require('./routes/delivery');
const reportRoutes = require('./routes/reports');
const settingsRoutes = require('./routes/settings');
const productionRoutes = require('./routes/production');
const foodCostingRoutes = require('./routes/foodcosting');
const procurementRoutes = require('./routes/procurement');
const assetsRoutes = require('./routes/assets');
const maintenanceRoutes = require('./routes/maintenance');
const cateringRoutes = require('./routes/catering');
const banquetRoutes = require('./routes/banquet');
const marketingRoutes = require('./routes/marketing');
const reviewsRoutes = require('./routes/reviews');
const aggregatorRoutes = require('./routes/aggregator');
const taxRoutes = require('./routes/tax');
const documentsRoutes = require('./routes/documents');
const forecastingRoutes = require('./routes/forecasting');
const callCenterRoutes = require('./routes/callcenter');
const queueRoutes = require('./routes/queue');
const giftCardsRoutes = require('./routes/giftcards');
const membershipRoutes = require('./routes/membership');
const complaintsRoutes = require('./routes/complaints');
const messagingRoutes = require('./routes/messaging');
const publicApiRoutes = require('./routes/publicapi');
const inventoryTransfersRoutes = require('./routes/inventoryTransfers');

const { authenticateToken, cleanupExpiredTokens } = require('./middleware/auth');
const { logAudit } = require('./middleware/audit');
const { errorHandler, asyncHandler, notFound } = require('./middleware/errorHandler');
const { createRateLimiter, rateLimiters, createRoleBasedLimiter } = require('./middleware/rateLimiter');
const database = require('./config/database');

const app = express();
const server = createServer(app);

// Redis adapter for Socket.io scaling
let io;
if (process.env.REDIS_HOST && process.env.REDIS_PORT) {
  try {
    const pubClient = createClient({ url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}` });
    const subClient = pubClient.duplicate();
    
    io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL
          ? [process.env.FRONTEND_URL]
          : (origin, cb) => {
              if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) cb(null, true);
              else cb(new Error('Not allowed by CORS'));
            },
        credentials: true
      },
      adapter: createAdapter(pubClient, subClient)
    });
    console.log('Socket.io Redis adapter enabled');
  } catch (error) {
    console.warn('Failed to enable Redis adapter, falling back to in-memory:', error.message);
    io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL
          ? [process.env.FRONTEND_URL]
          : (origin, cb) => {
              if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) cb(null, true);
              else cb(new Error('Not allowed by CORS'));
            },
        credentials: true
      }
    });
  }
} else {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL
        ? [process.env.FRONTEND_URL]
        : (origin, cb) => {
            if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) cb(null, true);
            else cb(new Error('Not allowed by CORS'));
          },
      credentials: true
    }
  });
}

// CORS must come before helmet so preflight OPTIONS requests are handled correctly
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : null; // null = local-only mode

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    // In production with FRONTEND_URL set, only allow that exact origin
    if (allowedOrigins) {
      return allowedOrigins.includes(origin)
        ? callback(null, true)
        : callback(new Error('Not allowed by CORS'));
    }
    // Development: allow any localhost / 127.0.0.1 origin
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Security middleware with enhanced configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      scriptSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// Apply rate limiting
app.use('/api/', rateLimiters.general);

// Cookie parsing (required for httpOnly token cookies — C-1 fix)
app.use(cookieParser());

// Body parsing middleware with size limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({ 
        error: 'Invalid JSON',
        code: 'INVALID_JSON'
      });
      throw new Error('Invalid JSON');
    }
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Static files
app.use('/uploads', express.static('uploads'));

// Enhanced Socket.IO connection handling with authentication and room management
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication token required'));
  }
  
  // Verify token (reuse auth middleware logic)
  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
    if (err) {
      return next(new Error('Invalid token'));
    }
    
    // Check if token is blacklisted
    try {
      const { findOne } = require('./config/database');
      const blacklistedToken = await findOne('token_blacklist', { 
        token_jti: user.jti, 
        token_type: 'access',
        expires_at: { $gt: new Date() }
      });
      
      if (blacklistedToken) {
        return next(new Error('Token has been revoked'));
      }
      
      // Fetch user data
      const userData = await findOne('users', { 
        id: user.id, 
        is_active: true 
      });
      
      if (!userData) {
        return next(new Error('User not found or inactive'));
      }
      
      socket.user = userData;
      socket.tokenJti = user.jti;
      next();
    } catch (error) {
      return next(new Error('Authentication failed'));
    }
  });
});

io.on('connection', (socket) => {
  console.log(`User ${socket.user.username} connected:`, socket.id);
  
  // Join role-based rooms for real-time updates
  socket.join(socket.user.role); // admin or waiter
  socket.join('all-users');
  
  // Join order-specific rooms if needed
  socket.on('join-order', (orderId) => {
    if (orderId && typeof orderId === 'string') {
      socket.join(`order-${orderId}`);
      console.log(`User ${socket.user.username} joined order room: ${orderId}`);
    }
  });
  
  // Join table-specific rooms for table status updates
  socket.on('join-table', (tableId) => {
    if (tableId && typeof tableId === 'string') {
      socket.join(`table-${tableId}`);
      console.log(`User ${socket.user.username} joined table room: ${tableId}`);
    }
  });
  
  // Handle kitchen status updates
  socket.on('kitchen-status-update', async (data) => {
    try {
      const { orderItemId, status, actualPrepTime } = data;
      
      if (!orderItemId || !status) {
        socket.emit('error', { message: 'Order item ID and status required' });
        return;
      }
      
      const { update, query } = require('./config/database');
      const updateData = { status };
      
      if (status === 'preparing') {
        updateData.started_at = new Date();
      } else if (status === 'ready' || status === 'cancelled') {
        updateData.completed_at = new Date();
        if (actualPrepTime) {
          updateData.actual_prep_time = actualPrepTime;
        }
      }
      
      await update('kitchen_queue', updateData, { id: orderItemId });
      
      // Broadcast to relevant rooms
      io.to('kitchen').emit('kitchen-update', {
        orderItemId,
        status,
        updatedBy: socket.user.username,
        timestamp: new Date()
      });
      
      // Get order details for room broadcasting
      const orderDetails = await query(`
        SELECT kq.order_id, o.order_number 
        FROM kitchen_queue kq 
        JOIN orders o ON kq.order_id = o.id 
        WHERE kq.id = ?
      `, [orderItemId]);
      
      if (orderDetails[0]) {
        io.to(`order-${orderDetails[0].order_id}`).emit('order-item-status', {
          orderItemId,
          status,
          orderNumber: orderDetails[0].order_number
        });
      }
      
      // Log audit
      const { logManualAudit } = require('./middleware/audit');
      await logManualAudit(
        socket.user.id,
        'kitchen_status_update',
        'kitchen_queue',
        orderItemId,
        null,
        { status, actual_prep_time: actualPrepTime },
        socket.handshake.address,
        socket.handshake.headers['user-agent']
      );
      
    } catch (error) {
      console.error('Kitchen status update error:', error);
      socket.emit('error', { message: 'Failed to update kitchen status' });
    }
  });
  
  // Handle table status updates
  socket.on('table-status-update', async (data) => {
    try {
      // C-8: Only admins may change table status via socket (mirrors REST requireAdmin)
      if (socket.user.role !== 'admin') {
        socket.emit('error', { message: 'Insufficient permissions to update table status' });
        return;
      }

      const { tableId, status } = data;
      
      if (!tableId || !status) {
        socket.emit('error', { message: 'Table ID and status required' });
        return;
      }
      
      const { update } = require('./config/database');
      await update('tables', { 
        status, 
        updated_at: new Date() 
      }, { id: tableId });
      
      // Broadcast to all users
      io.emit('table-status-changed', {
        tableId,
        status,
        updatedBy: socket.user.username,
        timestamp: new Date()
      });
      
      // Log audit
      const { logManualAudit } = require('./middleware/audit');
      await logManualAudit(
        socket.user.id,
        'table_status_update',
        'tables',
        tableId,
        null,
        { status },
        socket.handshake.address,
        socket.handshake.headers['user-agent']
      );
      
    } catch (error) {
      console.error('Table status update error:', error);
      socket.emit('error', { message: 'Failed to update table status' });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`User ${socket.user.username} disconnected:`, socket.id, reason);
    
    // Leave all rooms automatically handled by Socket.io
    // Log disconnection if needed
  });
  
  // Handle errors
  socket.on('error', (error) => {
    console.error(`Socket error for user ${socket.user.username}:`, error);
  });
});

// Make io available to routes
app.set('io', io);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes with specific rate limiting
app.use('/api/auth', rateLimiters.auth, authRoutes);
app.use('/api/branches', branchRoutes); // GET is public (used in login flow); mutations use requireRole internally
app.use('/api/users', authenticateToken, createRoleBasedLimiter({
  admin: { windowMs: 15 * 60 * 1000, max: 50 },
  waiter: { windowMs: 15 * 60 * 1000, max: 30 },
  anonymous: { windowMs: 15 * 60 * 1000, max: 10 }
}), userRoutes);
app.use('/api/orders', authenticateToken, orderRoutes);
app.use('/api/menu', authenticateToken, rateLimiters.search, menuRoutes);
app.use('/api/tables', authenticateToken, tableRoutes);
app.use('/api/reservations', authenticateToken, rateLimiters.search, reservationRoutes);
app.use('/api/kitchen', authenticateToken, kitchenRoutes);
app.use('/api/delivery', authenticateToken, deliveryRoutes);
app.use('/api/reports', authenticateToken, rateLimiters.reports, reportRoutes);
app.use('/api/settings', authenticateToken, settingsRoutes);

// ── ERP Phase 2 – 20 new modules ─────────────────────────
app.use('/api/production', authenticateToken, productionRoutes);
app.use('/api/food-costing', authenticateToken, foodCostingRoutes);
app.use('/api/procurement', authenticateToken, procurementRoutes);
app.use('/api/assets', authenticateToken, assetsRoutes);
app.use('/api/maintenance', authenticateToken, maintenanceRoutes);
app.use('/api/catering', authenticateToken, cateringRoutes);
app.use('/api/banquet', authenticateToken, banquetRoutes);
app.use('/api/marketing', authenticateToken, marketingRoutes);
app.use('/api/reviews', authenticateToken, reviewsRoutes);
app.use('/api/aggregator', authenticateToken, aggregatorRoutes);
app.use('/api/tax', authenticateToken, taxRoutes);
app.use('/api/docs', authenticateToken, documentsRoutes);
app.use('/api/forecasting', authenticateToken, forecastingRoutes);
app.use('/api/call-center', authenticateToken, callCenterRoutes);
app.use('/api/queue', authenticateToken, queueRoutes);
app.use('/api/gift-cards', authenticateToken, giftCardsRoutes);
app.use('/api/membership', authenticateToken, membershipRoutes);
app.use('/api/complaints', authenticateToken, complaintsRoutes);
app.use('/api/messaging', authenticateToken, messagingRoutes);
app.use('/api/api-ecosystem', authenticateToken, publicApiRoutes);
app.use('/api/inventory-transfers', inventoryTransfersRoutes);

// 404 handler
app.use('*', notFound);

// Global error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    database.end();
    process.exit(0);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 Socket.IO enabled for real-time updates`);

  // M-8: Run token blacklist / session cleanup once immediately, then every hour
  cleanupExpiredTokens();
  setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

  // Idempotent schema patches — safe to run on every startup
  try {
    const { query } = require('./config/database');

    await query(`ALTER TABLE orders MODIFY COLUMN status ENUM('pending','preparing','ready','done','cancelled','hold') DEFAULT 'pending'`);
    console.log('✅ Patch: orders.status includes hold');

    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_id INT NULL DEFAULT NULL`);
    console.log('✅ Patch: users.branch_id added');

    await query(`
      CREATE TABLE IF NOT EXISTS branch_hours (
        id INT AUTO_INCREMENT PRIMARY KEY,
        branch_id INT NOT NULL,
        day_of_week TINYINT NOT NULL COMMENT '0=Sun,1=Mon,...,6=Sat',
        is_open BOOLEAN DEFAULT TRUE,
        open_time TIME NOT NULL DEFAULT '09:00:00',
        close_time TIME NOT NULL DEFAULT '23:00:00',
        UNIQUE KEY uq_branch_day (branch_id, day_of_week),
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Patch: branch_hours table ready');

    await query(`
      CREATE TABLE IF NOT EXISTS branch_menu_overrides (
        id INT AUTO_INCREMENT PRIMARY KEY,
        branch_id INT NOT NULL,
        food_item_id INT NOT NULL,
        is_available BOOLEAN DEFAULT FALSE,
        UNIQUE KEY uq_branch_item (branch_id, food_item_id),
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
        FOREIGN KEY (food_item_id) REFERENCES food_items(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Patch: branch_menu_overrides table ready');

    await query(`
      CREATE TABLE IF NOT EXISTS inventory_transfers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        from_branch_id INT NOT NULL,
        to_branch_id INT NOT NULL,
        food_item_id INT NOT NULL,
        quantity DECIMAL(10,2) NOT NULL,
        unit VARCHAR(20) DEFAULT 'unit',
        notes TEXT,
        status ENUM('pending','approved','rejected','completed') DEFAULT 'pending',
        requested_by INT NOT NULL,
        approved_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        FOREIGN KEY (from_branch_id) REFERENCES branches(id),
        FOREIGN KEY (to_branch_id) REFERENCES branches(id),
        FOREIGN KEY (food_item_id) REFERENCES food_items(id),
        FOREIGN KEY (requested_by) REFERENCES users(id),
        FOREIGN KEY (approved_by) REFERENCES users(id)
      )
    `);
    console.log('✅ Patch: inventory_transfers table ready');

    await query(`
      CREATE TABLE IF NOT EXISTS branch_item_prices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        branch_id INT NOT NULL,
        food_item_id INT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        UNIQUE KEY uq_branch_item_price (branch_id, food_item_id),
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
        FOREIGN KEY (food_item_id) REFERENCES food_items(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Patch: branch_item_prices table ready');

    await query(`
      CREATE TABLE IF NOT EXISTS branch_expenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        branch_id INT NOT NULL,
        category ENUM('rent','utilities','salaries','supplies','maintenance','marketing','other') DEFAULT 'other',
        amount DECIMAL(10,2) NOT NULL,
        description VARCHAR(255),
        expense_date DATE NOT NULL,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
    console.log('✅ Patch: branch_expenses table ready');

    // Branch isolation patches for supporting tables
    await query(`ALTER TABLE tables ADD COLUMN IF NOT EXISTS branch_id INT NULL DEFAULT NULL`);
    await query(`UPDATE tables SET branch_id = 1 WHERE branch_id IS NULL`);
    console.log('✅ Patch: tables.branch_id added');

    await query(`ALTER TABLE reservations ADD COLUMN IF NOT EXISTS branch_id INT NULL DEFAULT NULL`);
    await query(`UPDATE reservations SET branch_id = 1 WHERE branch_id IS NULL`);
    console.log('✅ Patch: reservations.branch_id added');

    // Add branch_id to food_items for true menu isolation
    await query(`ALTER TABLE food_items ADD COLUMN IF NOT EXISTS branch_id INT NULL DEFAULT NULL`);
    console.log('✅ Patch: food_items.branch_id added');

    // Assign existing branch-less items to branch 1 (the original branch)
    await query(`UPDATE food_items SET branch_id = 1 WHERE branch_id IS NULL`);
    console.log('✅ Patch: existing menu items assigned to branch 1');

    // For every other active branch that has zero menu items, clone branch 1 items into it
    const otherBranches = await query(`
      SELECT b.id FROM branches b
      WHERE b.id != 1 AND b.is_active = 1
        AND NOT EXISTS (SELECT 1 FROM food_items fi WHERE fi.branch_id = b.id LIMIT 1)
    `);
    for (const branch of otherBranches) {
      await query(`
        INSERT INTO food_items
          (name, description, price, promotional_price, category_id,
           preparation_time, is_available, display_order, branch_id, created_at)
        SELECT name, description, price, promotional_price, category_id,
               preparation_time, is_available, display_order, ?, NOW()
        FROM food_items WHERE branch_id = 1
      `, [branch.id]);
      console.log(`✅ Patch: menu cloned from branch 1 to branch ${branch.id}`);
    }

  } catch (err) {
    console.error('⚠️  Schema patch warning:', err.message);
  }
});

module.exports = { app, server, io };

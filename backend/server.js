const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const orderRoutes = require('./routes/orders');
const menuRoutes = require('./routes/menu');
const tableRoutes = require('./routes/tables');
const reservationRoutes = require('./routes/reservations');
const kitchenRoutes = require('./routes/kitchen');
const deliveryRoutes = require('./routes/delivery');
const reportRoutes = require('./routes/reports');
const settingsRoutes = require('./routes/settings');

const { authenticateToken } = require('./middleware/auth');
const { logAudit } = require('./middleware/audit');
const database = require('./config/database');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL
      ? [process.env.FRONTEND_URL]
      : (origin, cb) => {
          if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) cb(null, true);
          else cb(new Error('Not allowed by CORS'));
        },
    methods: ["GET", "POST"],
    credentials: true
  }
});

// CORS must come before helmet so preflight OPTIONS requests are handled correctly
app.use(cors({
  origin: process.env.FRONTEND_URL || true, // true = reflect request origin (safe for local dev)
  credentials: true
}));

// Security middleware
app.use(helmet());
// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static('uploads'));

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Join role-based rooms for real-time updates
  socket.on('join-role', (role) => {
    socket.join(role);
    console.log(`User ${socket.id} joined ${role} room`);
  });
  
  // Join order-specific room for order updates
  socket.on('join-order', (orderId) => {
    socket.join(`order-${orderId}`);
    console.log(`User ${socket.id} joined order-${orderId} room`);
  });
  
  // Join kitchen room for kitchen updates
  socket.on('join-kitchen', () => {
    socket.join('kitchen');
    console.log(`User ${socket.id} joined kitchen room`);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
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

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/orders', authenticateToken, orderRoutes);
app.use('/api/menu', authenticateToken, menuRoutes);
app.use('/api/tables', authenticateToken, tableRoutes);
app.use('/api/reservations', authenticateToken, reservationRoutes);
app.use('/api/kitchen', authenticateToken, kitchenRoutes);
app.use('/api/delivery', authenticateToken, deliveryRoutes);
app.use('/api/reports', authenticateToken, reportRoutes);
app.use('/api/settings', authenticateToken, settingsRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    database.end();
    process.exit(0);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 Socket.IO enabled for real-time updates`);
});

module.exports = { app, server, io };

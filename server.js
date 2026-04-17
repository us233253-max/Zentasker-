require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const xss = require('xss-clean');
const hpp = require('hpp');
const { Server } = require('socket.io');
const http = require('http');
const jwt = require('jsonwebtoken');

const { supabase } = require('./config/supabase');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const gigRoutes = require('./routes/gigRoutes');
const jobRoutes = require('./routes/jobRoutes');
const proposalRoutes = require('./routes/proposalRoutes');
const orderRoutes = require('./routes/orderRoutes');
const messageRoutes = require('./routes/messageRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const aiRoutes = require('./routes/aiRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Initialize Express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ==================== MIDDLEWARE ====================

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [process.env.FRONTEND_URL, process.env.ADMIN_URL, 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
}));
app.use(xss());
app.use(hpp());

// Rate limiting
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Compression middleware
app.use(compression());

// Logging middleware (development only)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ==================== SUPABASE AUTH MIDDLEWARE ====================

const authenticateUser = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      // Try JWT verification as fallback for local development
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        req.user = decoded;
        return next();
      } catch (jwtError) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token',
        });
      }
    }

    // Fetch user profile from database
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
      });
    }

    req.user = profile;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};

// Admin middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.',
    });
  }
  next();
};

// Apply auth middleware to routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateUser, userRoutes);
app.use('/api/gigs', authenticateUser, gigRoutes);
app.use('/api/jobs', authenticateUser, jobRoutes);
app.use('/api/proposals', authenticateUser, proposalRoutes);
app.use('/api/orders', authenticateUser, orderRoutes);
app.use('/api/messages', authenticateUser, messageRoutes);
app.use('/api/reviews', authenticateUser, reviewRoutes);
app.use('/api/payments', authenticateUser, paymentRoutes);
app.use('/api/ai', authenticateUser, aiRoutes);
app.use('/api/admin', authenticateUser, requireAdmin, adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Zentasker API - AI-Powered Freelancing Marketplace',
    version: '1.0.0',
  });
});

// ==================== SOCKET.IO ====================

const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('user_connected', (userId) => {
    onlineUsers.set(userId, socket.id);
    socket.join(`user:${userId}`);
    io.emit('user_status', { userId, status: 'online' });
    console.log(`User ${userId} connected`);
  });

  socket.on('join_conversation', (conversationId) => {
    socket.join(`conversation:${conversationId}`);
    console.log(`User joined conversation ${conversationId}`);
  });

  socket.on('leave_conversation', (conversationId) => {
    socket.leave(`conversation:${conversationId}`);
  });

  socket.on('send_message', async (data) => {
    const { conversationId, message } = data;
    io.to(`conversation:${conversationId}`).emit('new_message', message);
    message.participants?.forEach(participantId => {
      if (participantId !== message.senderId) {
        io.to(`user:${participantId}`).emit('notification', {
          type: 'message',
          title: 'New Message',
          message: message.content.substring(0, 100),
          data: { conversationId, messageId: message.id },
        });
      }
    });
  });

  socket.on('typing_start', (data) => {
    socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
      userId: data.userId,
      conversationId: data.conversationId,
    });
  });

  socket.on('typing_stop', (data) => {
    socket.to(`conversation:${data.conversationId}`).emit('user_stopped_typing', {
      userId: data.userId,
      conversationId: data.conversationId,
    });
  });

  socket.on('order_update', (data) => {
    const { orderId, update } = data;
    io.to(`order:${orderId}`).emit('order_updated', update);
  });

  socket.on('join_order', (orderId) => {
    socket.join(`order:${orderId}`);
  });

  socket.on('send_notification', (data) => {
    const { userId, notification } = data;
    io.to(`user:${userId}`).emit('notification', notification);
  });

  socket.on('disconnect', () => {
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        io.emit('user_status', { userId, status: 'offline' });
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// ==================== ERROR HANDLING ====================

app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

app.use(errorHandler);

// ==================== SERVER STARTUP ====================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 Zentasker Server is running!                         ║
║                                                           ║
║   📡 API: http://localhost:${PORT}                        ║
║   🔌 Socket.IO: http://localhost:${PORT}                  ║
║   📊 Environment: ${process.env.NODE_ENV || 'development'}                         ║
║   💾 Database: Supabase PostgreSQL                        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});

module.exports = { app, server, io };

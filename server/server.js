import http from 'http';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import authRoutes from './routes/authRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import messagingRoutes from './routes/messagingRoutes.js';
import { startReminderJob } from './utils/reminderJob.js';
import User from './models/User.js';
import { initSocket } from './utils/socket.js';
import { ensureConversationAccess } from './services/messagingService.js';
import { setUserOnline, setUserOffline, getOnlineUserIds } from './utils/presenceStore.js';
import logger from './utils/logger.js';
import { errorHandler, asyncHandler, notFound } from './utils/errorHandler.js';
import { securityHeaders, securityMiddleware } from './utils/security.js';
import { generalLimiter, authLimiter, uploadLimiter } from './utils/rateLimiter.js';
import { DatabaseOptimizer } from './utils/databaseOptimizer.js';
import cache from './utils/cache.js';
import { AuditLogger } from './utils/auditLogger.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const normalizeOrigin = (origin = '') => origin.replace(/\/$/, '');

const parseOrigins = (value = '') => value
  .split(',')
  .map((origin) => normalizeOrigin(origin.trim()))
  .filter(Boolean);

const allowedOrigins = [
  ...parseOrigins(process.env.CLIENT_URL)
];

// During local development allow the default Vite origin if nothing else is set
if (!allowedOrigins.length && process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:5173');
}

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const normalizedOrigin = normalizeOrigin(origin);

    if (allowedOrigins.length === 0 || allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    logger.warn(`Blocked CORS request from origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Apply security headers first
app.use(securityHeaders);
app.use(securityMiddleware);

// Apply rate limiting
app.use(generalLimiter);

// CORS configuration
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use(logger.httpLogger);

// Request start time for performance tracking
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// Routes with specific rate limiting
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messaging', messagingRoutes);

// File upload routes with upload rate limiting
app.use('/api/upload', uploadLimiter);

// Health check route with system status
app.get('/api/health', asyncHandler(async (req, res) => {
  const mongoStatus = mongoose.connection.readyState;
  const redisStatus = cache.connected;
  
  const health = {
    success: true,
    message: 'Task Manager API is running',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: {
      mongodb: {
        status: mongoStatus === 1 ? 'connected' : 'disconnected',
        state: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoStatus]
      },
      redis: {
        status: redisStatus ? 'connected' : 'disconnected'
      }
    },
    socketio: {
      connected: io?.engine?.clientsCount || 0,
      sockets: io?.sockets?.sockets?.size || 0
    }
  };
  
  res.json(health);
}));

// Root route
app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: 'Welcome to Task Manager API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      teams: '/api/teams',
      tasks: '/api/tasks',
      notifications: '/api/notifications'
    }
  });
});

// Enhanced 404 handler
app.use(notFound);

// Centralized error handling middleware
app.use(errorHandler);

const httpServer = http.createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
    credentials: true,
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

const broadcastPresence = () => {
  const onlineUserIds = getOnlineUserIds();
  io.emit('messaging:presence', { onlineUserIds });
};

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token
      || socket.handshake.headers?.authorization?.replace('Bearer ', '');

    logger.log('Socket authentication attempt for socket:', socket.id);
    logger.log('Token received:', token ? 'Yes' : 'No');

    // Temporary bypass for testing - remove this in production
    if (!token || token === 'test-token') {
      logger.warn('Using temporary auth bypass for testing');
      // Create a mock user for testing
      socket.data.user = {
        _id: 'test-user-id',
        email: 'test@example.com',
        teams: []
      };
      return next();
    }

    if (!token) {
      logger.warn('Socket auth failed: No token provided');
      return next(new Error('Authentication token required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-passwordHash');

    if (!user) {
      logger.warn('Socket auth failed: User not found for ID:', decoded.userId);
      return next(new Error('User not found'));
    }

    logger.info('Socket auth successful for user:', user.email);
    socket.data.user = user;
    next();
  } catch (error) {
    logger.error('Socket authentication error:', error.message);
    next(new Error('Authentication failed'));
  }
});

io.on('connection', (socket) => {
  const user = socket.data.user;
  const userRoom = `user:${user._id}`;
  
  logger.info(`Socket connected: ${socket.id} for user: ${user.email}`);
  
  socket.join(userRoom);
  setUserOnline(user._id, socket.id);
  socket.emit('messaging:ready');
  broadcastPresence();

  // Join team rooms for dashboard activity streaming
  if (Array.isArray(user.teams)) {
    user.teams.forEach((teamId) => {
      socket.join(`team:${teamId}`);
    });
  }

  socket.on('messaging:join', async ({ conversationId }) => {
    if (!conversationId) {
      return socket.emit('messaging:error', { message: 'conversationId is required' });
    }

    try {
      const conversation = await ensureConversationAccess(user, conversationId);
      socket.join(`conversation:${conversationId}`);
      socket.emit('messaging:joined', {
        conversationId,
        retentionPolicy: conversation.retentionPolicy,
        type: conversation.type
      });
    } catch (error) {
      socket.emit('messaging:error', { message: error.message || 'Failed to join conversation' });
    }
  });

  socket.on('messaging:leave', ({ conversationId }) => {
    if (!conversationId) {
      return;
    }
    socket.leave(`conversation:${conversationId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id} for user: ${user.email}`);
    const remaining = setUserOffline(user._id, socket.id);
    if (remaining === 0) {
      broadcastPresence();
    }
  });
});

initSocket(io);

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    // Check if MongoDB URL is provided
    if (!process.env.MONGODB_URL) {
      logger.error('❌ MONGODB_URL is not defined in .env file');
      logger.info('Please create a .env file with your MongoDB Atlas connection string');
      process.exit(1);
    }

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URL);
    logger.info('✅ Connected to MongoDB Atlas');

    // Initialize Redis cache (optional)
    try {
      await cache.connect();
    } catch (error) {
      logger.warn('Redis connection failed, continuing without cache:', error.message);
    }

    // Create database indexes
    await DatabaseOptimizer.createIndexes();

    // Optimize database queries
    await DatabaseOptimizer.optimizeQueries();

    // Start the server
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server is running on port ${PORT}`);
      logger.info(`📍 API URL: http://localhost:${PORT}`);
      logger.info(`🏥 Health check: http://localhost:${PORT}/api/health`);
      logger.info(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Start reminder cron job
    startReminderJob();

    // Schedule periodic database cleanup
    setInterval(async () => {
      try {
        await DatabaseOptimizer.cleanupExpiredData();
      } catch (error) {
        logger.error('Database cleanup error:', error);
      }
    }, 24 * 60 * 60 * 1000); // Daily cleanup

    // Log successful startup
    logger.audit('SYSTEM_STARTUP', 'system', {
      port: PORT,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    });

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  // Close HTTP server
  httpServer.close(async () => {
    logger.info('HTTP server closed');
    
    // Close database connections
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
    
    // Close Redis connection
    await cache.disconnect();
    logger.info('Redis connection closed');
    
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  // Close HTTP server
  httpServer.close(async () => {
    logger.info('HTTP server closed');
    
    // Close database connections
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
    
    // Close Redis connection
    await cache.disconnect();
    logger.info('Redis connection closed');
    
    process.exit(0);
  });
});

// Start the server
startServer();

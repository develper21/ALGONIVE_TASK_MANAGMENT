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

    console.warn(`Blocked CORS request from origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messaging', messagingRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Task Manager API is running',
    timestamp: new Date().toISOString(),
    socketio: {
      connected: io.engine.clientsCount,
      sockets: io.sockets.sockets.size
    }
  });
});

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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

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

    console.log('Socket authentication attempt for socket:', socket.id);

    if (!token) {
      console.log('Socket auth failed: No token provided');
      return next(new Error('Authentication token required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-passwordHash');

    if (!user) {
      console.log('Socket auth failed: User not found for ID:', decoded.userId);
      return next(new Error('User not found'));
    }

    console.log('Socket auth successful for user:', user.email);
    socket.data.user = user;
    next();
  } catch (error) {
    console.error('Socket authentication error:', error.message);
    next(new Error('Authentication failed'));
  }
});

io.on('connection', (socket) => {
  const user = socket.data.user;
  const userRoom = `user:${user._id}`;
  
  console.log(`Socket connected: ${socket.id} for user: ${user.email}`);
  
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
    console.log(`Socket disconnected: ${socket.id} for user: ${user.email}`);
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
      console.error('❌ MONGODB_URL is not defined in .env file');
      console.log('Please create a .env file with your MongoDB Atlas connection string');
      process.exit(1);
    }

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('✅ Connected to MongoDB Atlas');

    // Start the server
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📍 API URL: http://localhost:${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
    });

    // Start reminder cron job
    startReminderJob();

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Start the server
startServer();

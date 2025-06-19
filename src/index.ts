import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { config } from './config/environment';
import { connectDB } from './config/database';
import { initializeSocket } from './socket/socketHandler';

// Import routes
import authRoutes from './routes/authRoutes';
import chatRoutes from './routes/chatRoutes';
import fileRoutes from './routes/fileRoutes';
import aiRoutes from './routes/aiRoutes';

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocket(server);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: config.cors.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: config.server.nodeEnv,
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/ai', aiRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction): void => {
  console.error('Global error handler:', error);
  
  // Multer error handling
  if (error.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({ error: 'File too large' });
    return;
  }
  
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    res.status(400).json({ error: 'Unexpected file field' });
    return;
  }

  // JWT error handling
  if (error.name === 'JsonWebTokenError') {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  if (error.name === 'TokenExpiredError') {
    res.status(401).json({ error: 'Token expired' });
    return;
  }

  // Database error handling
  if (error.code === '23505') { // PostgreSQL unique violation
    res.status(409).json({ error: 'Resource already exists' });
    return;
  }

  if (error.code === '23503') { // PostgreSQL foreign key violation
    res.status(400).json({ error: 'Referenced resource not found' });
    return;
  }

  // Default error response
  res.status(error.status || 500).json({
    error: config.server.nodeEnv === 'production' 
      ? 'Internal server error' 
      : error.message,
    ...(config.server.nodeEnv === 'development' && { stack: error.stack }),
  });
});

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Start server
    server.listen(config.server.port, () => {
      console.log(`
🚀 Angira Backend Server Started Successfully!

📊 Server Info:
   • Port: ${config.server.port}
   • Environment: ${config.server.nodeEnv}
   • Frontend URL: ${config.cors.frontendUrl}

🗄️  Database:
   • Host: ${config.database.host}:${config.database.port}
   • Database: ${config.database.name}

🌐 Available Endpoints:
   • Health Check: http://localhost:${config.server.port}/health
   • Auth: http://localhost:${config.server.port}/api/auth
   • Chat: http://localhost:${config.server.port}/api/chat
   • Files: http://localhost:${config.server.port}/api/files
   • AI: http://localhost:${config.server.port}/api/ai

🔌 WebSocket: Socket.IO enabled for real-time communication

Ready to serve requests! 🎉
      `);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer(); 
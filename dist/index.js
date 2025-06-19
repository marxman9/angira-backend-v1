"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const path_1 = __importDefault(require("path"));
const environment_1 = require("./config/environment");
const database_1 = require("./config/database");
const socketHandler_1 = require("./socket/socketHandler");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const chatRoutes_1 = __importDefault(require("./routes/chatRoutes"));
const fileRoutes_1 = __importDefault(require("./routes/fileRoutes"));
const aiRoutes_1 = __importDefault(require("./routes/aiRoutes"));
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = (0, socketHandler_1.initializeSocket)(server);
const limiter = (0, express_rate_limit_1.default)({
    windowMs: environment_1.config.rateLimit.windowMs,
    max: environment_1.config.rateLimit.maxRequests,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use((0, helmet_1.default)());
app.use((0, compression_1.default)());
app.use((0, morgan_1.default)('combined'));
app.use(limiter);
app.use((0, cors_1.default)({
    origin: environment_1.config.cors.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: environment_1.config.server.nodeEnv,
    });
});
app.use('/api/auth', authRoutes_1.default);
app.use('/api/chat', chatRoutes_1.default);
app.use('/api/files', fileRoutes_1.default);
app.use('/api/ai', aiRoutes_1.default);
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method,
    });
});
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);
    if (error.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: 'File too large' });
        return;
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        res.status(400).json({ error: 'Unexpected file field' });
        return;
    }
    if (error.name === 'JsonWebTokenError') {
        res.status(401).json({ error: 'Invalid token' });
        return;
    }
    if (error.name === 'TokenExpiredError') {
        res.status(401).json({ error: 'Token expired' });
        return;
    }
    if (error.code === '23505') {
        res.status(409).json({ error: 'Resource already exists' });
        return;
    }
    if (error.code === '23503') {
        res.status(400).json({ error: 'Referenced resource not found' });
        return;
    }
    res.status(error.status || 500).json({
        error: environment_1.config.server.nodeEnv === 'production'
            ? 'Internal server error'
            : error.message,
        ...(environment_1.config.server.nodeEnv === 'development' && { stack: error.stack }),
    });
});
const startServer = async () => {
    try {
        await (0, database_1.connectDB)();
        server.listen(environment_1.config.server.port, () => {
            console.log(`
🚀 Angira Backend Server Started Successfully!

📊 Server Info:
   • Port: ${environment_1.config.server.port}
   • Environment: ${environment_1.config.server.nodeEnv}
   • Frontend URL: ${environment_1.config.cors.frontendUrl}

🗄️  Database:
   • Host: ${environment_1.config.database.host}:${environment_1.config.database.port}
   • Database: ${environment_1.config.database.name}

🌐 Available Endpoints:
   • Health Check: http://localhost:${environment_1.config.server.port}/health
   • Auth: http://localhost:${environment_1.config.server.port}/api/auth
   • Chat: http://localhost:${environment_1.config.server.port}/api/chat
   • Files: http://localhost:${environment_1.config.server.port}/api/files
   • AI: http://localhost:${environment_1.config.server.port}/api/ai

🔌 WebSocket: Socket.IO enabled for real-time communication

Ready to serve requests! 🎉
      `);
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};
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
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
startServer();

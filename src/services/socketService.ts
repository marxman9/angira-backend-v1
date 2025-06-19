import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { logger } from '../utils/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

export class SocketService {
  private io: Server;
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId

  constructor(io: Server) {
    this.io = io;
  }

  initialize() {
    // Authentication middleware for socket connections
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
        const user = await User.findById(decoded.id);

        if (!user || !user.isActive) {
          return next(new Error('Authentication error: Invalid user'));
        }

        socket.userId = user._id.toString();
        socket.username = user.username;
        next();
      } catch (error) {
        next(new Error('Authentication error: Invalid token'));
      }
    });

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });
  }

  private handleConnection(socket: AuthenticatedSocket) {
    const userId = socket.userId!;
    const username = socket.username!;

    logger.info(`User connected: ${username} (${userId})`);

    // Store user connection
    this.connectedUsers.set(userId, socket.id);

    // Join user to their personal room
    socket.join(`user:${userId}`);

    // Handle joining thread rooms
    socket.on('join_thread', (threadId: string) => {
      socket.join(`thread:${threadId}`);
      logger.info(`User ${username} joined thread: ${threadId}`);
    });

    // Handle leaving thread rooms
    socket.on('leave_thread', (threadId: string) => {
      socket.leave(`thread:${threadId}`);
      logger.info(`User ${username} left thread: ${threadId}`);
    });

    // Handle typing indicators
    socket.on('typing_start', (data: { threadId: string }) => {
      socket.to(`thread:${data.threadId}`).emit('user_typing', {
        userId,
        username,
        threadId: data.threadId
      });
    });

    socket.on('typing_stop', (data: { threadId: string }) => {
      socket.to(`thread:${data.threadId}`).emit('user_stop_typing', {
        userId,
        username,
        threadId: data.threadId
      });
    });

    // Handle message acknowledgments
    socket.on('message_delivered', (data: { messageId: string, threadId: string }) => {
      socket.to(`thread:${data.threadId}`).emit('message_status', {
        messageId: data.messageId,
        status: 'delivered',
        userId
      });
    });

    socket.on('message_read', (data: { messageId: string, threadId: string }) => {
      socket.to(`thread:${data.threadId}`).emit('message_status', {
        messageId: data.messageId,
        status: 'read',
        userId
      });
    });

    // Handle user presence
    socket.on('update_presence', (status: 'online' | 'away' | 'busy') => {
      this.io.emit('user_presence', {
        userId,
        username,
        status,
        lastSeen: new Date()
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${username} (${userId})`);
      
      // Remove from connected users
      this.connectedUsers.delete(userId);

      // Broadcast user offline status
      this.io.emit('user_presence', {
        userId,
        username,
        status: 'offline',
        lastSeen: new Date()
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error(`Socket error for user ${username}:`, error);
    });

    // Send initial connection success
    socket.emit('connected', {
      message: 'Successfully connected to Angira Chat',
      userId,
      username
    });
  }

  // Public methods for emitting events from controllers

  emitNewMessage(threadId: string, message: any) {
    this.io.to(`thread:${threadId}`).emit('new_message', message);
  }

  emitThreadUpdate(userId: string, thread: any) {
    this.io.to(`user:${userId}`).emit('thread_updated', thread);
  }

  emitNewThread(userId: string, thread: any) {
    this.io.to(`user:${userId}`).emit('new_thread', thread);
  }

  emitThreadDeleted(userId: string, threadId: string) {
    this.io.to(`user:${userId}`).emit('thread_deleted', { threadId });
  }

  emitAITyping(threadId: string, isTyping: boolean) {
    this.io.to(`thread:${threadId}`).emit('ai_typing', { isTyping });
  }

  emitFileUploadProgress(userId: string, data: { fileId: string, progress: number, status: string }) {
    this.io.to(`user:${userId}`).emit('file_upload_progress', data);
  }

  emitSystemNotification(userId: string, notification: { 
    type: 'info' | 'warning' | 'error' | 'success',
    title: string,
    message: string 
  }) {
    this.io.to(`user:${userId}`).emit('system_notification', {
      ...notification,
      timestamp: new Date()
    });
  }

  // Get online users count
  getOnlineUsersCount(): number {
    return this.connectedUsers.size;
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  // Get online users in a thread
  getThreadUsers(threadId: string): string[] {
    const room = this.io.sockets.adapter.rooms.get(`thread:${threadId}`);
    return room ? Array.from(room) : [];
  }

  // Send direct message to user
  sendToUser(userId: string, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  // Broadcast to all connected users
  broadcast(event: string, data: any) {
    this.io.emit(event, data);
  }
}

let socketService: SocketService;

export const initializeSocket = (io: Server) => {
  socketService = new SocketService(io);
  socketService.initialize();
  logger.info('Socket.IO service initialized');
  return socketService;
};

export const getSocketService = (): SocketService => {
  if (!socketService) {
    throw new Error('Socket service not initialized');
  }
  return socketService;
}; 
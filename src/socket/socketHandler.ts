import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import * as jwt from 'jsonwebtoken';
import { config } from '../config/environment';
import { query } from '../config/database';

interface AuthenticatedSocket extends Socket {
  userId?: number;
}

export const initializeSocket = (server: HttpServer): SocketIOServer => {
  const io = new SocketIOServer(server, {
    cors: {
      origin: config.cors.frontendUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication middleware for Socket.IO
  io.use(async (socket: any, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, config.jwt.secret) as any;
      
      // Verify user exists
      const userResult = await query(
        'SELECT id, username, email FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (userResult.rows.length === 0) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = decoded.userId;
      socket.user = userResult.rows[0];
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`✅ User ${socket.userId} connected via WebSocket`);

    // Join user to their personal room
    socket.join(`user_${socket.userId}`);

    // Handle joining a specific chat thread
    socket.on('join_thread', (threadId: number) => {
      socket.join(`thread_${threadId}`);
      console.log(`User ${socket.userId} joined thread ${threadId}`);
    });

    // Handle leaving a chat thread
    socket.on('leave_thread', (threadId: number) => {
      socket.leave(`thread_${threadId}`);
      console.log(`User ${socket.userId} left thread ${threadId}`);
    });

    // Handle sending a message
    socket.on('send_message', async (data: { threadId: number; content: string; fileId?: number }) => {
      try {
        const { threadId, content, fileId } = data;
        const userId = socket.userId!;

        // Verify thread belongs to user
        const threadResult = await query(
          'SELECT id FROM chat_threads WHERE id = $1 AND user_id = $2',
          [threadId, userId]
        );

        if (threadResult.rows.length === 0) {
          socket.emit('error', { message: 'Thread not found' });
          return;
        }

        // Insert user message
        const messageResult = await query(
          'INSERT INTO messages (thread_id, content, is_user, file_id) VALUES ($1, $2, $3, $4) RETURNING id, created_at',
          [threadId, content.trim(), true, fileId || null]
        );

        const userMessage = messageResult.rows[0];

        // Update thread timestamp
        await query(
          'UPDATE chat_threads SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
          [threadId]
        );

        // Emit message to thread room
        const messageData = {
          id: userMessage.id,
          content: content.trim(),
          isUser: true,
          createdAt: userMessage.created_at,
          file: fileId ? { id: fileId } : null,
        };

        io.to(`thread_${threadId}`).emit('message_received', messageData);

        // Simulate AI typing indicator
        io.to(`thread_${threadId}`).emit('ai_typing', { threadId, isTyping: true });

        // Generate AI response after a delay (placeholder)
        setTimeout(async () => {
          try {
            const aiResponse = generateMockAIResponse(content);

            // Save AI response to database
            const aiMessageResult = await query(
              'INSERT INTO messages (thread_id, content, is_user) VALUES ($1, $2, $3) RETURNING id, created_at',
              [threadId, aiResponse, false]
            );

            const aiMessage = aiMessageResult.rows[0];

            // Update thread timestamp
            await query(
              'UPDATE chat_threads SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
              [threadId]
            );

            // Stop typing indicator
            io.to(`thread_${threadId}`).emit('ai_typing', { threadId, isTyping: false });

            // Emit AI response
            const aiMessageData = {
              id: aiMessage.id,
              content: aiResponse,
              isUser: false,
              createdAt: aiMessage.created_at,
            };

            io.to(`thread_${threadId}`).emit('message_received', aiMessageData);

          } catch (error) {
            console.error('AI response error:', error);
            io.to(`thread_${threadId}`).emit('ai_typing', { threadId, isTyping: false });
            io.to(`thread_${threadId}`).emit('error', { message: 'Failed to generate AI response' });
          }
        }, 1500 + Math.random() * 2000); // Random delay between 1.5-3.5 seconds

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle AI feature requests (flashcards, mindmap, etc.)
    socket.on('ai_feature_request', async (data: { type: string; content: string; threadId?: number }) => {
      try {
        const { type, content, threadId } = data;

        // Emit processing status
        socket.emit('ai_processing', { type, isProcessing: true });

        // Simulate processing time
        setTimeout(() => {
          const result = generateMockAIFeature(content, type);
          
          socket.emit('ai_processing', { type, isProcessing: false });
          socket.emit('ai_feature_result', {
            type,
            content,
            result,
            threadId,
          });
        }, 2000 + Math.random() * 3000); // Random delay between 2-5 seconds

      } catch (error) {
        console.error('AI feature request error:', error);
        socket.emit('ai_processing', { type: data.type, isProcessing: false });
        socket.emit('error', { message: 'Failed to process AI feature request' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`❌ User ${socket.userId} disconnected from WebSocket`);
    });
  });

  return io;
};

// Mock AI response generator for WebSocket
const generateMockAIResponse = (prompt: string): string => {
  const responses = [
    `Thank you for your question about "${prompt}". Here's a comprehensive response with detailed analysis and examples.`,
    `That's an interesting point about "${prompt}". Let me break this down for you with relevant information and context.`,
    `I understand you're asking about "${prompt}". Here are the key insights and explanations you need to know.`,
    `Great question regarding "${prompt}". Let me provide you with a thorough explanation and practical examples.`,
  ];

  const randomResponse = responses[Math.floor(Math.random() * responses.length)];
  
  return `${randomResponse}

Key points to consider:
• Detailed analysis of the core concepts
• Practical applications and real-world examples
• Step-by-step breakdown of complex ideas
• Connections to related topics and concepts

This is a placeholder response that demonstrates the real-time chat functionality. The actual AI integration will provide comprehensive, context-aware responses based on your specific questions and uploaded content.

Feel free to ask follow-up questions for further clarification!`;
};

// Mock AI feature generator for WebSocket
const generateMockAIFeature = (content: string, type: string): any => {
  const features = {
    flashcards: {
      cards: [
        { front: `What is ${content}?`, back: 'Placeholder answer - AI will generate specific content' },
        { front: `Key characteristics of ${content}?`, back: 'Placeholder answer - AI will generate specific content' },
        { front: `Applications of ${content}?`, back: 'Placeholder answer - AI will generate specific content' },
      ],
    },
    mindmap: {
      central: content,
      branches: [
        { name: 'Core Concepts', items: ['Concept A', 'Concept B', 'Concept C'] },
        { name: 'Applications', items: ['Use Case 1', 'Use Case 2', 'Use Case 3'] },
        { name: 'Related Topics', items: ['Related A', 'Related B', 'Related C'] },
      ],
    },
    quiz: {
      questions: [
        {
          question: `What is the main focus of ${content}?`,
          type: 'multiple-choice',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correct: 0,
        },
        {
          question: `${content} is a fundamental concept.`,
          type: 'true-false',
          correct: true,
        },
        {
          question: `Explain the key principles of ${content}.`,
          type: 'short-answer',
        },
      ],
    },
  };

  return features[type as keyof typeof features] || { message: 'Feature not implemented yet' };
}; 
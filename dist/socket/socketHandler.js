"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSocket = void 0;
const socket_io_1 = require("socket.io");
const jwt = __importStar(require("jsonwebtoken"));
const environment_1 = require("../config/environment");
const database_1 = require("../config/database");
const initializeSocket = (server) => {
    const io = new socket_io_1.Server(server, {
        cors: {
            origin: environment_1.config.cors.frontendUrl,
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }
            const decoded = jwt.verify(token, environment_1.config.jwt.secret);
            const userResult = await (0, database_1.query)('SELECT id, username, email FROM users WHERE id = $1', [decoded.userId]);
            if (userResult.rows.length === 0) {
                return next(new Error('Authentication error: User not found'));
            }
            socket.userId = decoded.userId;
            socket.user = userResult.rows[0];
            next();
        }
        catch (error) {
            next(new Error('Authentication error: Invalid token'));
        }
    });
    io.on('connection', (socket) => {
        console.log(`✅ User ${socket.userId} connected via WebSocket`);
        socket.join(`user_${socket.userId}`);
        socket.on('join_thread', (threadId) => {
            socket.join(`thread_${threadId}`);
            console.log(`User ${socket.userId} joined thread ${threadId}`);
        });
        socket.on('leave_thread', (threadId) => {
            socket.leave(`thread_${threadId}`);
            console.log(`User ${socket.userId} left thread ${threadId}`);
        });
        socket.on('send_message', async (data) => {
            try {
                const { threadId, content, fileId } = data;
                const userId = socket.userId;
                const threadResult = await (0, database_1.query)('SELECT id FROM chat_threads WHERE id = $1 AND user_id = $2', [threadId, userId]);
                if (threadResult.rows.length === 0) {
                    socket.emit('error', { message: 'Thread not found' });
                    return;
                }
                const messageResult = await (0, database_1.query)('INSERT INTO messages (thread_id, content, is_user, file_id) VALUES ($1, $2, $3, $4) RETURNING id, created_at', [threadId, content.trim(), true, fileId || null]);
                const userMessage = messageResult.rows[0];
                await (0, database_1.query)('UPDATE chat_threads SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [threadId]);
                const messageData = {
                    id: userMessage.id,
                    content: content.trim(),
                    isUser: true,
                    createdAt: userMessage.created_at,
                    file: fileId ? { id: fileId } : null,
                };
                io.to(`thread_${threadId}`).emit('message_received', messageData);
                io.to(`thread_${threadId}`).emit('ai_typing', { threadId, isTyping: true });
                setTimeout(async () => {
                    try {
                        const aiResponse = generateMockAIResponse(content);
                        const aiMessageResult = await (0, database_1.query)('INSERT INTO messages (thread_id, content, is_user) VALUES ($1, $2, $3) RETURNING id, created_at', [threadId, aiResponse, false]);
                        const aiMessage = aiMessageResult.rows[0];
                        await (0, database_1.query)('UPDATE chat_threads SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [threadId]);
                        io.to(`thread_${threadId}`).emit('ai_typing', { threadId, isTyping: false });
                        const aiMessageData = {
                            id: aiMessage.id,
                            content: aiResponse,
                            isUser: false,
                            createdAt: aiMessage.created_at,
                        };
                        io.to(`thread_${threadId}`).emit('message_received', aiMessageData);
                    }
                    catch (error) {
                        console.error('AI response error:', error);
                        io.to(`thread_${threadId}`).emit('ai_typing', { threadId, isTyping: false });
                        io.to(`thread_${threadId}`).emit('error', { message: 'Failed to generate AI response' });
                    }
                }, 1500 + Math.random() * 2000);
            }
            catch (error) {
                console.error('Send message error:', error);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });
        socket.on('ai_feature_request', async (data) => {
            try {
                const { type, content, threadId } = data;
                socket.emit('ai_processing', { type, isProcessing: true });
                setTimeout(() => {
                    const result = generateMockAIFeature(content, type);
                    socket.emit('ai_processing', { type, isProcessing: false });
                    socket.emit('ai_feature_result', {
                        type,
                        content,
                        result,
                        threadId,
                    });
                }, 2000 + Math.random() * 3000);
            }
            catch (error) {
                console.error('AI feature request error:', error);
                socket.emit('ai_processing', { type: data.type, isProcessing: false });
                socket.emit('error', { message: 'Failed to process AI feature request' });
            }
        });
        socket.on('disconnect', () => {
            console.log(`❌ User ${socket.userId} disconnected from WebSocket`);
        });
    });
    return io;
};
exports.initializeSocket = initializeSocket;
const generateMockAIResponse = (prompt) => {
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
const generateMockAIFeature = (content, type) => {
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
    return features[type] || { message: 'Feature not implemented yet' };
};

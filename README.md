# Angira Backend Server

A comprehensive Node.js backend server for the Angira Chat Application with PostgreSQL database, JWT authentication, file uploads, and real-time WebSocket communication.

## 🚀 Features

- **Authentication & Authorization**: JWT-based user authentication with secure password hashing
- **Real-time Chat**: WebSocket integration for live messaging and AI responses
- **File Management**: Secure file upload and storage with support for images and PDFs
- **AI Integration**: Placeholder endpoints for educational AI features (flashcards, mindmaps, quizzes, etc.)
- **Database**: PostgreSQL with proper indexing and foreign key relationships
- **Security**: Rate limiting, CORS, helmet, and input validation
- **TypeScript**: Full TypeScript support for type safety

## 📋 Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## 🛠️ Installation

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Set up PostgreSQL database:**

   - Create a PostgreSQL database named `angira_chat`
   - Update database credentials in `src/config/environment.ts`

3. **Configure environment variables:**

   ```bash
   # Create .env file (optional - defaults are set in environment.ts)
   PORT=5000
   NODE_ENV=development
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=angira_chat
   DB_USER=postgres
   DB_PASSWORD=your_password
   JWT_SECRET=your_super_secret_jwt_key
   FRONTEND_URL=http://localhost:3000
   ```

4. **Build the project:**

   ```bash
   npm run build
   ```

5. **Set up database tables:**

   ```bash
   npm run db:setup
   ```

6. **Start the server:**

   ```bash
   # Development mode (auto-restart)
   npm run dev

   # Production mode
   npm start
   ```

## 🌐 API Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile (protected)

### Chat Management

- `GET /api/chat/threads` - Get chat history (protected)
- `POST /api/chat/threads` - Create new chat thread (protected)
- `GET /api/chat/threads/:id` - Get specific thread with messages (protected)
- `DELETE /api/chat/threads/:id` - Delete chat thread (protected)
- `POST /api/chat/threads/:threadId/messages` - Send message (protected)

### File Management

- `POST /api/files/upload` - Upload file (protected)
- `GET /api/files/user-files` - Get user's files (protected)
- `GET /api/files/:id` - Download specific file (protected)

### AI Features (Placeholders)

- `POST /api/ai/chat` - AI chat response (protected)
- `POST /api/ai/generate-flashcards` - Generate flashcards (protected)
- `POST /api/ai/create-mindmap` - Create mindmap (protected)
- `POST /api/ai/generate-quiz` - Generate quiz (protected)
- `POST /api/ai/summarize` - Summarize content (protected)
- `POST /api/ai/create-leitner-box` - Create Leitner box (protected)

### Utility

- `GET /health` - Health check endpoint

## 🔌 WebSocket Events

### Client → Server

- `join_thread` - Join a chat thread room
- `leave_thread` - Leave a chat thread room
- `send_message` - Send a message to a thread
- `ai_feature_request` - Request AI feature generation

### Server → Client

- `message_received` - New message in thread
- `ai_typing` - AI typing indicator
- `ai_processing` - AI feature processing status
- `ai_feature_result` - AI feature generation result
- `error` - Error notifications

## 🗄️ Database Schema

### Users Table

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Chat Threads Table

```sql
CREATE TABLE chat_threads (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Messages Table

```sql
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  thread_id INTEGER REFERENCES chat_threads(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_user BOOLEAN NOT NULL,
  file_id INTEGER REFERENCES files(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Files Table

```sql
CREATE TABLE files (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mimetype VARCHAR(255) NOT NULL,
  size INTEGER NOT NULL,
  path VARCHAR(500) NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔧 Development

### Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middleware/      # Custom middleware
├── models/          # Database models (future use)
├── routes/          # Route definitions
├── socket/          # WebSocket handlers
├── utils/           # Utility functions
└── index.ts         # Main server file
```

### Available Scripts

- `npm run dev` - Start development server with auto-restart
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run db:setup` - Set up database tables

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds for password security
- **Rate Limiting**: Prevents abuse with configurable request limits
- **CORS**: Properly configured cross-origin resource sharing
- **Helmet**: Security headers for protection against common vulnerabilities
- **Input Validation**: Comprehensive request validation
- **File Upload Security**: File type and size restrictions

## 🚨 TODO: AI Integration

The current implementation includes placeholder endpoints for AI features. To integrate with actual AI services:

1. Replace placeholder functions in `controllers/aiController.ts`
2. Add your preferred AI service (OpenAI, Anthropic, etc.)
3. Update WebSocket handlers for streaming responses
4. Implement proper content analysis for educational features

## 📝 Notes

- All endpoints (except auth) require JWT authentication
- File uploads are limited to 10MB and specific file types (.jpg, .jpeg, .png, .pdf)
- WebSocket connections require authentication tokens
- Database uses proper indexing for optimal performance
- Error handling includes specific database and validation error responses

## 🤝 Contributing

1. Follow TypeScript best practices
2. Ensure proper error handling
3. Add appropriate logging
4. Test endpoints thoroughly
5. Update documentation for new features

---

**Ready to integrate with your frontend!** 🎉

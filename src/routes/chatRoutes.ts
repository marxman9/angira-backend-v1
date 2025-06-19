import { Router } from 'express';
import { 
  getChatHistory, 
  createThread, 
  getThread, 
  sendMessage, 
  deleteThread 
} from '../controllers/chatController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All chat routes require authentication
router.use(authenticateToken);

// Chat thread routes
router.get('/threads', getChatHistory);
router.post('/threads', createThread);
router.get('/threads/:id', getThread);
router.delete('/threads/:id', deleteThread);

// Message routes
router.post('/threads/:threadId/messages', sendMessage);

export default router; 
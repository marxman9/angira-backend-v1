import { Router } from 'express';
import { 
  chatWithAI, 
  generateFlashcards, 
  createMindmap, 
  generateQuiz, 
  summarizeContent, 
  createLeitnerBox 
} from '../controllers/aiController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All AI routes require authentication
router.use(authenticateToken);

// AI chat and educational features
router.post('/chat', chatWithAI);
router.post('/generate-flashcards', generateFlashcards);
router.post('/create-mindmap', createMindmap);
router.post('/generate-quiz', generateQuiz);
router.post('/summarize', summarizeContent);
router.post('/create-leitner-box', createLeitnerBox);

export default router; 
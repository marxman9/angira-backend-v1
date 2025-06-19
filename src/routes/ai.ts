import express from 'express';
import { body, param, query } from 'express-validator';
import * as aiController from '../controllers/aiController';
import { protect } from '../middleware/auth';

const router = express.Router();

// All AI routes require authentication
router.use(protect);

// Generate AI chat response
router.post('/chat', [
  body('message')
    .isString()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Message must be between 1 and 10000 characters'),
  body('threadId')
    .optional()
    .isMongoId()
    .withMessage('Invalid thread ID'),
  body('context')
    .optional()
    .isArray()
    .withMessage('Context must be an array'),
  body('model')
    .optional()
    .isIn(['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'])
    .withMessage('Invalid AI model'),
  body('temperature')
    .optional()
    .isFloat({ min: 0, max: 2 })
    .withMessage('Temperature must be between 0 and 2')
], aiController.generateChatResponse);

// Generate flashcards
router.post('/flashcards', [
  body('topic')
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Topic must be between 1 and 200 characters'),
  body('count')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Count must be between 1 and 20'),
  body('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Difficulty must be easy, medium, or hard')
], aiController.generateFlashcards);

// Generate mind map
router.post('/mindmap', [
  body('topic')
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Topic must be between 1 and 200 characters'),
  body('depth')
    .optional()
    .isInt({ min: 2, max: 5 })
    .withMessage('Depth must be between 2 and 5')
], aiController.generateMindMap);

// Generate quiz
router.post('/quiz', [
  body('topic')
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Topic must be between 1 and 200 characters'),
  body('questionCount')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Question count must be between 1 and 20'),
  body('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Difficulty must be easy, medium, or hard'),
  body('questionTypes')
    .optional()
    .isArray()
    .withMessage('Question types must be an array')
], aiController.generateQuiz);

// Generate summary
router.post('/summary', [
  body('content')
    .isString()
    .isLength({ min: 10, max: 50000 })
    .withMessage('Content must be between 10 and 50000 characters'),
  body('length')
    .optional()
    .isIn(['short', 'medium', 'long'])
    .withMessage('Length must be short, medium, or long'),
  body('format')
    .optional()
    .isIn(['paragraph', 'bullets', 'outline'])
    .withMessage('Format must be paragraph, bullets, or outline')
], aiController.generateSummary);

// Create Leitner Box system
router.post('/leitner-box', [
  body('topic')
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Topic must be between 1 and 200 characters'),
  body('complexity')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Complexity must be beginner, intermediate, or advanced')
], aiController.createLeitnerBox);

// Analyze uploaded file content
router.post('/analyze-file', [
  body('fileContent')
    .isString()
    .isLength({ min: 10, max: 100000 })
    .withMessage('File content must be between 10 and 100000 characters'),
  body('fileName')
    .isString()
    .isLength({ min: 1, max: 255 })
    .withMessage('File name must be between 1 and 255 characters'),
  body('fileType')
    .optional()
    .isString()
    .withMessage('File type must be a string'),
  body('analysisType')
    .optional()
    .isIn(['summary', 'concepts', 'questions', 'all'])
    .withMessage('Analysis type must be summary, concepts, questions, or all')
], aiController.analyzeFile);

// Get AI usage statistics
router.get('/stats', [
  query('period')
    .optional()
    .isIn(['day', 'week', 'month', 'year'])
    .withMessage('Period must be day, week, month, or year')
], aiController.getUsageStats);

// Get supported AI models
router.get('/models', aiController.getSupportedModels);

export default router; 
import express from 'express';
import { body, param, query } from 'express-validator';
import * as threadController from '../controllers/threadController';
import { protect } from '../middleware/auth';

const router = express.Router();

// All thread routes require authentication
router.use(protect);

// Get all threads for the authenticated user
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString().withMessage('Search must be a string')
], threadController.getUserThreads);

// Create a new thread
router.post('/', [
  body('title')
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Thread title must be between 1 and 200 characters'),
  body('initialMessage')
    .optional()
    .isString()
    .isLength({ max: 10000 })
    .withMessage('Initial message cannot exceed 10000 characters')
], threadController.createThread);

// Get a specific thread by ID
router.get('/:id', [
  param('id').isMongoId().withMessage('Invalid thread ID')
], threadController.getThread);

// Update thread title
router.patch('/:id', [
  param('id').isMongoId().withMessage('Invalid thread ID'),
  body('title')
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Thread title must be between 1 and 200 characters')
], threadController.updateThread);

// Delete a thread
router.delete('/:id', [
  param('id').isMongoId().withMessage('Invalid thread ID')
], threadController.deleteThread);

// Get thread statistics
router.get('/:id/stats', [
  param('id').isMongoId().withMessage('Invalid thread ID')
], threadController.getThreadStats);

// Archive/Unarchive a thread
router.patch('/:id/archive', [
  param('id').isMongoId().withMessage('Invalid thread ID'),
  body('isActive')
    .isBoolean()
    .withMessage('isActive must be a boolean')
], threadController.toggleThreadArchive);

export default router; 
import express from 'express';
import { body, param, query } from 'express-validator';
import * as messageController from '../controllers/messageController';
import { protect } from '../middleware/auth';

const router = express.Router();

// All message routes require authentication
router.use(protect);

// Get messages for a specific thread
router.get('/thread/:threadId', [
  param('threadId').isMongoId().withMessage('Invalid thread ID'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('before').optional().isISO8601().withMessage('Before must be a valid date'),
  query('after').optional().isISO8601().withMessage('After must be a valid date')
], messageController.getThreadMessages);

// Send a new message to a thread
router.post('/thread/:threadId', [
  param('threadId').isMongoId().withMessage('Invalid thread ID'),
  body('content')
    .isString()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Message content must be between 1 and 10000 characters'),
  body('fileUrl').optional().isURL().withMessage('File URL must be valid'),
  body('fileName').optional().isString().withMessage('File name must be a string'),
  body('fileType').optional().isString().withMessage('File type must be a string')
], messageController.sendMessage);

// Get a specific message
router.get('/:id', [
  param('id').isMongoId().withMessage('Invalid message ID')
], messageController.getMessage);

// Update a message (only for user messages)
router.patch('/:id', [
  param('id').isMongoId().withMessage('Invalid message ID'),
  body('content')
    .isString()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Message content must be between 1 and 10000 characters')
], messageController.updateMessage);

// Delete a message
router.delete('/:id', [
  param('id').isMongoId().withMessage('Invalid message ID')
], messageController.deleteMessage);

// Search messages
router.get('/search', [
  query('q').isString().isLength({ min: 1 }).withMessage('Search query is required'),
  query('threadId').optional().isMongoId().withMessage('Invalid thread ID'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
], messageController.searchMessages);

// Get message statistics for a thread
router.get('/thread/:threadId/stats', [
  param('threadId').isMongoId().withMessage('Invalid thread ID')
], messageController.getMessageStats);

export default router; 
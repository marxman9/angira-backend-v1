import { Response } from 'express';
import { query } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth';

export const getChatHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const threadsResult = await query(
      `SELECT ct.id, ct.title, ct.created_at, ct.updated_at,
              (SELECT COUNT(*) FROM messages WHERE thread_id = ct.id) as message_count,
              (SELECT content FROM messages WHERE thread_id = ct.id ORDER BY created_at DESC LIMIT 1) as last_message
       FROM chat_threads ct 
       WHERE ct.user_id = $1 
       ORDER BY ct.updated_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const totalResult = await query(
      'SELECT COUNT(*) FROM chat_threads WHERE user_id = $1',
      [userId]
    );

    const total = parseInt(totalResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    res.json({
      threads: threadsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ error: 'Failed to retrieve chat history' });
  }
};

export const createThread = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { title } = req.body;

    const threadResult = await query(
      'INSERT INTO chat_threads (user_id, title) VALUES ($1, $2) RETURNING id, title, created_at',
      [userId, title || 'New Chat']
    );

    const thread = threadResult.rows[0];

    res.status(201).json({
      message: 'Thread created successfully',
      thread: {
        id: thread.id,
        title: thread.title,
        createdAt: thread.created_at,
        messages: [],
      },
    });
  } catch (error) {
    console.error('Create thread error:', error);
    res.status(500).json({ error: 'Failed to create thread' });
  }
};

export const getThread = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const threadId = parseInt(req.params.id);

    // Verify thread belongs to user
    const threadResult = await query(
      'SELECT id, title, created_at FROM chat_threads WHERE id = $1 AND user_id = $2',
      [threadId, userId]
    );

    if (threadResult.rows.length === 0) {
      res.status(404).json({ error: 'Thread not found' });
      return;
    }

    // Get messages for the thread
    const messagesResult = await query(
      `SELECT m.id, m.content, m.is_user, m.created_at, m.file_id,
              f.original_name as file_name, f.mimetype as file_type
       FROM messages m
       LEFT JOIN files f ON m.file_id = f.id
       WHERE m.thread_id = $1
       ORDER BY m.created_at ASC`,
      [threadId]
    );

    const thread = threadResult.rows[0];
    const messages = messagesResult.rows;

    res.json({
      thread: {
        id: thread.id,
        title: thread.title,
        createdAt: thread.created_at,
        messages: messages.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          isUser: msg.is_user,
          createdAt: msg.created_at,
          file: msg.file_id ? {
            id: msg.file_id,
            name: msg.file_name,
            type: msg.file_type,
          } : null,
        })),
      },
    });
  } catch (error) {
    console.error('Get thread error:', error);
    res.status(500).json({ error: 'Failed to retrieve thread' });
  }
};

export const sendMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const threadId = parseInt(req.params.threadId);
    const { content, fileId } = req.body;

    if (!content || content.trim() === '') {
      res.status(400).json({ error: 'Message content is required' });
      return;
    }

    // Verify thread belongs to user
    const threadResult = await query(
      'SELECT id FROM chat_threads WHERE id = $1 AND user_id = $2',
      [threadId, userId]
    );

    if (threadResult.rows.length === 0) {
      res.status(404).json({ error: 'Thread not found' });
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

    // Auto-generate title if this is the first message
    const messageCountResult = await query(
      'SELECT COUNT(*) FROM messages WHERE thread_id = $1',
      [threadId]
    );

    const messageCount = parseInt(messageCountResult.rows[0].count);
    if (messageCount === 1) {
      const title = content.length > 50 ? content.substring(0, 47) + '...' : content;
      await query(
        'UPDATE chat_threads SET title = $1 WHERE id = $2',
        [title, threadId]
      );
    }

    res.status(201).json({
      message: 'Message sent successfully',
      userMessage: {
        id: userMessage.id,
        content: content.trim(),
        isUser: true,
        createdAt: userMessage.created_at,
        file: fileId ? { id: fileId } : null,
      },
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

export const deleteThread = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const threadId = parseInt(req.params.id);

    const deleteResult = await query(
      'DELETE FROM chat_threads WHERE id = $1 AND user_id = $2 RETURNING id',
      [threadId, userId]
    );

    if (deleteResult.rows.length === 0) {
      res.status(404).json({ error: 'Thread not found' });
      return;
    }

    res.json({ message: 'Thread deleted successfully' });
  } catch (error) {
    console.error('Delete thread error:', error);
    res.status(500).json({ error: 'Failed to delete thread' });
  }
}; 
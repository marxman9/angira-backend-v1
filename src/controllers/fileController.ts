import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/environment';
import { query } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.upload.uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req: any, file: any, cb: any) => {
  // Allow only specific file types
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only .png, .jpg, .jpeg and .pdf format allowed!'));
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: config.upload.maxFileSize, // 10MB
  },
  fileFilter,
});

export const uploadFile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const userId = req.user!.id;
    const { filename, originalname, mimetype, size, path: filePath } = req.file;

    // Save file metadata to database
    const fileResult = await query(
      `INSERT INTO files (filename, original_name, mimetype, size, path, user_id) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, filename, original_name, mimetype, size, created_at`,
      [filename, originalname, mimetype, size, filePath, userId]
    );

    const savedFile = fileResult.rows[0];

    res.status(201).json({
      message: 'File uploaded successfully',
      file: {
        id: savedFile.id,
        filename: savedFile.filename,
        originalName: savedFile.original_name,
        mimetype: savedFile.mimetype,
        size: savedFile.size,
        createdAt: savedFile.created_at,
      },
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
};

export const getFile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const fileId = parseInt(req.params.id);
    const userId = req.user!.id;

    const fileResult = await query(
      'SELECT * FROM files WHERE id = $1 AND user_id = $2',
      [fileId, userId]
    );

    if (fileResult.rows.length === 0) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const file = fileResult.rows[0];
    res.sendFile(path.resolve(file.path));
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ error: 'Failed to retrieve file' });
  }
};

export const getUserFiles = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const filesResult = await query(
      `SELECT id, filename, original_name, mimetype, size, created_at 
       FROM files 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const totalResult = await query(
      'SELECT COUNT(*) FROM files WHERE user_id = $1',
      [userId]
    );

    const total = parseInt(totalResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    res.json({
      files: filesResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Get user files error:', error);
    res.status(500).json({ error: 'Failed to retrieve files' });
  }
}; 
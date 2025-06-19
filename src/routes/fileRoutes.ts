import { Router } from 'express';
import { upload, uploadFile, getFile, getUserFiles } from '../controllers/fileController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All file routes require authentication
router.use(authenticateToken);

// File upload and management
router.post('/upload', upload.single('file'), uploadFile);
router.get('/user-files', getUserFiles);
router.get('/:id', getFile);

export default router; 
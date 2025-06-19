"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserFiles = exports.getFile = exports.uploadFile = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const environment_1 = require("../config/environment");
const database_1 = require("../config/database");
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, environment_1.config.upload.uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${(0, uuid_1.v4)()}${path_1.default.extname(file.originalname)}`;
        cb(null, uniqueName);
    },
});
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
        return cb(null, true);
    }
    else {
        cb(new Error('Only .png, .jpg, .jpeg and .pdf format allowed!'));
    }
};
exports.upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: environment_1.config.upload.maxFileSize,
    },
    fileFilter,
});
const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }
        const userId = req.user.id;
        const { filename, originalname, mimetype, size, path: filePath } = req.file;
        const fileResult = await (0, database_1.query)(`INSERT INTO files (filename, original_name, mimetype, size, path, user_id) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, filename, original_name, mimetype, size, created_at`, [filename, originalname, mimetype, size, filePath, userId]);
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
    }
    catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({ error: 'File upload failed' });
    }
};
exports.uploadFile = uploadFile;
const getFile = async (req, res) => {
    try {
        const fileId = parseInt(req.params.id);
        const userId = req.user.id;
        const fileResult = await (0, database_1.query)('SELECT * FROM files WHERE id = $1 AND user_id = $2', [fileId, userId]);
        if (fileResult.rows.length === 0) {
            res.status(404).json({ error: 'File not found' });
            return;
        }
        const file = fileResult.rows[0];
        res.sendFile(path_1.default.resolve(file.path));
    }
    catch (error) {
        console.error('Get file error:', error);
        res.status(500).json({ error: 'Failed to retrieve file' });
    }
};
exports.getFile = getFile;
const getUserFiles = async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const filesResult = await (0, database_1.query)(`SELECT id, filename, original_name, mimetype, size, created_at 
       FROM files 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`, [userId, limit, offset]);
        const totalResult = await (0, database_1.query)('SELECT COUNT(*) FROM files WHERE user_id = $1', [userId]);
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
    }
    catch (error) {
        console.error('Get user files error:', error);
        res.status(500).json({ error: 'Failed to retrieve files' });
    }
};
exports.getUserFiles = getUserFiles;

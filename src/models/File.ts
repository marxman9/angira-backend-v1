import mongoose, { Document, Schema } from 'mongoose';

export interface IFile extends Document {
  userId: mongoose.Types.ObjectId;
  threadId?: mongoose.Types.ObjectId;
  messageId?: mongoose.Types.ObjectId;
  originalName: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  fileType: 'image' | 'document' | 'audio' | 'video' | 'other';
  isProcessed: boolean;
  extractedText?: string;
  metadata?: Record<string, any>;
  uploadStatus: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

const fileSchema = new Schema<IFile>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  threadId: {
    type: Schema.Types.ObjectId,
    ref: 'Thread',
    default: null
  },
  messageId: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  originalName: {
    type: String,
    required: [true, 'Original filename is required'],
    trim: true
  },
  fileName: {
    type: String,
    required: [true, 'Filename is required'],
    unique: true
  },
  filePath: {
    type: String,
    required: [true, 'File path is required']
  },
  fileSize: {
    type: Number,
    required: [true, 'File size is required'],
    min: [0, 'File size cannot be negative']
  },
  mimeType: {
    type: String,
    required: [true, 'MIME type is required']
  },
  fileType: {
    type: String,
    enum: ['image', 'document', 'audio', 'video', 'other'],
    required: [true, 'File type is required']
  },
  isProcessed: {
    type: Boolean,
    default: false
  },
  extractedText: {
    type: String,
    default: null
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  uploadStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
fileSchema.index({ userId: 1, createdAt: -1 });
fileSchema.index({ threadId: 1 });
fileSchema.index({ messageId: 1 });
fileSchema.index({ fileType: 1 });
fileSchema.index({ uploadStatus: 1 });
fileSchema.index({ fileName: 1 }, { unique: true });

// Auto-determine file type based on MIME type
fileSchema.pre('save', function(next) {
  if (this.isModified('mimeType')) {
    const mimeType = this.mimeType.toLowerCase();
    
    if (mimeType.startsWith('image/')) {
      this.fileType = 'image';
    } else if (mimeType.includes('pdf') || mimeType.includes('document') || 
               mimeType.includes('text') || mimeType.includes('word') ||
               mimeType.includes('spreadsheet')) {
      this.fileType = 'document';
    } else if (mimeType.startsWith('audio/')) {
      this.fileType = 'audio';
    } else if (mimeType.startsWith('video/')) {
      this.fileType = 'video';
    } else {
      this.fileType = 'other';
    }
  }
  next();
});

export const File = mongoose.model<IFile>('File', fileSchema); 
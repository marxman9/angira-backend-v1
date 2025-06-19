import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  threadId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  content: string;
  isUser: boolean;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  messageType: 'text' | 'file' | 'ai_response';
  aiModel?: string;
  tokenCount?: number;
  processingTime?: number;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>({
  threadId: {
    type: Schema.Types.ObjectId,
    ref: 'Thread',
    required: [true, 'Thread ID is required'],
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.isUser === true;
    }
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    maxlength: [10000, 'Message content cannot exceed 10000 characters']
  },
  isUser: {
    type: Boolean,
    required: true,
    index: true
  },
  fileUrl: {
    type: String,
    default: null
  },
  fileName: {
    type: String,
    default: null
  },
  fileType: {
    type: String,
    default: null
  },
  messageType: {
    type: String,
    enum: ['text', 'file', 'ai_response'],
    default: 'text'
  },
  aiModel: {
    type: String,
    default: null
  },
  tokenCount: {
    type: Number,
    default: null,
    min: [0, 'Token count cannot be negative']
  },
  processingTime: {
    type: Number,
    default: null,
    min: [0, 'Processing time cannot be negative']
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
messageSchema.index({ threadId: 1, createdAt: 1 });
messageSchema.index({ threadId: 1, isUser: 1 });
messageSchema.index({ userId: 1, createdAt: -1 });
messageSchema.index({ createdAt: -1 });

// Update thread message count after saving
messageSchema.post('save', async function() {
  try {
    await mongoose.model('Thread').findByIdAndUpdate(
      this.threadId,
      { 
        $inc: { messageCount: 1 },
        lastMessageAt: new Date()
      }
    );
  } catch (error) {
    console.error('Error updating thread message count:', error);
  }
});

export const Message = mongoose.model<IMessage>('Message', messageSchema); 
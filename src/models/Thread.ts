import mongoose, { Document, Schema } from 'mongoose';

export interface IThread extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  isActive: boolean;
  messageCount: number;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const threadSchema = new Schema<IThread>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Thread title is required'],
    trim: true,
    maxlength: [200, 'Thread title cannot exceed 200 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  messageCount: {
    type: Number,
    default: 0,
    min: [0, 'Message count cannot be negative']
  },
  lastMessageAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
threadSchema.index({ userId: 1, createdAt: -1 });
threadSchema.index({ userId: 1, lastMessageAt: -1 });
threadSchema.index({ userId: 1, isActive: 1 });

// Update lastMessageAt when message count changes
threadSchema.pre('save', function(next) {
  if (this.isModified('messageCount') && this.messageCount > 0) {
    this.lastMessageAt = new Date();
  }
  next();
});

export const Thread = mongoose.model<IThread>('Thread', threadSchema); 
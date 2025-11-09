const mongoose = require('mongoose');

const developerMessageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  messageType: {
    type: String,
    enum: ['query', 'suggestion', 'bug', 'feature', 'other'],
    default: 'other'
  },
  status: {
    type: String,
    enum: ['pending', 'replied', 'resolved', 'closed'],
    default: 'pending'
  },
  adminReply: {
    message: {
      type: String,
      maxlength: [2000, 'Reply cannot exceed 2000 characters']
    },
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    repliedAt: {
      type: Date
    }
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  }
}, {
  timestamps: true
});

// Indexes for better performance
developerMessageSchema.index({ user: 1, createdAt: -1 });
developerMessageSchema.index({ status: 1, createdAt: -1 });
developerMessageSchema.index({ messageType: 1, createdAt: -1 });
developerMessageSchema.index({ isRead: 1, createdAt: -1 });

module.exports = mongoose.models.DeveloperMessage || mongoose.model('DeveloperMessage', developerMessageSchema);


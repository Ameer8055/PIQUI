const mongoose = require('mongoose');

const hostedQuizSchema = new mongoose.Schema({
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    required: true
  },
  subCategory: {
    type: String,
    default: 'All'
  },
  questions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true
    }
  ],
  // 'pending' → waiting for admin approval
  // 'approved' → visible to users
  // 'rejected' → not visible, but kept for record
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  visibility: {
    type: String,
    enum: ['public'],
    default: 'public'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  startsAt: {
    type: Date,
    default: Date.now
  },
  endsAt: {
    type: Date,
    default: null
  },
  deletedAt: {
    type: Date,
    default: null
  },
  // For auto-cleanup of old hosted quiz sessions
  lastSessionAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

hostedQuizSchema.index({ host: 1, createdAt: -1 });
hostedQuizSchema.index({ isActive: 1, startsAt: -1 });

module.exports = mongoose.models.HostedQuiz || mongoose.model('HostedQuiz', hostedQuizSchema);



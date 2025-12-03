const mongoose = require('mongoose');

const sharedPDFSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  fileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  cloudinaryPublicId: {
    type: String,
    required: true
  },
  cloudinaryUrl: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  subject: {
    type: String,
    required: true,
    enum: [
      'India GK',
      'Kerala GK',
      'Mathematics',
      'English',
      'Malayalam',
      'Constitution',
      'Reasoning',
      'Computer',
      'Current Affairs',
      'Science'
    ]
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploaderName: {
    type: String,
    required: true
  },
  downloads: {
    type: Number,
    default: 0
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  description: {
    type: String,
    maxlength: 500,
    default: ''
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

sharedPDFSchema.index({ uploadedBy: 1, createdAt: -1 });
sharedPDFSchema.index({ subject: 1, createdAt: -1 });
sharedPDFSchema.index({ downloads: -1, createdAt: -1 });
sharedPDFSchema.index({ isApproved: 1, createdAt: -1 });

module.exports = mongoose.models.SharedPDF || mongoose.model('SharedPDF', sharedPDFSchema);


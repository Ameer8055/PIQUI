const mongoose = require('mongoose');

const typedNoteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true,
    enum: [
      'General Knowledge',
      'Mathematics',
      'English',
      'Malayalam',
      'Constitution',
      'Reasoning',
      'Computer',
      'Current Affairs'
    ]
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fontSize: {
    type: Number,
    default: 16
  },
  fontFamily: {
    type: String,
    default: 'Arial'
  },
  textColor: {
    type: String,
    default: '#000000'
  },
  paperStyle: {
    type: String,
    enum: ['college', 'wide', 'plain'],
    default: 'college'
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }
  }
}, {
  timestamps: true
});

// Create TTL index for automatic deletion after 30 days
typedNoteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

typedNoteSchema.index({ createdBy: 1, createdAt: -1 });
typedNoteSchema.index({ subject: 1, createdAt: -1 });

module.exports = mongoose.models.TypedNote || mongoose.model('TypedNote', typedNoteSchema);


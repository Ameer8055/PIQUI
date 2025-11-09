const mongoose = require('mongoose');

const quizFromPDFSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  pdfFileName: {
    type: String,
    required: false
  },
  pdfFilePath: {
    type: String,
    required: false
  },
  cloudinaryPublicId: {
    type: String,
    default: null
  },
  cloudinaryUrl: {
    type: String,
    default: null
  },
  pdfFileSize: {
    type: Number,
    required: false
  },
  // Support for notes-based quizzes
  noteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TypedNote',
    default: null
  },
  sourceType: {
    type: String,
    enum: ['pdf', 'note'],
    default: 'pdf'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  questions: [{
    question: {
      type: String,
      required: true
    },
    options: [{
      type: String,
      required: true
    }],
    correctAnswer: {
      type: Number,
      required: true
    },
    explanation: {
      type: String,
      default: ''
    }
  }],
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing'
  },
  errorMessage: {
    type: String,
    default: null
  },
  quizSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuizSession',
    default: null
  },
  pdfDeleted: {
    type: Boolean,
    default: false
  },
  fileType: {
    type: String,
    default: 'application/pdf'
  }
}, {
  timestamps: true
});

quizFromPDFSchema.index({ createdBy: 1, createdAt: -1 });
quizFromPDFSchema.index({ status: 1 });

module.exports = mongoose.models.QuizFromPDF || mongoose.model('QuizFromPDF', quizFromPDFSchema);


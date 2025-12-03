const mongoose = require('mongoose');

const quizSessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Optional reference to a hosted quiz match.
  // When set, this quiz session belongs to a specific hosted quiz
  // and can be used for rankings/leaderboards for that match.
  hostedQuiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HostedQuiz',
    default: null
  },
  questions: [{
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    },
    userAnswer: Number, // Index of user's answer
    isCorrect: Boolean,
    timeTaken: Number // in seconds
  }],
  score: {
    type: Number,
    default: 0
  },
  accuracy: {
    type: Number,
    default: 0
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  subject: {
    type: String,
    default: 'mixed'
  },
  category: {
    type: String,
    default: 'mixed'
  },
  subCategory: {
    type: String,
    default: 'All'
  },
  timeLimit: {
    type: Number, // in minutes
    default: 10
  },
  timeSpent: {
    type: Number, // in seconds
    default: 0
  },
  completed: {
    type: Boolean,
    default: false
  },
  dateTaken: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Check if model already exists before creating
module.exports = mongoose.models.QuizSession || mongoose.model('QuizSession', quizSessionSchema);
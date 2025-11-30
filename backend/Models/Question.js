const mongoose = require('mongoose');

// Check if model already exists
if (mongoose.models.Question) {
  module.exports = mongoose.models.Question;
} else {
  const questionSchema = new mongoose.Schema({
    question: {
      type: String,
      required: true,
      trim: true
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
    },
    category: {
      type: String,
      required: true,
      enum: ['kerala-gk', 'india-gk', 'mathematics', 'english', 'malayalam', 
             'constitution', 'reasoning', 'computer', 'current-affairs', 'science',
             'movies-tv', 'music', 'video-games', 'sports', 'food', 'travel', 'books', 'pop-culture']
    },
    subCategory: {
      type: String,
      default: 'All'
    },
    tags: [String],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }, {
    timestamps: true
  });

  module.exports = mongoose.model('Question', questionSchema);
}
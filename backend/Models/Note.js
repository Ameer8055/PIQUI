// models/Note.js
const mongoose = require('mongoose');

// Check if model already exists
if (mongoose.models.Note) {
  module.exports = mongoose.models.Note;
} else {
  const noteSchema = new mongoose.Schema({
    title: {
      type: String,
      required: [true, 'Note title is required'],
      trim: true,
      maxlength: [100, 'Title cannot be more than 100 characters']
    },
    content: {
      type: String,
      required: [true, 'Note content is required']
    },
    category: {
      type: String,
      required: true,
      enum: [
        'general-knowledge', 'mathematics', 'english', 'malayalam',
        'constitution', 'reasoning', 'computer', 'current-affairs',
        'formulas', 'definitions', 'important-dates', 'other'
      ],
      default: 'other'
    },
    tags: [{
      type: String,
      trim: true
    }],
    isPublic: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
    fontSize: {
      type: String,
      enum: ['small', 'medium', 'large'],
      default: 'medium'
    },
    fontStyle: {
      type: String,
      enum: ['normal', 'cursive', 'monospace'],
      default: 'normal'
    },
    paperStyle: {
      type: String,
      enum: ['lined', 'grid', 'plain'],
      default: 'lined'
    },
    colorTheme: {
      type: String,
      enum: ['blue', 'green', 'yellow', 'pink', 'purple'],
      default: 'blue'
    }
  }, {
    timestamps: true
  });

  // Index for better performance
  noteSchema.index({ createdBy: 1, createdAt: -1 });
  noteSchema.index({ category: 1 });
  noteSchema.index({ isPublic: 1 });

  module.exports = mongoose.model('Note', noteSchema);
}
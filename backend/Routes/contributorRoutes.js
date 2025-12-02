const express = require('express');
const router = express.Router();
const Question = require('../Models/Question');
const User = require('../Models/User');
const { auth } = require('../Middlewares/authMiddleware');

// Middleware to check if user has contributor access or is admin
const contributorAuth = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ status: 'error', message: 'Authentication required' });
    }
    if (!req.user.isContributor && req.user.role !== 'admin') {
      return res.status(403).json({ status: 'error', message: 'Contributor access required' });
    }
    next();
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get contributor's questions
router.get('/questions', auth, contributorAuth, async (req, res) => {
  try {
    const questions = await Question.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      status: 'success',
      data: questions
    });
  } catch (error) {
    console.error('Error fetching contributor questions:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Create a new question
router.post('/questions', auth, contributorAuth, async (req, res) => {
  try {
    const { question, options, correctAnswer, explanation, category, subCategory, tags } = req.body;

    if (!question || !options || options.length < 2 || correctAnswer === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Question, options (at least 2), and correctAnswer are required'
      });
    }

    if (correctAnswer < 0 || correctAnswer >= options.length) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid correctAnswer index'
      });
    }

    const newQuestion = new Question({
      question,
      options,
      correctAnswer,
      explanation: explanation || '',
      category: category || 'general-knowledge',
      subCategory: subCategory || 'All',
      tags: tags || [],
      createdBy: req.user._id,
      contributorName: req.user.name,
      status: 'pending',
      isActive: false
    });

    await newQuestion.save();

    // Award contributor points for submitting (will be adjusted when approved/rejected)
    const user = await User.findById(req.user._id);
    user.contributorPoints = (user.contributorPoints || 0) + 1; // 1 point for submission
    await user.save();

    res.status(201).json({
      status: 'success',
      message: 'Question submitted for review',
      data: newQuestion
    });
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Update a question (only if pending)
router.put('/questions/:id', auth, contributorAuth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({ status: 'error', message: 'Question not found' });
    }

    if (question.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ status: 'error', message: 'Not authorized to edit this question' });
    }

    // Allow editing pending questions, or approved/rejected questions (for corrections)
    if (question.status !== 'pending' && question.status !== 'approved' && question.status !== 'rejected') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot edit questions with this status'
      });
    }
    
    // If editing approved/rejected question, reset status to pending for re-review
    if (question.status === 'approved' || question.status === 'rejected') {
      question.status = 'pending';
      question.isActive = false;
    }

    const { question: questionText, options, correctAnswer, explanation, category, subCategory, tags } = req.body;

    if (questionText) question.question = questionText;
    if (options) {
      question.options = options;
      if (correctAnswer !== undefined) {
        if (correctAnswer < 0 || correctAnswer >= options.length) {
          return res.status(400).json({
            status: 'error',
            message: 'Invalid correctAnswer index'
          });
        }
        question.correctAnswer = correctAnswer;
      }
    }
    if (explanation !== undefined) question.explanation = explanation;
    if (category) question.category = category;
    if (subCategory) question.subCategory = subCategory;
    if (tags) question.tags = tags;

    await question.save();

    res.json({
      status: 'success',
      message: 'Question updated',
      data: question
    });
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Delete a question (only if pending)
router.delete('/questions/:id', auth, contributorAuth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({ status: 'error', message: 'Question not found' });
    }

    if (question.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ status: 'error', message: 'Not authorized to delete this question' });
    }

    // Allow deletion of any status question
    // If deleting approved question, adjust contributor points
    if (question.status === 'approved') {
      const user = await User.findById(req.user._id);
      if (user) {
        // Deduct 10 points for deleting an approved question
        user.contributorPoints = Math.max(0, (user.contributorPoints || 0) - 10);
        await user.save();
      }
    } else if (question.status === 'pending') {
      // Deduct 1 point for deleting a pending question (removes submission point)
      const user = await User.findById(req.user._id);
      if (user) {
        user.contributorPoints = Math.max(0, (user.contributorPoints || 0) - 1);
        await user.save();
      }
    }

    await Question.findByIdAndDelete(req.params.id);

    res.json({
      status: 'success',
      message: 'Question deleted'
    });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get contributor stats
router.get('/stats', auth, contributorAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('contributorPoints');
    const totalQuestions = await Question.countDocuments({ createdBy: req.user._id });
    const pendingQuestions = await Question.countDocuments({
      createdBy: req.user._id,
      status: 'pending'
    });
    const approvedQuestions = await Question.countDocuments({
      createdBy: req.user._id,
      status: 'approved'
    });
    const rejectedQuestions = await Question.countDocuments({
      createdBy: req.user._id,
      status: 'rejected'
    });

    res.json({
      status: 'success',
      data: {
        totalQuestions,
        pendingQuestions,
        approvedQuestions,
        rejectedQuestions,
        contributorPoints: user.contributorPoints || 0
      }
    });
  } catch (error) {
    console.error('Error fetching contributor stats:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;


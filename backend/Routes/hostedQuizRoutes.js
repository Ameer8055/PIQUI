const express = require('express');
const router = express.Router();

const HostedQuiz = require('../Models/HostedQuiz');
const Question = require('../Models/Question');
const QuizSession = require('../Models/QuizSession');
const User = require('../Models/User');
const { auth } = require('../Middlewares/authMiddleware');

// Middleware to ensure the user is a contributor or admin
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

// Create a new hosted quiz.
// This can either reference existing questionIds or create new questions on the fly.
// New hosted quizzes start in 'pending' status – admin must approve before users see them.
router.post('/', auth, contributorAuth, async (req, res) => {
  try {
    const { title, description, category, subCategory, questionIds, questions } = req.body;

    if (!title || !category) {
      return res.status(400).json({
        status: 'error',
        message: 'Title and category are required'
      });
    }

    const collectedQuestionIds = [];

    // Option 1: Use existing questions by ID
    if (Array.isArray(questionIds) && questionIds.length > 0) {
      for (const qId of questionIds) {
        if (!qId) continue;
        const existing = await Question.findById(qId);
        if (existing && existing.isActive !== false) {
          collectedQuestionIds.push(existing._id);
        }
      }
    }

    // Option 2: Create new questions that will also be visible in Quiz Browser
    if (Array.isArray(questions) && questions.length > 0) {
      for (const q of questions) {
        if (!q.question || !q.options || q.options.length < 2 || q.correctAnswer === undefined) {
          continue;
        }

        const newQuestion = new Question({
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || '',
          category: q.category || category,
          subCategory: q.subCategory || subCategory || 'All',
          tags: q.tags || [],
          createdBy: req.user._id,
          contributorName: req.user.name,
          // Directly approve & activate questions created via hosted quiz
          status: 'approved',
          isActive: true
        });

        await newQuestion.save();
        collectedQuestionIds.push(newQuestion._id);
      }
    }

    if (collectedQuestionIds.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'At least one valid question is required to create a hosted quiz'
      });
    }

    const hostedQuiz = new HostedQuiz({
      host: req.user._id,
      title,
      description: description || '',
      category,
      subCategory: subCategory || 'All',
      questions: collectedQuestionIds,
      status: 'pending'
    });

    await hostedQuiz.save();

    res.status(201).json({
      status: 'success',
      message: 'Hosted quiz created successfully',
      data: hostedQuiz
    });
  } catch (error) {
    console.error('Error creating hosted quiz:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get public hosted quizzes that are currently active and approved
router.get('/', auth, async (req, res) => {
  try {
    const now = new Date();

    const quizzes = await HostedQuiz.find({
      visibility: 'public',
      isActive: true,
      status: 'approved',
      $or: [
        { startsAt: { $lte: now }, endsAt: null },
        { startsAt: { $lte: now }, endsAt: { $gte: now } }
      ]
    })
      .populate('host', 'name avatar')
      .lean();

    const formatted = quizzes.map(q => ({
      id: q._id,
      title: q.title,
      description: q.description,
      category: q.category,
      subCategory: q.subCategory,
      questionCount: q.questions.length,
      host: {
        id: q.host?._id,
        name: q.host?.name,
        avatar: q.host?.avatar
      },
      startsAt: q.startsAt,
      endsAt: q.endsAt
    }));

    res.json({
      status: 'success',
      data: formatted
    });
  } catch (error) {
    console.error('Error fetching hosted quizzes:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get hosted quizzes created by the current contributor
router.get('/mine', auth, contributorAuth, async (req, res) => {
  try {
    const quizzes = await HostedQuiz.find({ host: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      status: 'success',
      data: quizzes
    });
  } catch (error) {
    console.error('Error fetching my hosted quizzes:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get quiz metadata and questions for playing a hosted quiz
router.get('/:id/questions', auth, async (req, res) => {
  try {
    const hostedQuiz = await HostedQuiz.findById(req.params.id)
      .populate('host', 'name avatar')
      .populate({
        path: 'questions',
        match: { isActive: true }
      })
      .lean();

    if (!hostedQuiz || !hostedQuiz.isActive || hostedQuiz.status !== 'approved') {
      return res.status(404).json({ status: 'error', message: 'Hosted quiz not found or not approved' });
    }

    // Ensure user can only attend this hosted quiz once
    const userId = req.user._id;
    const existingSession = await QuizSession.findOne({
      hostedQuiz: hostedQuiz._id,
      user: userId,
      completed: true
    }).lean();

    if (existingSession) {
      return res.status(400).json({
        status: 'error',
        message: 'You have already participated in this hosted quiz.'
      });
    }

    const questions = (hostedQuiz.questions || []).map(q => ({
      _id: q._id,
      question: q.question,
      options: q.options,
      explanation: q.explanation,
      category: q.category,
      subCategory: q.subCategory,
      contributorName: q.contributorName,
      createdBy: q.createdBy
    }));

    res.json({
      status: 'success',
      data: {
        quiz: {
          id: hostedQuiz._id,
          title: hostedQuiz.title,
          description: hostedQuiz.description,
          category: hostedQuiz.category,
          subCategory: hostedQuiz.subCategory,
          questionCount: questions.length,
          host: {
            id: hostedQuiz.host?._id,
            name: hostedQuiz.host?.name,
            avatar: hostedQuiz.host?.avatar
          }
        },
        questions: questions.map(q => ({
          ...q,
          correctAnswer: undefined // never send correct answer to client
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching hosted quiz questions:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Soft delete a hosted quiz (questions remain in database and quiz browser)
router.delete('/:id', auth, contributorAuth, async (req, res) => {
  try {
    const hostedQuiz = await HostedQuiz.findById(req.params.id);

    if (!hostedQuiz) {
      return res.status(404).json({ status: 'error', message: 'Hosted quiz not found' });
    }

    if (hostedQuiz.host.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ status: 'error', message: 'Not authorized to delete this hosted quiz' });
    }

    hostedQuiz.isActive = false;
    hostedQuiz.deletedAt = new Date();
    await hostedQuiz.save();

    // IMPORTANT: We intentionally do NOT delete the underlying questions here.
    // They stay in the Question collection and remain visible in Quiz Browser.

    res.json({
      status: 'success',
      message: 'Hosted quiz deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting hosted quiz:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get ranking/results for a hosted quiz based on completed QuizSession documents
router.get('/:id/results', auth, async (req, res) => {
  try {
    const quizId = req.params.id;
    const userId = req.user._id;

    const sessions = await QuizSession.find({
      hostedQuiz: quizId,
      completed: true
    })
      .populate('user', 'name avatar')
      .sort({ score: -1, timeSpent: 1, createdAt: 1 })
      .lean();

    const ranking = sessions.map((s, index) => ({
      rank: index + 1,
      userId: s.user?._id,
      name: s.user?.name,
      avatar: s.user?.avatar,
      score: s.score,
      totalQuestions: s.totalQuestions,
      accuracy: Math.round(s.accuracy || 0),
      timeSpent: s.timeSpent || 0,
      isCurrentUser: s.user?._id?.toString() === userId.toString()
    }));

    const currentUserEntry = ranking.find(r => r.isCurrentUser) || null;

    res.json({
      status: 'success',
      data: {
        ranking,
        currentUser: currentUserEntry
      }
    });
  } catch (error) {
    console.error('Error fetching hosted quiz results:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;



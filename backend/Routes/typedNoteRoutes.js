const express = require('express');
const router = express.Router();
const TypedNote = require('../Models/TypedNote');
const QuizFromPDF = require('../Models/QuizFromPDF');
const QuizSession = require('../Models/QuizSession');
const { auth } = require('../Middlewares/authMiddleware');
const { generateQuizFromText } = require('../Utils/aiQuizGenerator');

// Get all typed notes for user
router.get('/', auth, async (req, res) => {
  try {
    const { subject, page = 1, limit = 12 } = req.query;
    
    let query = { createdBy: req.user._id };
    
    if (subject && subject !== 'all') {
      query.subject = subject;
    }

    const notes = await TypedNote.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await TypedNote.countDocuments(query);

    // Calculate days remaining for each note
    const notesWithExpiry = notes.map(note => {
      const now = new Date();
      const expiresAt = new Date(note.expiresAt);
      const daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
      
      return {
        ...note.toObject(),
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0
      };
    });

    res.json({
      status: 'success',
      data: {
        notes: notesWithExpiry,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Create a new typed note
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, subject, fontSize, fontFamily, textColor, paperStyle } = req.body;

    if (!title || !content || !subject) {
      return res.status(400).json({ status: 'error', message: 'Title, content, and subject are required' });
    }

    // Set expiry date to 30 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const note = new TypedNote({
      title,
      content,
      subject,
      fontSize: fontSize || 16,
      fontFamily: fontFamily || 'Arial',
      textColor: textColor || '#000000',
      paperStyle: paperStyle || 'college',
      createdBy: req.user._id,
      expiresAt
    });

    await note.save();

    const now = new Date();
    const daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

    res.status(201).json({
      status: 'success',
      data: {
        ...note.toObject(),
        daysRemaining
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Update a typed note
router.put('/:id', auth, async (req, res) => {
  try {
    const note = await TypedNote.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!note) {
      return res.status(404).json({ status: 'error', message: 'Note not found' });
    }

    const now = new Date();
    const expiresAt = new Date(note.expiresAt);
    const daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

    res.json({
      status: 'success',
      data: {
        ...note.toObject(),
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Delete a typed note
router.delete('/:id', auth, async (req, res) => {
  try {
    const note = await TypedNote.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!note) {
      return res.status(404).json({ status: 'error', message: 'Note not found' });
    }

    res.json({ status: 'success', message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get a single typed note
router.get('/:id', auth, async (req, res) => {
  try {
    const note = await TypedNote.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!note) {
      return res.status(404).json({ status: 'error', message: 'Note not found' });
    }

    const now = new Date();
    const expiresAt = new Date(note.expiresAt);
    const daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

    res.json({
      status: 'success',
      data: {
        ...note.toObject(),
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Generate quiz from a typed note
router.post('/:id/generate-quiz', auth, async (req, res) => {
  try {
    const { numQuestions = 5 } = req.body;
    
    // Find the note
    const note = await TypedNote.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!note) {
      return res.status(404).json({ status: 'error', message: 'Note not found' });
    }

    // Check if note has content
    if (!note.content || note.content.trim().length < 50) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Note content is too short. Please add more content to generate a quiz.' 
      });
    }

    // Check daily limit - one quiz generation per day per user
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayQuizzes = await QuizFromPDF.countDocuments({
      createdBy: req.user._id,
      createdAt: {
        $gte: today,
        $lt: tomorrow
      }
    });

    if (todayQuizzes >= 1) {
      return res.status(429).json({
        status: 'error',
        message: 'You have reached your daily limit. You can generate only one AI quiz per day. Please try again tomorrow.'
      });
    }

    // Create quiz record with processing status
    const quizTitle = `Quiz from: ${note.title}`;
    const quizFromNote = new QuizFromPDF({
      title: quizTitle,
      noteId: note._id,
      sourceType: 'note',
      createdBy: req.user._id,
      status: 'processing'
    });

    await quizFromNote.save();

    // Generate quiz asynchronously
    (async () => {
      try {
        // Generate questions using AI
        const questions = await generateQuizFromText(
          note.content,
          parseInt(numQuestions) || 5
        );

        if (!questions || questions.length === 0) {
          throw new Error('Failed to generate questions');
        }

        // Update quiz with generated questions
        quizFromNote.questions = questions;
        quizFromNote.status = 'completed';
        await quizFromNote.save();

        // Create quiz session
        const quizSession = new QuizSession({
          user: req.user._id,
          subject: note.subject,
          questions: [],
          score: 0,
          totalQuestions: questions.length,
          completed: false
        });

        await quizSession.save();
        quizFromNote.quizSessionId = quizSession._id;
        await quizFromNote.save();

      } catch (error) {
        console.error('Error generating quiz from note:', error);
        quizFromNote.status = 'failed';
        quizFromNote.errorMessage = error.message || 'Failed to generate quiz';
        await quizFromNote.save();
      }
    })();

    res.status(201).json({
      status: 'success',
      message: 'Quiz generation started. Please check back in a few moments.',
      data: {
        id: quizFromNote._id,
        status: 'processing'
      }
    });
  } catch (error) {
    console.error('Error initiating quiz generation:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;


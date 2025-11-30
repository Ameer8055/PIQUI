const express = require('express');
const router = express.Router();
const QuizFromPDF = require('../Models/QuizFromPDF');
const QuizSession = require('../Models/QuizSession');
const { auth } = require('../Middlewares/authMiddleware');
const { upload, uploadToCloudinary, deleteFromCloudinary } = require('../Middlewares/uploadMiddleware');
const { extractTextFromFile } = require('../Utils/textExtractor');
const { generateQuizFromText } = require('../Utils/aiQuizGenerator');

// Get all quiz from PDF for user
router.get('/', auth, async (req, res) => {
  try {
    const quizzes = await QuizFromPDF.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      status: 'success',
      data: quizzes
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Upload file (PDF, DOCX, or image) and generate quiz
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'File is required' });
    }

    const { title, numQuestions = 5 } = req.body;

    if (!title) {
      return res.status(400).json({ status: 'error', message: 'Title is required' });
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

    // Determine file type
    const fileType = req.file.mimetype;
    const isImage = fileType.startsWith('image/');

    // Upload to Cloudinary
    let cloudinaryResult = null;
    try {
      cloudinaryResult = await uploadToCloudinary(req.file.buffer, 'quiz-files', fileType);
    } catch (cloudinaryError) {
      console.error('Error uploading to Cloudinary:', cloudinaryError);
      return res.status(500).json({ status: 'error', message: 'Error uploading file to cloud storage' });
    }

    // Create quiz record
    const quizFromFile = new QuizFromPDF({
      title,
      pdfFileName: req.file.originalname, // Keep field name for backward compatibility
      pdfFilePath: cloudinaryResult.secure_url,
      cloudinaryPublicId: cloudinaryResult.public_id,
      cloudinaryUrl: cloudinaryResult.secure_url,
      pdfFileSize: req.file.size,
      fileType: fileType, // Store original file type
      createdBy: req.user._id,
      status: 'processing',
      sourceType: 'pdf' // Keep as 'pdf' for backward compatibility
    });

    await quizFromFile.save();

    // Extract text and generate quiz asynchronously
    (async () => {
      try {
        // Extract text from file
        const extractedText = await extractTextFromFile(
          req.file.buffer,
          fileType,
          req.file.originalname
        );

        if (!extractedText || extractedText.trim().length < 50) {
          throw new Error('Extracted text is too short. Please ensure the file contains readable text.');
        }


        // Generate quiz questions using AI
        const questions = await generateQuizFromText(
          extractedText,
          'General Knowledge',
          parseInt(numQuestions) || 5
        );

        if (!questions || questions.length === 0) {
          throw new Error('Failed to generate questions');
        }

        // Update quiz with generated questions
        quizFromFile.questions = questions;
        quizFromFile.status = 'completed';
        await quizFromFile.save();

        // Create quiz session
        const quizSession = new QuizSession({
          user: req.user._id,
          subject: 'AI Generated',
          questions: [],
          score: 0,
          totalQuestions: questions.length,
          completed: false
        });

        await quizSession.save();
        quizFromFile.quizSessionId = quizSession._id;
        await quizFromFile.save();

        // Delete file from Cloudinary after quiz is created
        if (quizFromFile.cloudinaryPublicId) {
          try {
            const resourceType = isImage ? 'image' : 'raw';
            await deleteFromCloudinary(quizFromFile.cloudinaryPublicId, resourceType);
            quizFromFile.pdfDeleted = true;
            await quizFromFile.save();
          } catch (deleteError) {
            console.error('Error deleting file from Cloudinary:', deleteError);
          }
        }

      } catch (error) {
        console.error('Error processing file quiz:', error);
        quizFromFile.status = 'failed';
        quizFromFile.errorMessage = error.message || 'Failed to generate quiz';
        await quizFromFile.save();
      }
    })();

    res.status(201).json({
      status: 'success',
      message: 'File uploaded. Quiz is being generated...',
      data: {
        id: quizFromFile._id,
        status: 'processing'
      }
    });
  } catch (error) {
    console.error('Error uploading quiz PDF:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get quiz status and questions
router.get('/:id', auth, async (req, res) => {
  try {
    const quiz = await QuizFromPDF.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!quiz) {
      return res.status(404).json({ status: 'error', message: 'Quiz not found' });
    }

    res.json({
      status: 'success',
      data: quiz
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Start quiz session from PDF
router.post('/:id/start', auth, async (req, res) => {
  try {
    const quiz = await QuizFromPDF.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
      status: 'completed'
    });

    if (!quiz) {
      return res.status(404).json({ status: 'error', message: 'Quiz not found or not ready' });
    }

    if (!quiz.quizSessionId) {
      return res.status(400).json({ status: 'error', message: 'Quiz session not created' });
    }

    const quizSession = await QuizSession.findById(quiz.quizSessionId);

    if (!quizSession) {
      return res.status(404).json({ status: 'error', message: 'Quiz session not found' });
    }

    res.json({
      status: 'success',
      data: {
        sessionId: quizSession._id,
        quizId: quiz._id, // Include quizId for submission
        questions: quiz.questions
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Submit AI-generated quiz results
router.post('/:id/submit', auth, async (req, res) => {
  try {
    const { answers, timeSpent } = req.body; // answers is array of { questionIndex, userAnswer }
    
    const quiz = await QuizFromPDF.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
      status: 'completed'
    });

    if (!quiz) {
      return res.status(404).json({ status: 'error', message: 'Quiz not found' });
    }

    if (!quiz.questions || quiz.questions.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Quiz has no questions' });
    }

    // Calculate score
    let score = 0;
    const questionDetails = [];

    for (const answer of answers) {
      const questionIndex = answer.questionIndex;
      const question = quiz.questions[questionIndex];
      
      if (!question) {
        continue; // Skip invalid question indices
      }

      const isCorrect = question.correctAnswer === answer.userAnswer;
      if (isCorrect) score++;

      questionDetails.push({
        questionIndex: questionIndex,
        userAnswer: answer.userAnswer,
        isCorrect: isCorrect,
        timeTaken: answer.timeTaken || 0
      });
    }

    const totalQuestions = quiz.questions.length;
    const accuracy = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;

    // Update quiz session
    if (quiz.quizSessionId) {
      const quizSession = await QuizSession.findById(quiz.quizSessionId);
      if (quizSession) {
        quizSession.questions = questionDetails;
        quizSession.score = score;
        quizSession.totalQuestions = totalQuestions;
        quizSession.timeSpent = timeSpent || 0;
        quizSession.completed = true;
        await quizSession.save();
      }
    }

    // Update user stats (removed XP calculation)
    const User = require('../Models/User');
    await User.findByIdAndUpdate(req.user._id, {
      $inc: {
        'stats.quizzesCompleted': 1,
        'stats.totalQuestionsAnswered': totalQuestions,
        'stats.correctAnswers': score
      }
    });

    // Delete the quiz after completion
    try {
      await QuizFromPDF.findByIdAndDelete(quiz._id);
    } catch (deleteError) {
      console.error('Error deleting quiz after completion:', deleteError);
      // Continue even if deletion fails
    }

    res.json({
      status: 'success',
      data: {
        score,
        totalQuestions,
        accuracy: Math.round(accuracy),
        timeSpent: timeSpent || 0,
        sessionId: quiz.quizSessionId
      }
    });
  } catch (error) {
    console.error('Error submitting AI quiz:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;

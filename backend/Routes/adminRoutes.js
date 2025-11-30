const express = require('express');
const router = express.Router();
// Remove these temporarily:
// const { adminAuth } = require('../middleware/authMiddleware');
const { auth } = require('../Middlewares/authMiddleware');
const Question = require('../Models/Question');
const User = require('../Models/User');
const QuizSession = require('../Models/QuizSession'); // You'll need to create this model
const SharedPDF = require('../Models/SharedPDF');
const DeveloperMessage = require('../Models/DeveloperMessage');
const ChatMessage = require('../Models/ChatMessage');
const { deleteFromCloudinary } = require('../Middlewares/uploadMiddleware');


// Get admin dashboard stats - TEMPORARILY REMOVE adminAuth
router.get('/dashboard', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalQuestions = await Question.countDocuments();
    const activeQuestions = await Question.countDocuments({ isActive: true });
    
    res.json({
      status: 'success',
      data: {
        totalUsers,
        totalQuestions,
        activeQuestions,
        recentUsers: await User.find().sort({ createdAt: -1 }).limit(5)
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get all questions with pagination - TEMPORARILY REMOVE adminAuth
router.get('/questions', async (req, res) => {
 // In your backend route controller
  try {
    const questions = await Question.find({})
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 }); // Remove .limit() and .skip() if they exist

    res.status(200).json({
      success: true,
      data: {
        questions,
        total: questions.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching questions',
      error: error.message
    });}});

// Add new question - TEMPORARILY REMOVE adminAuth
router.post('/questions', async (req, res) => {
  try {
    const question = new Question({
      ...req.body,
      createdBy: '65d8a1b5c8e9f4a1b2c3d4e5' // Temporary user ID
    });
    
    await question.save();
    res.status(201).json({ status: 'success', data: question });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
});

// Update question - TEMPORARILY REMOVE adminAuth
router.put('/questions/:id', async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!question) {
      return res.status(404).json({ status: 'error', message: 'Question not found' });
    }
    
    res.json({ status: 'success', data: question });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
});

// Delete question (soft delete) - TEMPORARILY REMOVE adminAuth
router.delete('/questions/:id', async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    
    if (!question) {
      return res.status(404).json({ status: 'error', message: 'Question not found' });
    }
    
    res.json({ status: 'success', message: 'Question deleted permanently' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Bulk import questions - TEMPORARILY REMOVE adminAuth
router.post('/questions/bulk-import', async (req, res) => {
  try {
    const { questions, createdBy } = req.body;
    
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Questions array is required and must not be empty' 
      });
    }

    const validCategories = [
      'kerala-gk',
      'india-gk',
      'mathematics',
      'english',
      'malayalam',
      'constitution',
      'reasoning',
      'computer',
      'current-affairs',
      'science',
      'movies-tv',
      'music',
      'video-games',
      'sports',
      'food',
      'travel',
      'books',
      'pop-culture'
    ];

    const validatedQuestions = [];
    const errors = [];
    const skipped = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const rowNumber = i + 1;
      const questionErrors = [];

      // Validate required fields
      if (!q.question || typeof q.question !== 'string' || q.question.trim().length === 0) {
        questionErrors.push('Question text is required');
      }

      if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
        questionErrors.push('At least 2 options are required');
      } else if (q.options.length > 10) {
        questionErrors.push('Maximum 10 options allowed');
      } else {
        // Check for empty options
        const emptyOptions = q.options.filter(opt => !opt || typeof opt !== 'string' || opt.trim().length === 0);
        if (emptyOptions.length > 0) {
          questionErrors.push('All options must have text');
        }
      }

      if (typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer >= (q.options?.length || 0)) {
        questionErrors.push('Valid correctAnswer index is required (0-based)');
      }

      if (!q.category || !validCategories.includes(q.category)) {
        questionErrors.push(`Category must be one of: ${validCategories.join(', ')}`);
      }

      // If there are errors, add to errors array
      if (questionErrors.length > 0) {
        errors.push({
          row: rowNumber,
          question: q.question || 'N/A',
          errors: questionErrors
        });
        skipped.push(rowNumber);
        continue;
      }

      // Prepare validated question
      const validatedQuestion = {
        question: q.question.trim(),
        options: q.options.map(opt => opt.trim()),
        correctAnswer: q.correctAnswer,
        category: q.category,
        subCategory: q.subCategory || 'All',
        explanation: q.explanation ? q.explanation.trim() : '',
        tags: q.tags ? (Array.isArray(q.tags) ? q.tags : q.tags.split(',').map(t => t.trim()).filter(t => t)) : [],
        isActive: q.isActive !== undefined ? q.isActive : true,
        createdBy: createdBy || req.user?._id || '65d8a1b5c8e9f4a1b2c3d4e5'
      };

      validatedQuestions.push(validatedQuestion);
    }

    if (validatedQuestions.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No valid questions found to import',
        errors: errors,
        skipped: skipped.length
      });
    }

    // Insert validated questions
    let insertedQuestions = [];
    let insertErrors = [];

    try {
      insertedQuestions = await Question.insertMany(validatedQuestions, { ordered: false });
    } catch (insertError) {
      // Handle partial insert errors
      if (insertError.writeErrors) {
        insertErrors = insertError.writeErrors.map(err => ({
          row: err.index + 1,
          error: err.errmsg || 'Insert failed'
        }));
      }
      // Still return successfully inserted questions
      insertedQuestions = insertError.insertedDocs || [];
    }

    res.status(201).json({
      status: 'success',
      data: {
        total: questions.length,
        imported: insertedQuestions.length,
        skipped: skipped.length,
        failed: errors.length + insertErrors.length,
        errors: errors.concat(insertErrors),
        questions: insertedQuestions
      }
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message || 'Failed to import questions' 
    });
  }
});


// Get all users with pagination and filtering
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    // Build search query
    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const users = await User.find(query)
      .select('-password') // Exclude password
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get user by ID
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('stats');

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    res.json({ status: 'success', data: user });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Update user status (activate/deactivate)
router.put('/users/:id/status', async (req, res) => {
  try {
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    res.json({
      status: 'success',
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: user
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Update user role
router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ status: 'error', message: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    res.json({
      status: 'success',
      message: `User role updated to ${role}`,
      data: user
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get analytics data
router.get('/analytics', async (req, res) => {
  try {
    const { range = '7days' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (range) {
      case '7days':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    // User growth
    const userGrowth = await User.countDocuments({
      createdAt: { $gte: startDate }
    });

    // Total quizzes taken (you'll need QuizSession model)
    const totalQuizzes = await QuizSession.countDocuments({
      createdAt: { $gte: startDate }
    });

    // Average score
    const avgScoreResult = await QuizSession.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          completed: true
        }
      },
      {
        $group: {
          _id: null,
          avgScore: { $avg: '$score' }
        }
      }
    ]);
    const avgScore = avgScoreResult.length > 0 ? Math.round(avgScoreResult[0].avgScore) : 0;

    // Average time per quiz
    const avgTimeResult = await QuizSession.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          completed: true
        }
      },
      {
        $group: {
          _id: null,
          avgTime: { $avg: '$timeSpent' }
        }
      }
    ]);
    const avgTime = avgTimeResult.length > 0 ? Math.round(avgTimeResult[0].avgTime / 60) : 0; // Convert to minutes

    // Category performance
    const categoryPerformance = await QuizSession.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          completed: true
        }
      },
      {
        $unwind: '$questions'
      },
      {
        $lookup: {
          from: 'questions',
          localField: 'questions.question',
          foreignField: '_id',
          as: 'questionData'
        }
      },
      {
        $unwind: '$questionData'
      },
      {
        $group: {
          _id: '$questionData.category',
          totalQuestions: { $sum: 1 },
          correctAnswers: {
            $sum: { $cond: ['$questions.isCorrect', 1, 0] }
          },
          avgTime: { $avg: '$questions.timeTaken' }
        }
      },
      {
        $project: {
          name: '$_id',
          score: {
            $multiply: [
              { $divide: ['$correctAnswers', '$totalQuestions'] },
              100
            ]
          },
          attempts: '$totalQuestions',
          avgTime: { $round: ['$avgTime', 2] }
        }
      }
    ]);

    // User activity
    const dailyActiveUsers = await QuizSession.distinct('user', {
      createdAt: { $gte: new Date(now.setHours(0, 0, 0, 0)) }
    }).then(users => users.length);

    const weeklyActiveUsers = await QuizSession.distinct('user', {
      createdAt: { $gte: new Date(now.setDate(now.getDate() - 7)) }
    }).then(users => users.length);

    const monthlyActiveUsers = await QuizSession.distinct('user', {
      createdAt: { $gte: new Date(now.setDate(now.getDate() - 30)) }
    }).then(users => users.length);

    // Recent activity (mock data for now)
    const recentActivity = [
      {
        id: 1,
        userName: 'John Doe',
        action: 'completed a quiz on General Knowledge',
        time: '2 hours ago'
      },
      {
        id: 2,
        userName: 'Jane Smith',
        action: 'achieved level 5',
        time: '4 hours ago'
      },
      {
        id: 3,
        userName: 'Mike Johnson',
        action: 'shared study notes',
        time: '6 hours ago'
      }
    ];

    res.json({
      status: 'success',
      data: {
        userGrowth,
        totalQuizzes,
        avgScore,
        avgTime,
        categoryPerformance,
        dailyActiveUsers,
        weeklyActiveUsers,
        monthlyActiveUsers,
        recentActivity
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get dashboard overview (enhanced version)
router.get('/dashboard-overview', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalQuestions = await Question.countDocuments();
    const activeQuestions = await Question.countDocuments({ isActive: true });
    const totalQuizzes = await QuizSession.countDocuments();
    
    // Recent users with more details
    const recentUsers = await User.find()
      .select('name email role createdAt lastLogin')
      .sort({ createdAt: -1 })
      .limit(5);

    // Today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const newUsersToday = await User.countDocuments({
      createdAt: { $gte: today }
    });

    const quizzesToday = await QuizSession.countDocuments({
      createdAt: { $gte: today }
    });

    res.json({
      status: 'success',
      data: {
        totalUsers,
        totalQuestions,
        activeQuestions,
        totalQuizzes,
        newUsersToday,
        quizzesToday,
        recentUsers
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get all PDFs for admin approval (pending, approved, rejected)
router.get('/pdfs', async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let query = {};
    
    // Filter by approval status
    if (status === 'pending') {
      query.isApproved = false;
      query.rejectionReason = { $exists: false };
    } else if (status === 'approved') {
      query.isApproved = true;
    } else if (status === 'rejected') {
      query.isApproved = false;
      query.rejectionReason = { $exists: true };
    }
    
    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { uploaderName: { $regex: search, $options: 'i' } }
      ];
    }

    const pdfs = await SharedPDF.find(query)
      .populate('uploadedBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SharedPDF.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        pdfs,
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

// Approve a PDF
router.put('/pdfs/:id/approve', async (req, res) => {
  try {
    const pdf = await SharedPDF.findById(req.params.id);
    
    if (!pdf) {
      return res.status(404).json({ status: 'error', message: 'PDF not found' });
    }

    pdf.isApproved = true;
    pdf.approvedBy = req.body.adminId || req.user?._id; // You may need to pass adminId
    pdf.approvedAt = new Date();
    pdf.rejectionReason = undefined; // Clear rejection reason if any
    
    await pdf.save();
    await pdf.populate('approvedBy', 'name email');

    res.json({
      status: 'success',
      message: 'PDF approved successfully',
      data: pdf
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Reject a PDF
router.put('/pdfs/:id/reject', async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    const pdf = await SharedPDF.findById(req.params.id);
    
    if (!pdf) {
      return res.status(404).json({ status: 'error', message: 'PDF not found' });
    }

    pdf.isApproved = false;
    pdf.rejectionReason = rejectionReason || 'No reason provided';
    pdf.approvedBy = req.body.adminId || req.user?._id;
    pdf.approvedAt = new Date();
    
    await pdf.save();
    await pdf.populate('approvedBy', 'name email');

    res.json({
      status: 'success',
      message: 'PDF rejected successfully',
      data: pdf
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get PDF statistics for admin dashboard
router.get('/pdfs/stats', async (req, res) => {
  try {
    const pending = await SharedPDF.countDocuments({ 
      isApproved: false, 
      rejectionReason: { $exists: false } 
    });
    const approved = await SharedPDF.countDocuments({ isApproved: true });
    const rejected = await SharedPDF.countDocuments({ 
      isApproved: false, 
      rejectionReason: { $exists: true } 
    });
    const total = await SharedPDF.countDocuments();

    res.json({
      status: 'success',
      data: {
        pending,
        approved,
        rejected,
        total
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get all developer messages for admin
router.get('/developer-messages', async (req, res) => {
  try {
    const { status, messageType, page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = {};

    // Filter by status
    if (status && ['pending', 'replied', 'resolved', 'closed'].includes(status)) {
      query.status = status;
    }

    // Filter by message type
    if (messageType && ['query', 'suggestion', 'bug', 'feature', 'other'].includes(messageType)) {
      query.messageType = messageType;
    }

    // Search filter
    if (search) {
      query.$or = [
        { message: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
        { userEmail: { $regex: search, $options: 'i' } }
      ];
    }

    const messages = await DeveloperMessage.find(query)
      .populate('user', 'name email avatar')
      .populate('adminReply.repliedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await DeveloperMessage.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        messages,
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

// Get developer message statistics
router.get('/developer-messages/stats', async (req, res) => {
  try {
    const pending = await DeveloperMessage.countDocuments({ status: 'pending' });
    const replied = await DeveloperMessage.countDocuments({ status: 'replied' });
    const resolved = await DeveloperMessage.countDocuments({ status: 'resolved' });
    const unread = await DeveloperMessage.countDocuments({ 
      status: { $in: ['replied', 'resolved'] },
      isRead: false 
    });
    const total = await DeveloperMessage.countDocuments();

    res.json({
      status: 'success',
      data: {
        pending,
        replied,
        resolved,
        unread,
        total
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get a specific developer message
router.get('/developer-messages/:messageId', async (req, res) => {
  try {
    const message = await DeveloperMessage.findById(req.params.messageId)
      .populate('user', 'name email avatar')
      .populate('adminReply.repliedBy', 'name email');

    if (!message) {
      return res.status(404).json({
        status: 'error',
        message: 'Message not found'
      });
    }

    res.json({
      status: 'success',
      data: message
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Admin reply to a developer message
router.post('/developer-messages/:messageId/reply', async (req, res) => {
  try {
    const { reply, status: newStatus } = req.body;
    const message = await DeveloperMessage.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({
        status: 'error',
        message: 'Message not found'
      });
    }

    if (!reply || !reply.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Reply message is required'
      });
    }

    if (reply.length > 2000) {
      return res.status(400).json({
        status: 'error',
        message: 'Reply cannot exceed 2000 characters'
      });
    }

    message.adminReply = {
      message: reply.trim(),
      repliedBy: req.body.adminId || req.user?._id,
      repliedAt: new Date()
    };

    // Update status
    if (newStatus && ['pending', 'replied', 'resolved', 'closed'].includes(newStatus)) {
      message.status = newStatus;
    } else {
      message.status = 'replied';
    }

    message.isRead = false; // User hasn't read the reply yet
    await message.save();

    await message.populate([
      { path: 'user', select: 'name email avatar' },
      { path: 'adminReply.repliedBy', select: 'name email' }
    ]);

    res.json({
      status: 'success',
      message: 'Reply sent successfully',
      data: message
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Update message status
router.put('/developer-messages/:messageId/status', async (req, res) => {
  try {
    const { status } = req.body;
    const message = await DeveloperMessage.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({
        status: 'error',
        message: 'Message not found'
      });
    }

    if (!status || !['pending', 'replied', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Valid status is required'
      });
    }

    message.status = status;
    await message.save();

    res.json({
      status: 'success',
      message: 'Message status updated successfully',
      data: message
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Mark message as read (admin side)
router.put('/developer-messages/:messageId/read', async (req, res) => {
  try {
    const message = await DeveloperMessage.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({
        status: 'error',
        message: 'Message not found'
      });
    }

    // This is for admin to mark as read, user read status is handled differently
    res.json({
      status: 'success',
      data: message
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Admin delete developer message
router.delete('/developer-messages/:messageId', async (req, res) => {
  try {
    const message = await DeveloperMessage.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({
        status: 'error',
        message: 'Message not found'
      });
    }

    await DeveloperMessage.findByIdAndDelete(req.params.messageId);

    res.json({
      status: 'success',
      message: 'Message deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Admin delete PDF (can delete any PDF, even after approval)
router.delete('/pdfs/:pdfId', async (req, res) => {
  try {
    const pdf = await SharedPDF.findById(req.params.pdfId);

    if (!pdf) {
      return res.status(404).json({
        status: 'error',
        message: 'PDF not found'
      });
    }

    // Delete file from Cloudinary
    if (pdf.cloudinaryPublicId) {
      try {
        await deleteFromCloudinary(pdf.cloudinaryPublicId);
      } catch (cloudinaryError) {
        console.error('Error deleting from Cloudinary:', cloudinaryError);
        // Continue with database deletion even if Cloudinary deletion fails
      }
    }

    await SharedPDF.findByIdAndDelete(req.params.pdfId);

    res.json({
      status: 'success',
      message: 'PDF deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});


// Admin Chat Management Routes

// Get all chat messages (including deleted for admin)
router.get('/chat/messages', auth, async (req, res) => {
  try {
    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Admin access required'
      });
    }
    
    const { page = 1, limit = 50, search, showDeleted = false } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const maxLimit = Math.min(parseInt(limit), 100);

    let query = {};
    
    if (!showDeleted) {
      query.isDeleted = false;
    }

    if (search && search.trim()) {
      query.message = { $regex: search.trim(), $options: 'i' };
    }

    const messages = await ChatMessage.find(query)
      .populate('user', 'name email avatar')
      .populate('replyTo', 'message user')
      .populate('deletedBy', 'name')
      .populate('markedImportantBy', 'name')
      .sort({ isImportant: -1, createdAt: -1 })
      .skip(skip)
      .limit(maxLimit)
      .lean();

    const total = await ChatMessage.countDocuments(query);

    const formattedMessages = messages.map(msg => ({
      id: msg._id.toString(),
      user: {
        id: msg.user._id.toString(),
        name: msg.user.name,
        email: msg.user.email,
        avatar: msg.user.avatar || msg.user.name?.charAt(0)?.toUpperCase() || 'U'
      },
      message: msg.message,
      timestamp: new Date(msg.createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      }),
      date: new Date(msg.createdAt).toLocaleDateString(),
      createdAt: msg.createdAt,
      isDeleted: msg.isDeleted,
      deletedAt: msg.deletedAt,
      deletedBy: msg.deletedBy ? {
        id: msg.deletedBy._id.toString(),
        name: msg.deletedBy.name
      } : null,
      isImportant: msg.isImportant || false,
      markedImportantBy: msg.markedImportantBy ? {
        id: msg.markedImportantBy._id.toString(),
        name: msg.markedImportantBy.name
      } : null,
      markedImportantAt: msg.markedImportantAt,
      replyTo: msg.replyTo ? {
        id: msg.replyTo._id.toString(),
        message: msg.replyTo.message,
        user: {
          name: msg.replyTo.user?.name || 'Unknown'
        }
      } : null
    }));

    res.json({
      status: 'success',
      data: {
        messages: formattedMessages,
        pagination: {
          page: parseInt(page),
          limit: maxLimit,
          total,
          pages: Math.ceil(total / maxLimit)
        }
      }
    });
  } catch (error) {
    console.error('Admin chat messages error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Delete a chat message (admin only)
router.delete('/chat/messages/:messageId', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;
    
    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Admin access required'
      });
    }

    const message = await ChatMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({
        status: 'error',
        message: 'Message not found'
      });
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.deletedBy = userId;
    await message.save();

    res.json({
      status: 'success',
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Admin delete message error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Mark message as important (admin only)
router.put('/chat/messages/:messageId/important', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { isImportant } = req.body;
    const userId = req.user._id;
    
    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Admin access required'
      });
    }

    const message = await ChatMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({
        status: 'error',
        message: 'Message not found'
      });
    }

    message.isImportant = isImportant === true || isImportant === 'true';
    if (message.isImportant) {
      message.markedImportantBy = userId;
      message.markedImportantAt = new Date();
    } else {
      message.markedImportantBy = null;
      message.markedImportantAt = null;
    }
    await message.save();

    res.json({
      status: 'success',
      message: message.isImportant ? 'Message marked as important' : 'Message unmarked as important',
      data: {
        isImportant: message.isImportant
      }
    });
  } catch (error) {
    console.error('Admin mark important error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Send important message as admin
router.post('/chat/messages/send-important', auth, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user._id;
    
    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Admin access required'
      });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Message is required'
      });
    }

    if (message.length > 1000) {
      return res.status(400).json({
        status: 'error',
        message: 'Message cannot exceed 1000 characters'
      });
    }

    const chatMessage = new ChatMessage({
      user: userId,
      message: message.trim(),
      isImportant: true,
      markedImportantBy: userId,
      markedImportantAt: new Date()
    });

    await chatMessage.save();

    await chatMessage.populate([
      { path: 'user', select: 'name avatar' },
      { path: 'markedImportantBy', select: 'name' }
    ]);

    const messageData = {
      id: chatMessage._id.toString(),
      user: {
        id: chatMessage.user._id.toString(),
        name: chatMessage.user.name,
        avatar: chatMessage.user.avatar || chatMessage.user.name?.charAt(0)?.toUpperCase() || 'A'
      },
      message: chatMessage.message,
      timestamp: new Date(chatMessage.createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      }),
      createdAt: chatMessage.createdAt,
      isImportant: true,
      markedImportantBy: {
        id: chatMessage.markedImportantBy._id.toString(),
        name: chatMessage.markedImportantBy.name
      }
    };

    // Emit the important message to all connected clients via socket
    // Note: This requires access to the io instance, which should be passed from server.js
    // For now, we'll return the message data and the frontend can handle it
    
    res.json({
      status: 'success',
      message: 'Important message sent successfully',
      data: messageData
    });
  } catch (error) {
    console.error('Admin send important message error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const Question = require('../Models/Question');
const QuizSession = require('../Models/QuizSession');
const QuizBattle = require('../Models/QuizBattle');
const { auth } = require('../Middlewares/authMiddleware');

// Get question counts by category
router.get('/counts', auth, async (req, res) => {
  try {
    const categories = [
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

    const counts = await Question.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    // Create a map of category to count
    const countMap = {};
    counts.forEach(item => {
      countMap[item._id] = item.count;
    });

    // Return counts for all categories (0 if not found)
    const result = {};
    categories.forEach(category => {
      result[category] = countMap[category] || 0;
    });

    res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Question counts error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get quiz questions
router.get('/daily', auth, async (req, res) => {
  try {
    const { category = 'mixed', subCategory = 'All', limit = 10 } = req.query;
    
    let query = { isActive: true };
    
    if (category !== 'mixed') {
      query.category = category;
    }
    
    if (subCategory && subCategory !== 'All') {
      query.subCategory = subCategory;
    }
    
    // Get random questions based on filters
    const questions = await Question.aggregate([
      { $match: query },
      { $sample: { size: parseInt(limit) } },
      { $project: { 
        _id: 1,
        question: 1, 
        options: 1, 
        category: 1, 
        subCategory: 1,
        explanation: 1,
        tags: 1
      }}
    ]);
    
    res.json({
      status: 'success',
      data: {
        questions: questions.map(q => ({
          ...q,
          correctAnswer: undefined // Don't send correct answer to frontend
        }))
      }
    });
  } catch (error) {
    console.error('Quiz questions error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Submit quiz results
router.post('/submit', auth, async (req, res) => {
  try {
    const { questions, timeSpent, category, subCategory } = req.body;
    const userId = req.user._id;

    let score = 0;
    const questionDetails = [];

    // Calculate score and prepare session data
    for (const item of questions) {
      const question = await Question.findById(item.questionId);
      const isCorrect = question.correctAnswer === item.userAnswer;
      
      if (isCorrect) score++;

      questionDetails.push({
        question: item.questionId,
        userAnswer: item.userAnswer,
        isCorrect: isCorrect,
        timeTaken: item.timeTaken || 0
      });
    }

    const totalQuestions = questions.length;
    const accuracy = (score / totalQuestions) * 100;

    // Save quiz session
    const quizSession = new QuizSession({
      user: userId,
      questions: questionDetails,
      score: score,
      totalQuestions: totalQuestions,
      accuracy: accuracy,
      timeSpent: timeSpent || 0,
      category: category || 'mixed',
      subCategory: subCategory || 'All',
      completed: true
    });

    await quizSession.save();

    // Update user stats
    await updateUserStats(userId, score, totalQuestions, timeSpent);

    res.json({
      status: 'success',
      data: {
        score,
        totalQuestions,
        accuracy: Math.round(accuracy),
        timeSpent,
        sessionId: quizSession._id
      }
    });

  } catch (error) {
    console.error('Quiz submission error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get leaderboard (sorted by battle wins)
router.get('/leaderboard', auth, async (req, res) => {
  try {
    const User = require('../Models/User');
    const { limit = 50 } = req.query;
    
    const leaderboard = await User.getLeaderboard(parseInt(limit));
    
    // Get current user's rank based on battle wins (excluding admins)
    const currentUser = await User.findById(req.user._id);
    const allUsers = await User.find({ isActive: true, role: { $ne: 'admin' } })
      .select('battleStats.battlesWon battleStats.totalBattles')
      .sort({ 'battleStats.battlesWon': -1, 'battleStats.totalBattles': -1 });
    
    const userRank = allUsers.findIndex(u => u._id.toString() === req.user._id.toString()) + 1;
    
    // Format leaderboard data
    const formattedLeaderboard = leaderboard.map((user, index) => ({
      rank: index + 1,
      name: user.name,
      avatar: user.avatar,
      battlesWon: user.battleStats?.battlesWon || 0,
      totalBattles: user.battleStats?.totalBattles || 0,
      battlesLost: user.battleStats?.battlesLost || 0,
      winStreak: user.battleStats?.winStreak || 0,
      totalQuizzes: user.stats?.totalQuizzesTaken || 0,
      averageScore: user.stats?.averageScore || 0,
      isCurrentUser: user._id.toString() === req.user._id.toString()
    }));
    
    res.json({
      status: 'success',
      data: {
        leaderboard: formattedLeaderboard,
        currentUserRank: userRank,
        currentUser: {
          name: currentUser.name,
          avatar: currentUser.avatar,
          battlesWon: currentUser.battleStats?.battlesWon || 0,
          totalBattles: currentUser.battleStats?.totalBattles || 0,
          battlesLost: currentUser.battleStats?.battlesLost || 0,
          winStreak: currentUser.battleStats?.winStreak || 0,
          totalQuizzes: currentUser.stats?.totalQuizzesTaken || 0,
          averageScore: currentUser.stats?.averageScore || 0
        }
      }
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get user quiz statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await QuizSession.aggregate([
      { $match: { user: userId, completed: true } },
      {
        $group: {
          _id: null,
          totalQuizzes: { $sum: 1 },
          totalQuestions: { $sum: '$totalQuestions' },
          totalCorrect: { $sum: '$score' },
          averageScore: { $avg: '$accuracy' },
          totalTimeSpent: { $sum: '$timeSpent' },
          bestScore: { $max: '$accuracy' }
        }
      }
    ]);

    const categoryStats = await QuizSession.aggregate([
      { $match: { user: userId, completed: true } },
      {
        $group: {
          _id: '$category',
          attempts: { $sum: 1 },
          averageScore: { $avg: '$accuracy' },
          bestScore: { $max: '$accuracy' }
        }
      }
    ]);

    const defaultStats = {
      totalQuizzes: 0,
      totalQuestions: 0,
      totalCorrect: 0,
      averageScore: 0,
      totalTimeSpent: 0,
      bestScore: 0
    };

    res.json({
      status: 'success',
      data: {
        overall: stats.length > 0 ? stats[0] : defaultStats,
        byCategory: categoryStats
      }
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get recent quiz battle history for a user
router.get('/battles/history', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const userId = req.user._id;

    const battles = await QuizBattle.find({ 'players.user': userId })
      .sort({ startedAt: -1 })
      .limit(parseInt(limit))
      .lean();

    const history = battles.map((battle) => {
      const player = battle.players.find((p) => p.user.toString() === userId.toString());
      const opponent = battle.players.find((p) => p.user.toString() !== userId.toString());

      return {
        battleId: battle.battleId,
        subject: battle.subject,
        startedAt: battle.startedAt,
        endedAt: battle.endedAt,
        duration: battle.duration,
        score: player?.score || 0,
        opponentScore: opponent?.score || 0,
        opponent: opponent ? {
          userId: opponent.user,
          name: opponent.name,
          avatar: opponent.avatar
        } : null,
        result: battle.isTie
          ? 'tie'
          : battle.winner && battle.winner.toString() === userId.toString()
            ? 'win'
            : 'loss'
      };
    });

    res.json({
      status: 'success',
      data: history
    });
  } catch (error) {
    console.error('Battle history error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Helper function to update user stats
const updateUserStats = async (userId, score, totalQuestions, timeSpent) => {
  try {
    const User = require('../Models/User');
    
    await User.findByIdAndUpdate(userId, {
      $inc: {
        'stats.totalQuizzesTaken': 1,
        'stats.totalQuestionsAttempted': totalQuestions,
        'stats.correctAnswers': score,
        'stats.incorrectAnswers': totalQuestions - score,
        'stats.totalStudyTime': Math.round(timeSpent / 60) // Convert to minutes
      }
    });

    // Recalculate average score
    const user = await User.findById(userId);
    const totalAttempted = user.stats.totalQuestionsAttempted;
    const totalCorrect = user.stats.correctAnswers;
    
    if (totalAttempted > 0) {
      user.stats.averageScore = (totalCorrect / totalAttempted) * 100;
      await user.save();
    }

  } catch (error) {
    console.error('Update user stats error:', error);
  }
};

module.exports = router;
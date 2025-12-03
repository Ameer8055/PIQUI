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
      { $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: '_id',
        as: 'creator'
      }},
      { $unwind: { path: '$creator', preserveNullAndEmptyArrays: true }},
      { $project: { 
        _id: 1,
        question: 1, 
        options: 1, 
        category: 1, 
        subCategory: 1,
        explanation: 1,
        tags: 1,
        contributorName:1,
        createdBy: 1
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

// Submit quiz results (daily/fun/hosted quizzes)
router.post('/submit', auth, async (req, res) => {
  try {
    const { questions, timeSpent, category, subCategory, totalQuestions: requestedTotalQuestions, hostedQuizId } = req.body;
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

    // Use requested totalQuestions if provided (actual questions presented), otherwise use submitted answers length
    const totalQuestions = requestedTotalQuestions || questions.length;
    const accuracy = (score / totalQuestions) * 100;

    // Save quiz session
    const quizSession = new QuizSession({
      user: userId,
      hostedQuiz: hostedQuizId || null,
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

    // Update lastSessionAt on hosted quiz for cleanup tracking
    if (hostedQuizId) {
      try {
        const HostedQuiz = require('../Models/HostedQuiz');
        await HostedQuiz.findByIdAndUpdate(hostedQuizId, {
          lastSessionAt: new Date()
        });
      } catch (updateErr) {
        console.error('Error updating hosted quiz lastSessionAt:', updateErr);
      }
    }

    // Update user stats
    await updateUserStats(userId, score, totalQuestions, timeSpent);

    res.json({
      status: 'success',
      data: {
        score,
        totalQuestions,
        accuracy: Math.round(accuracy),
        timeSpent,
        sessionId: quizSession._id,
        hostedQuizId: hostedQuizId || null
      }
    });

  } catch (error) {
    console.error('Quiz submission error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get leaderboard (sorted by points)
router.get('/leaderboard', auth, async (req, res) => {
  try {
    const User = require('../Models/User');
    const { limit = 50 } = req.query;
    
    // Get leaderboard sorted by points
    const allUsers = await User.find({ isActive: true, role: { $ne: 'admin' } })
      .select('name avatar points battleStats stats')
      .sort({ points: -1 })
      .limit(parseInt(limit));
    
    // Get current user's rank
    const currentUser = await User.findById(req.user._id);
    const allUsersForRank = await User.find({ isActive: true, role: { $ne: 'admin' } })
      .select('points')
      .sort({ points: -1 });
    
    const userRank = allUsersForRank.findIndex(u => u._id.toString() === req.user._id.toString()) + 1;
    
    // Format leaderboard data
    const formattedLeaderboard = allUsers.map((user, index) => ({
      rank: index + 1,
      name: user.name,
      avatar: user.avatar,
      points: user.points || 0,
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
          points: currentUser.points || 0,
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
    const User = require('../Models/User');
    const userId = req.user._id;
    const user = await User.findById(userId);

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

    // Get today's daily progress
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let dailyProgress = user.dailyProgress.find(p => {
      const pDate = new Date(p.date);
      pDate.setHours(0, 0, 0, 0);
      return pDate.getTime() === today.getTime();
    });

    // If no daily progress for today, create one with random goal
    if (!dailyProgress) {
      const dailyGoal = Math.floor(Math.random() * 11) + 5; // Random between 5-15
      dailyProgress = {
        date: today,
        questionsCompleted: 0,
        studyTime: 0,
        goalsAchieved: false,
        subjectsPracticed: [],
        pointsEarned: 0,
        dailyGoal: dailyGoal
      };
    }

    res.json({
      status: 'success',
      data: {
        overall: stats.length > 0 ? stats[0] : defaultStats,
        dailyGoal: {
          goal: dailyProgress.dailyGoal,
          completed: dailyProgress.questionsCompleted,
          achieved: dailyProgress.goalsAchieved,
          pointsEarned: dailyProgress.pointsEarned || 0
        },
        points: user.points || 0,
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

// Get combined recent activity (quiz sessions + quiz battles)
router.get('/recent-activity', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit, 10) || 10;

    // Recent quiz sessions for this user
    const sessions = await QuizSession.find({ user: userId, completed: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const quizActivities = sessions.map(session => ({
      type: 'quiz',
      date: session.createdAt || session.dateTaken,
      category: session.category,
      subCategory: session.subCategory,
      score: session.score,
      totalQuestions: session.totalQuestions,
      accuracy: Math.round(session.accuracy || 0),
      hostedQuizId: session.hostedQuiz || null
    }));

    // Recent quiz battles (reuse same logic as /battles/history but smaller default)
    const battles = await QuizBattle.find({ 'players.user': userId })
      .sort({ startedAt: -1 })
      .limit(limit)
      .lean();

    const battleActivities = battles.map(battle => {
      const player = battle.players.find(p => p.user.toString() === userId.toString());
      const opponent = battle.players.find(p => p.user.toString() !== userId.toString());

      return {
        type: 'battle',
        date: battle.endedAt || battle.startedAt,
        subject: battle.subject,
        score: player?.score || 0,
        opponentScore: opponent?.score || 0,
        opponent: opponent
          ? {
              userId: opponent.user,
              name: opponent.name,
              avatar: opponent.avatar
            }
          : null,
        result: battle.isTie
          ? 'tie'
          : battle.winner && battle.winner.toString() === userId.toString()
            ? 'win'
            : 'loss'
      };
    });

    // Combine, sort by date desc, and limit overall
    const combined = [...quizActivities, ...battleActivities]
      .filter(a => a.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit);

    res.json({
      status: 'success',
      data: combined
    });
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Helper function to update user stats
const updateUserStats = async (userId, score, totalQuestions, timeSpent) => {
  try {
    const User = require('../Models/User');
    const user = await User.findById(userId);
    
    // Calculate points: 1 point per correct answer (minimal, more valuable scores)
    const pointsEarned = score * 1;
    
    // Update basic stats
    user.stats.totalQuizzesTaken += 1;
    user.stats.totalQuestionsAttempted += totalQuestions;
    user.stats.correctAnswers += score;
    user.stats.incorrectAnswers += (totalQuestions - score);
    user.stats.totalStudyTime += Math.round(timeSpent / 60);
    
    // Update points
    user.points = (user.points || 0) + pointsEarned;
    
    // Recalculate average score
    const totalAttempted = user.stats.totalQuestionsAttempted;
    const totalCorrect = user.stats.correctAnswers;
    
    if (totalAttempted > 0) {
      user.stats.averageScore = (totalCorrect / totalAttempted) * 100;
    }

    // Update daily progress
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let dailyProgress = user.dailyProgress.find(p => {
      const pDate = new Date(p.date);
      pDate.setHours(0, 0, 0, 0);
      return pDate.getTime() === today.getTime();
    });

    if (!dailyProgress) {
      // Generate new daily goal (random between 5-15 questions)
      const dailyGoal = Math.floor(Math.random() * 11) + 5;
      dailyProgress = {
        date: today,
        questionsCompleted: 0,
        studyTime: 0,
        goalsAchieved: false,
        subjectsPracticed: [],
        pointsEarned: 0,
        dailyGoal: dailyGoal
      };
      user.dailyProgress.push(dailyProgress);
    }

    dailyProgress.questionsCompleted += totalQuestions;
    dailyProgress.pointsEarned += pointsEarned;
    dailyProgress.studyTime += Math.round(timeSpent / 60);
    
    // Check if daily goal is achieved
      if (dailyProgress.questionsCompleted >= dailyProgress.dailyGoal && !dailyProgress.goalsAchieved) {
      dailyProgress.goalsAchieved = true;
      // Small bonus points for completing daily goal
      const bonusPoints = 5;
      user.points += bonusPoints;
      dailyProgress.pointsEarned += bonusPoints;
      
      // Update streak
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const lastStreakDate = user.stats.lastStreakDate ? new Date(user.stats.lastStreakDate) : null;
      
      if (lastStreakDate) {
        const lastStreakDay = new Date(lastStreakDate);
        lastStreakDay.setHours(0, 0, 0, 0);
        
        if (lastStreakDay.getTime() === yesterday.getTime()) {
          // Continuing streak
          user.stats.currentStreak += 1;
        } else {
          // New streak
          user.stats.currentStreak = 1;
        }
      } else {
        // First streak
        user.stats.currentStreak = 1;
      }
      
      user.stats.lastStreakDate = today;
      if (user.stats.currentStreak > user.stats.bestStreak) {
        user.stats.bestStreak = user.stats.currentStreak;
      }
    }

    await user.save();

  } catch (error) {
    console.error('Update user stats error:', error);
  }
};

// Get contributor leaderboard (public route)
router.get('/contributors/leaderboard', auth, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const User = require('../Models/User');
    
    const contributors = await User.find({ isContributor: true })
      .select('name avatar contributorPoints')
      .sort({ contributorPoints: -1 })
      .limit(parseInt(limit))
      .lean();
    
    const leaderboard = contributors.map((contributor, index) => ({
      rank: index + 1,
      name: contributor.name,
      avatar: contributor.avatar || contributor.name?.charAt(0)?.toUpperCase() || 'U',
      contributorPoints: contributor.contributorPoints || 0
    }));
    
    res.json({
      status: 'success',
      data: {
        leaderboard
      }
    });
  } catch (error) {
    console.error('Contributor leaderboard error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;
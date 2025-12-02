const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

if (mongoose.models.User) {
  module.exports = mongoose.models.User;
} else {
const userSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: {
      validator: function(email) {
        return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
      },
      message: 'Please provide a valid email'
    }
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  phone: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^[0-9]{10}$/.test(v);
      },
      message: 'Phone number must be 10 digits'
    }
  },

  // PSC Specific Information
  pscStream: {
    type: String,
    enum: ['ldc', 'degree', 'plus-two', 'tenth', 'police', 'secretariat', 'other'],
    default: 'other'
  },
  targetExams: [{
    examName: String,
    examDate: Date,
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium'
    }
  }],

  // Role and Status
  role: {
    type: String,
    enum: ['user', 'admin', 'contributor'],
    default: 'user'
  },
  // Per-user contributor access (admin can enable/disable without changing role)
  isContributor: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  resetPasswordOtp: {
    type: String,
    select: false
  },
  resetPasswordOtpExpires: Date,
  resetPasswordOtpAttempts: {
    type: Number,
    default: 0
  },

  // Profile and Appearance
  avatar: {
    type: String,
    default: function() {
      return this.name ? this.name.charAt(0).toUpperCase() : 'U';
    }
  },
  bio: {
    type: String,
    maxlength: [200, 'Bio cannot be more than 200 characters']
  },

  // Dates and Activity
  registrationDate: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  emailVerifiedAt: Date,

  // Quiz Statistics and Progress
  stats: {
    totalQuizzesTaken: {
      type: Number,
      default: 0
    },
    totalQuestionsAttempted: {
      type: Number,
      default: 0
    },
    correctAnswers: {
      type: Number,
      default: 0
    },
    incorrectAnswers: {
      type: Number,
      default: 0
    },
    averageScore: {
      type: Number,
      default: 0
    },
    averageTimePerQuestion: {
      type: Number,
      default: 0
    },
    totalStudyTime: { // in minutes
      type: Number,
      default: 0
    },
    currentStreak: {
      type: Number,
      default: 0
    },
    bestStreak: {
      type: Number,
      default: 0
    },
    lastStreakDate: Date
  },

  // XP and Level System
  xp: {
    totalXP: {
      type: Number,
      default: 0
    },
    level: {
      type: Number,
      default: 1
    },
    xpToNextLevel: {
      type: Number,
      default: 100
    },
    achievements: [{
      achievementId: String,
      name: String,
      description: String,
      earnedAt: Date,
      xpReward: Number
    }]
  },

  // Subject-wise Performance
  subjectPerformance: [{
    subject: {
      type: String,
      enum: ['general-knowledge', 'mathematics', 'english', 'malayalam', 
             'constitution', 'reasoning', 'computer', 'current-affairs']
    },
    totalQuestions: {
      type: Number,
      default: 0
    },
    correctAnswers: {
      type: Number,
      default: 0
    },
    averageScore: {
      type: Number,
      default: 0
    },
    weakAreas: [String],
    lastPracticed: Date,
    proficiency: { // 0-100 percentage
      type: Number,
      default: 0
    }
  }],

  // Battle Statistics
  battleStats: {
    totalBattles: {
      type: Number,
      default: 0
    },
    battlesWon: {
      type: Number,
      default: 0
    },
    battlesLost: {
      type: Number,
      default: 0
    },
    battlesTied: {
      type: Number,
      default: 0
    },
    winStreak: {
      type: Number,
      default: 0
    },
    bestWinStreak: {
      type: Number,
      default: 0
    },
    totalBattlePoints: {
      type: Number,
      default: 0
    },
    averageBattleScore: {
      type: Number,
      default: 0
    }
  },

  // Notes and Content
  notesStats: {
    totalNotesCreated: {
      type: Number,
      default: 0
    },
    notesShared: {
      type: Number,
      default: 0
    },
    totalLikesReceived: {
      type: Number,
      default: 0
    },
    totalDownloadsReceived: {
      type: Number,
      default: 0
    }
  },

  // Daily Goals and Progress
  dailyGoals: {
    questionsPerDay: {
      type: Number,
      default: 10
    },
    studyTimePerDay: { // in minutes
      type: Number,
      default: 30
    },
    streakGoal: {
      type: Number,
      default: 7
    }
  },

  // Daily Progress Tracking
  dailyProgress: [{
    date: Date,
    questionsCompleted: {
      type: Number,
      default: 0
    },
    studyTime: {
      type: Number,
      default: 0
    },
    goalsAchieved: {
      type: Boolean,
      default: false
    },
    subjectsPracticed: [String],
    pointsEarned: {
      type: Number,
      default: 0
    },
    dailyGoal: {
      type: Number,
      default: 10
    }
  }],

  // Points System
  points: {
    type: Number,
    default: 0
  },
  // Contributor Points System (separate from regular points)
  contributorPoints: {
    type: Number,
    default: 0
  },

  // Preferences and Settings
  preferences: {
    notifications: {
      dailyReminder: {
        type: Boolean,
        default: true
      },
      battleInvites: {
        type: Boolean,
        default: true
      },
      newContent: {
        type: Boolean,
        default: true
      },
      progressReports: {
        type: Boolean,
        default: true
      }
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    language: {
      type: String,
      enum: ['english', 'malayalam'],
      default: 'english'
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard', 'adaptive'],
      default: 'medium'
    },
    autoSaveNotes: {
      type: Boolean,
      default: true
    },
    showExplanations: {
      type: Boolean,
      default: true
    }
  },

  // Social and Community
  social: {
    followers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    following: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    bio: String,
    website: String,
    isPublic: {
      type: Boolean,
      default: true
    }
  },

  // Rewards and Badges
  badges: [{
    badgeId: String,
    name: String,
    description: String,
    icon: String,
    earnedAt: Date,
    category: String
  }],

  // Learning Path
  learningPath: {
    currentModule: String,
    completedModules: [String],
    recommendedSubjects: [String],
    skillLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner'
    }
  }

}, {
  timestamps: true
});

// Indexes for better performance
// Note: email index is automatically created by unique: true, so we don't need to define it again
userSchema.index({ role: 1 });
userSchema.index({ 'battleStats.totalBattlePoints': -1 });
userSchema.index({ 'battleStats.battlesWon': -1 });
userSchema.index({ pscStream: 1 });
userSchema.index({ lastActive: -1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Pre-save middleware to generate avatar
userSchema.pre('save', function(next) {
  if (this.isModified('name') && this.name) {
    this.avatar = this.name.charAt(0).toUpperCase();
  }
  next();
});

// Instance method to check password
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Instance method to update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  this.lastActive = new Date();
  return this.save();
};

// Instance method to update activity
userSchema.methods.updateActivity = function() {
  this.lastActive = new Date();
  return this.save();
};

// Instance method to calculate level from XP
userSchema.methods.calculateLevel = function() {
  const level = Math.floor(0.1 * Math.sqrt(this.xp.totalXP)) + 1;
  this.xp.level = Math.min(level, 100); // Cap at level 100
  this.xp.xpToNextLevel = Math.pow((this.xp.level + 1) * 10, 2);
  return this.save();
};

// Instance method to add XP
userSchema.methods.addXP = function(amount, reason) {
  this.xp.totalXP += amount;
  this.calculateLevel();
  
  // Check for level-up achievements
  this.checkLevelAchievements();
  
  return this.save();
};

// Instance method to check level achievements
userSchema.methods.checkLevelAchievements = function() {
  const level = this.xp.level;
  
  // Example achievement checks
  if (level >= 5 && !this.xp.achievements.some(a => a.achievementId === 'level_5')) {
    this.xp.achievements.push({
      achievementId: 'level_5',
      name: 'Rising Star',
      description: 'Reached level 5',
      earnedAt: new Date(),
      xpReward: 50
    });
    this.xp.totalXP += 50;
  }
  
  if (level >= 10 && !this.xp.achievements.some(a => a.achievementId === 'level_10')) {
    this.xp.achievements.push({
      achievementId: 'level_10',
      name: 'Quiz Enthusiast',
      description: 'Reached level 10',
      earnedAt: new Date(),
      xpReward: 100
    });
    this.xp.totalXP += 100;
  }
};

// Instance method to update subject performance
userSchema.methods.updateSubjectPerformance = function(subject, isCorrect, timeTaken) {
  let subjectPerf = this.subjectPerformance.find(s => s.subject === subject);
  
  if (!subjectPerf) {
    subjectPerf = {
      subject: subject,
      totalQuestions: 0,
      correctAnswers: 0,
      averageScore: 0,
      weakAreas: [],
      lastPracticed: new Date(),
      proficiency: 0
    };
    this.subjectPerformance.push(subjectPerf);
  }
  
  subjectPerf.totalQuestions += 1;
  if (isCorrect) {
    subjectPerf.correctAnswers += 1;
  }
  subjectPerf.averageScore = (subjectPerf.correctAnswers / subjectPerf.totalQuestions) * 100;
  subjectPerf.lastPracticed = new Date();
  subjectPerf.proficiency = subjectPerf.averageScore;
  
  return this.save();
};

// Instance method to update battle stats
userSchema.methods.updateBattleStats = function(isWinner, isTie = false, pointsEarned = 0) {
  this.battleStats.totalBattles += 1;
  
  if (isTie) {
    this.battleStats.battlesTied += 1;
    this.battleStats.winStreak = 0;
    // Award 25 points for tie
    this.points = (this.points || 0) + 25;
  } else if (isWinner) {
    this.battleStats.battlesWon += 1;
    this.battleStats.winStreak += 1;
    this.battleStats.bestWinStreak = Math.max(this.battleStats.bestWinStreak, this.battleStats.winStreak);
    // Award 100 points for win
    this.points = (this.points || 0) + 100;
  } else {
    this.battleStats.battlesLost += 1;
    this.battleStats.winStreak = 0;
    // Award 10 points for participation
    this.points = (this.points || 0) + 10;
  }
  
  this.battleStats.totalBattlePoints += pointsEarned;
  this.battleStats.averageBattleScore = this.battleStats.totalBattlePoints / this.battleStats.totalBattles;
  
  return this.save();
};

// Static method to get leaderboard (sorted by battle wins)
userSchema.statics.getLeaderboard = function(limit = 50) {
  return this.find({ isActive: true, role: { $ne: 'admin' } })
    .select('name avatar stats battleStats subjectPerformance')
    .sort({ 'battleStats.battlesWon': -1, 'battleStats.totalBattles': -1 })
    .limit(limit);
};

// Static method to find admin
userSchema.statics.findAdmin = function() {
  return this.findOne({ role: 'admin', isActive: true });
};

// Static method to create admin (for initialization)
userSchema.statics.createAdmin = async function(adminData) {
  const existingAdmin = await this.findAdmin();
  if (existingAdmin) {
    return existingAdmin;
  }
  
  const admin = new this({
    ...adminData,
    role: 'admin',
    isVerified: true
  });
  
  return await admin.save();
};

module.exports=mongoose.model('User', userSchema)
}
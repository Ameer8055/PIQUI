const mongoose = require('mongoose');

const playerAnswerSchema = new mongoose.Schema(
  {
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true
    },
    answerIndex: {
      type: Number,
      default: -1
    },
    isCorrect: {
      type: Boolean,
      default: false
    },
    responseTime: {
      type: Number,
      default: 0
    },
    awardedPoint: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const battlePlayerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    avatar: {
      type: String,
      default: ''
    },
    score: {
      type: Number,
      default: 0
    },
    answers: {
      type: [playerAnswerSchema],
      default: []
    }
  },
  { _id: false }
);

const quizBattleSchema = new mongoose.Schema(
  {
    battleId: {
      type: String,
      required: true,
      unique: true
    },
    subject: {
      type: String,
      required: true
    },
    questionCount: {
      type: Number,
      default: 10
    },
    questions: [
      {
        question: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Question',
          required: true
        },
        correctAnswer: {
          type: Number,
          required: true
        }
      }
    ],
    players: {
      type: [battlePlayerSchema],
      default: []
    },
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    isTie: {
      type: Boolean,
      default: false
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    endedAt: {
      type: Date,
      default: null
    },
    duration: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Note: battleId index is automatically created by unique: true, so we don't need to define it again
quizBattleSchema.index({ subject: 1, startedAt: -1 });
quizBattleSchema.index({ 'players.user': 1, startedAt: -1 });

module.exports = mongoose.models.QuizBattle || mongoose.model('QuizBattle', quizBattleSchema);


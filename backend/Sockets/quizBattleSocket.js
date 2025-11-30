const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../Models/User');
const Question = require('../Models/Question');
const QuizBattle = require('../Models/QuizBattle');

const QUESTION_COUNT = 10;
const QUESTION_TIME_LIMIT = 15 * 1000; // 15 seconds in ms
const COUNTDOWN_TIME = 3 * 1000;
const INTERMISSION_TIME = 2 * 1000;

const VALID_SUBJECTS = new Set([
  'kerala-gk',
  'india-gk',
  'mathematics',
  'english',
  'malayalam',
  'constitution',
  'reasoning',
  'computer',
  'current-affairs',
  'science'
]);

const sanitizeQuestionForClient = (question, index, total) => ({
  questionId: question._id.toString(),
  sequence: index + 1,
  total,
  question: question.question,
  options: question.options,
  timeLimit: QUESTION_TIME_LIMIT / 1000
});

const extractSocketToken = (socket) => {
  if (socket.handshake.auth && socket.handshake.auth.token) {
    return socket.handshake.auth.token;
  }

  const headerToken = socket.handshake.headers?.authorization;
  if (headerToken && headerToken.startsWith('Bearer ')) {
    return headerToken.replace('Bearer ', '').trim();
  }

  return null;
};

module.exports = function registerQuizBattleSocket(io) {
  const battleQueues = new Map();
  const activeBattles = new Map();
  const socketToBattle = new Map();
  const socketToQueueSubject = new Map();

  const getQueue = (subject) => {
    if (!battleQueues.has(subject)) {
      battleQueues.set(subject, []);
    }
    return battleQueues.get(subject);
  };

  const broadcastQueueUpdate = (subject) => {
    const queue = getQueue(subject);
    queue.forEach((entry, index) => {
      io.to(entry.socketId).emit('battle:queue_update', {
        subject,
        position: index + 1,
        size: queue.length
      });
    });
  };

  const removeFromQueue = (socketId, subject) => {
    if (!subject) {
      subject = socketToQueueSubject.get(socketId);
    }
    if (!subject) return;

    const queue = getQueue(subject);
    const index = queue.findIndex((entry) => entry.socketId === socketId);
    if (index !== -1) {
      queue.splice(index, 1);
      broadcastQueueUpdate(subject);
    }
    socketToQueueSubject.delete(socketId);
  };

  const clearBattleTimers = (battle) => {
    if (!battle) return;
    if (battle.countdownTimer) {
      clearTimeout(battle.countdownTimer);
      battle.countdownTimer = null;
    }
    if (battle.currentQuestionState?.timer) {
      clearTimeout(battle.currentQuestionState.timer);
      battle.currentQuestionState.timer = null;
    }
    if (battle.nextQuestionTimer) {
      clearTimeout(battle.nextQuestionTimer);
      battle.nextQuestionTimer = null;
    }
  };

  const finalizeQuestion = (battleId) => {
    const battle = activeBattles.get(battleId);
    if (!battle || battle.status !== 'in-progress') return;

    const state = battle.currentQuestionState;
    if (!state) return;

    clearTimeout(state.timer);
    state.timer = null;

    const question = battle.questions[battle.currentQuestionIndex];
    const answersPayload = [];

    Object.values(battle.players).forEach((playerState) => {
      let answerRecord = playerState.answers[battle.currentQuestionIndex];
      if (!answerRecord || answerRecord.question.toString() !== question._id.toString()) {
        answerRecord = {
          question: question._id,
          answerIndex: -1,
          isCorrect: false,
          responseTime: Math.round((Date.now() - state.startTime) / 1000),
          awardedPoint: false
        };
        playerState.answers[battle.currentQuestionIndex] = answerRecord;
      }

      answersPayload.push({
        userId: playerState.userId,
        answerIndex: answerRecord.answerIndex,
        isCorrect: answerRecord.isCorrect,
        awardedPoint: answerRecord.awardedPoint,
        responseTime: answerRecord.responseTime,
        score: playerState.score
      });
    });

    io.to(battleId).emit('battle:question_result', {
      questionId: question._id.toString(),
      correctAnswer: question.correctAnswer,
      players: answersPayload
    });

    battle.currentQuestionIndex += 1;
    battle.currentQuestionState = null;

    battle.nextQuestionTimer = setTimeout(() => {
      battle.nextQuestionTimer = null;
      sendNextQuestion(battleId);
    }, INTERMISSION_TIME);
  };

  const sendNextQuestion = (battleId) => {
    const battle = activeBattles.get(battleId);
    if (!battle || battle.status !== 'in-progress') return;

    if (battle.currentQuestionIndex >= battle.questions.length) {
      finishBattle(battleId, { reason: 'completed' });
      return;
    }

    const question = battle.questions[battle.currentQuestionIndex];
    battle.currentQuestionState = {
      startTime: Date.now(),
      answers: new Map(),
      correctAnsweredBy: null,
      timer: setTimeout(() => finalizeQuestion(battleId), QUESTION_TIME_LIMIT)
    };

    io.to(battleId).emit('battle:question', sanitizeQuestionForClient(
      question,
      battle.currentQuestionIndex,
      battle.questions.length
    ));
  };

  const persistBattleResult = async (battle, options = {}) => {
    const playerEntries = Object.values(battle.players);
    const questionDocs = battle.questions.map((question) => ({
      question: question._id,
      correctAnswer: question.correctAnswer
    }));

    const winnerId = options.winnerId || options.forcedWinnerId || null;
    const isTie = options.isTie ?? (!winnerId);

    const payload = {
      battleId: battle.battleId,
      subject: battle.subject,
      questionCount: battle.questions.length,
      questions: questionDocs,
      players: playerEntries.map((player) => ({
        user: player.userId,
        name: player.name,
        avatar: player.avatar,
        score: player.score,
        answers: player.answers
      })),
      winner: winnerId,
      isTie,
      startedAt: new Date(battle.startedAt),
      endedAt: new Date(),
      duration: Math.round((Date.now() - battle.startedAt) / 1000)
    };

    await QuizBattle.create(payload);

    await Promise.all(
      playerEntries.map(async (player) => {
        const userDoc = await User.findById(player.userId);
        if (!userDoc) return;

        const isWinner = !!winnerId && winnerId === player.userId;
        const tieForPlayer = isTie && !winnerId;
        await userDoc.updateBattleStats(isWinner, tieForPlayer, player.score);
      })
    );
  };

  const notifyBattleFinished = (battle, options = {}) => {
    const playerEntries = Object.values(battle.players);
    const winnerId = options.winnerId || options.forcedWinnerId || null;
    const isTie = options.isTie ?? (!winnerId);
    const endReason = options.reason || 'completed';
    const durationSeconds = Math.round((Date.now() - battle.startedAt) / 1000);
    const questionCount = battle.questions.length;

    playerEntries.forEach((player) => {
      const opponent = playerEntries.find((entry) => entry.userId !== player.userId);
      io.to(player.socketId).emit('battle:finished', {
        battleId: battle.battleId,
        subject: battle.subject,
        yourScore: player.score,
        opponentScore: opponent ? opponent.score : 0,
        opponent: opponent ? {
          userId: opponent.userId,
          name: opponent.name,
          avatar: opponent.avatar
        } : null,
        winner: winnerId,
        isTie,
        reason: endReason,
        duration: durationSeconds,
        questionCount
      });
    });
  };

  const finishBattle = async (battleId, options = {}) => {
    const battle = activeBattles.get(battleId);
    if (!battle) return;

    clearBattleTimers(battle);

    battle.status = 'completed';

    const playerEntries = Object.values(battle.players);
    let forcedWinnerId = options.winnerId || null;

    if (!forcedWinnerId && playerEntries.length === 2) {
      if (playerEntries[0].score !== playerEntries[1].score) {
        forcedWinnerId = playerEntries[0].score > playerEntries[1].score
          ? playerEntries[0].userId
          : playerEntries[1].userId;
      }
    }

    const isTie = playerEntries.length === 2
      ? playerEntries[0].score === playerEntries[1].score && !forcedWinnerId
      : !forcedWinnerId;

    try {
      await persistBattleResult(battle, { ...options, winnerId: forcedWinnerId, isTie });
    } catch (error) {
      console.error('Failed to persist battle result:', error);
    }

    notifyBattleFinished(battle, { ...options, winnerId: forcedWinnerId, isTie });

    playerEntries.forEach((player) => {
      socketToBattle.delete(player.socketId);
      const socketInstance = io.sockets.sockets.get(player.socketId);
      if (socketInstance) {
        socketInstance.leave(battleId);
      }
    });

    activeBattles.delete(battleId);
  };

  const handleAnswer = (socket, payload) => {
    const battleId = socketToBattle.get(socket.id);
    if (!battleId) return;

    const battle = activeBattles.get(battleId);
    if (!battle || battle.status !== 'in-progress') return;

    const state = battle.currentQuestionState;
    if (!state) return;

    if (state.answers.has(socket.id)) {
      return;
    }

    const playerState = battle.players[socket.id];
    if (!playerState) return;

    const answerIndexRaw = payload?.answerIndex;
    const answerIndex = Number.isInteger(answerIndexRaw)
      ? answerIndexRaw
      : parseInt(answerIndexRaw, 10);

    const question = battle.questions[battle.currentQuestionIndex];
    const responseTime = Math.max(0, Math.round((Date.now() - state.startTime) / 1000));
    const isCorrect = answerIndex === question.correctAnswer;
    let awardedPoint = false;

    const answerRecord = {
      question: question._id,
      answerIndex: Number.isNaN(answerIndex) ? -1 : answerIndex,
      isCorrect,
      responseTime,
      awardedPoint: false
    };

    if (isCorrect && !state.correctAnsweredBy) {
      state.correctAnsweredBy = socket.id;
      playerState.score += 1;
      answerRecord.awardedPoint = true;
      awardedPoint = true;
    }

    playerState.answers[battle.currentQuestionIndex] = answerRecord;
    state.answers.set(socket.id, {
      isCorrect,
      answerIndex: answerRecord.answerIndex,
      responseTime,
      awardedPoint
    });

    io.to(battleId).emit('battle:player_answered', {
      userId: playerState.userId,
      isCorrect,
      responseTime,
      awardedPoint,
      score: playerState.score
    });

    const totalPlayers = Object.keys(battle.players).length;
    if (state.answers.size >= totalPlayers) {
      finalizeQuestion(battleId);
    }
  };

  const startBattle = (battleId) => {
    const battle = activeBattles.get(battleId);
    if (!battle) return;

    battle.status = 'in-progress';
    battle.startedAt = Date.now();

    io.to(battleId).emit('battle:started', {
      battleId,
      subject: battle.subject,
      questionCount: battle.questions.length,
      questionTimeLimit: QUESTION_TIME_LIMIT / 1000
    });

    sendNextQuestion(battleId);
  };

  const fetchBattleQuestions = async (subject) => {
    const pipeline = [
      { $match: { category: subject, isActive: true } },
      { $sample: { size: QUESTION_COUNT } },
      {
        $project: {
          _id: 1,
          question: 1,
          options: 1,
          correctAnswer: 1
        }
      }
    ];

    let questions = await Question.aggregate(pipeline);

    if (!questions.length) {
      questions = await Question.aggregate([
        { $match: { isActive: true } },
        { $sample: { size: QUESTION_COUNT } },
        {
          $project: {
            _id: 1,
            question: 1,
            options: 1,
            correctAnswer: 1
          }
        }
      ]);
    }

    return questions;
  };

  const matchPlayersForBattle = async (subject) => {
    const queue = getQueue(subject);
    if (queue.length < 2) return;

    const playerEntryA = queue.shift();
    const playerEntryB = queue.shift();

    socketToQueueSubject.delete(playerEntryA.socketId);
    socketToQueueSubject.delete(playerEntryB.socketId);

    const socketA = io.sockets.sockets.get(playerEntryA.socketId);
    const socketB = io.sockets.sockets.get(playerEntryB.socketId);

    if (!socketA || !socketB) {
      if (socketA) {
        socketA.emit('battle:error', { message: 'Opponent disconnected before battle started.' });
      }
      if (socketB) {
        socketB.emit('battle:error', { message: 'Opponent disconnected before battle started.' });
      }
      broadcastQueueUpdate(subject);
      return;
    }

    try {
      const questions = await fetchBattleQuestions(subject);

      if (!questions.length) {
        socketA.emit('battle:error', { message: 'Not enough questions available for this subject.' });
        socketB.emit('battle:error', { message: 'Not enough questions available for this subject.' });
        broadcastQueueUpdate(subject);
        return;
      }

      const battleId = new mongoose.Types.ObjectId().toString();

      const battle = {
        battleId,
        subject,
        questions,
        currentQuestionIndex: 0,
        currentQuestionState: null,
        countdownTimer: null,
        nextQuestionTimer: null,
        status: 'countdown',
        startedAt: Date.now(),
        players: {
          [socketA.id]: {
            socketId: socketA.id,
            userId: socketA.user._id.toString(),
            name: socketA.user.name,
            avatar: socketA.user.avatar || socketA.user.name?.charAt(0)?.toUpperCase() || '',
            score: 0,
            answers: []
          },
          [socketB.id]: {
            socketId: socketB.id,
            userId: socketB.user._id.toString(),
            name: socketB.user.name,
            avatar: socketB.user.avatar || socketB.user.name?.charAt(0)?.toUpperCase() || '',
            score: 0,
            answers: []
          }
        }
      };

      activeBattles.set(battleId, battle);

      socketToBattle.set(socketA.id, battleId);
      socketToBattle.set(socketB.id, battleId);

      socketA.join(battleId);
      socketB.join(battleId);

      socketA.emit('battle:matched', {
        battleId,
        subject,
        opponent: {
          userId: battle.players[socketB.id].userId,
          name: battle.players[socketB.id].name,
          avatar: battle.players[socketB.id].avatar
        },
        startsIn: COUNTDOWN_TIME / 1000,
        questionCount: questions.length
      });

      socketB.emit('battle:matched', {
        battleId,
        subject,
        opponent: {
          userId: battle.players[socketA.id].userId,
          name: battle.players[socketA.id].name,
          avatar: battle.players[socketA.id].avatar
        },
        startsIn: COUNTDOWN_TIME / 1000,
        questionCount: questions.length
      });

      battle.countdownTimer = setTimeout(() => {
        battle.countdownTimer = null;
        startBattle(battleId);
      }, COUNTDOWN_TIME);
    } catch (error) {
      console.error('Error creating battle:', error);
      if (socketA) {
        socketA.emit('battle:error', { message: 'Failed to start battle. Please try again.' });
      }
      if (socketB) {
        socketB.emit('battle:error', { message: 'Failed to start battle. Please try again.' });
      }
      broadcastQueueUpdate(subject);
    }
  };

  io.use(async (socket, next) => {
    try {
      const token = extractSocketToken(socket);
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const user = await User.findById(decoded.userId).select('name avatar isActive battleStats');
      if (!user || !user.isActive) {
        return next(new Error('User not authorized for battles'));
      }

      socket.user = user;
      next();
    } catch (error) {
      console.error('Socket authentication failed:', error.message);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    socket.emit('battle:connected', {
      userId: socket.user._id.toString(),
      name: socket.user.name
    });

    socket.on('battle:join_queue', async (payload) => {
      try {
        const subject = (payload?.subject || '').toLowerCase();
        if (!VALID_SUBJECTS.has(subject)) {
          socket.emit('battle:error', { message: 'Invalid subject selected for battle.' });
          return;
        }

        if (socketToBattle.has(socket.id)) {
          socket.emit('battle:error', { message: 'You are already in an active battle.' });
          return;
        }

        const existingSubject = socketToQueueSubject.get(socket.id);
        if (existingSubject) {
          removeFromQueue(socket.id, existingSubject);
        }

        const queue = getQueue(subject);

        queue.push({
          socketId: socket.id,
          userId: socket.user._id.toString(),
          name: socket.user.name,
          avatar: socket.user.avatar || socket.user.name?.charAt(0)?.toUpperCase() || ''
        });

        socketToQueueSubject.set(socket.id, subject);

        socket.emit('battle:queued', {
          subject,
          position: queue.length,
          size: queue.length
        });

        broadcastQueueUpdate(subject);

        await matchPlayersForBattle(subject);
      } catch (error) {
        console.error('Error joining battle queue:', error);
        socket.emit('battle:error', { message: 'Unable to join battle queue.' });
      }
    });

    socket.on('battle:leave_queue', () => {
      removeFromQueue(socket.id);
      socket.emit('battle:queue_left');
    });

    socket.on('battle:answer', (payload) => {
      try {
        handleAnswer(socket, payload);
      } catch (error) {
        console.error('Error handling answer:', error);
        socket.emit('battle:error', { message: 'Failed to submit answer.' });
      }
    });

    socket.on('battle:leave', () => {
      const battleId = socketToBattle.get(socket.id);
      if (!battleId) {
        removeFromQueue(socket.id);
        socket.emit('battle:queue_left');
        return;
      }

      const battle = activeBattles.get(battleId);
      if (!battle) return;

      const opponent = Object.values(battle.players).find((entry) => entry.socketId !== socket.id);

      finishBattle(battleId, {
        reason: 'player_left',
        winnerId: opponent ? opponent.userId : null
      });
    });

    socket.on('disconnect', () => {
      removeFromQueue(socket.id);

      const battleId = socketToBattle.get(socket.id);
      if (!battleId) return;

      const battle = activeBattles.get(battleId);
      if (!battle) return;

      const opponent = Object.values(battle.players).find((entry) => entry.socketId !== socket.id);

      finishBattle(battleId, {
        reason: 'opponent_disconnected',
        winnerId: opponent ? opponent.userId : null
      });
    });
  });
};


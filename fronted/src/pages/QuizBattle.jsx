import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import io from 'socket.io-client'
import axios from 'axios'
import './QuizBattle.css'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const SUBJECTS = [
  { id: 'india-gk', name: '🇮🇳 India GK', color: '#3B82F6' },
  { id: 'kerala-gk', name: '🌴 Kerala GK', color: '#10B981' },
  { id: 'mathematics', name: '🔢 Mathematics', color: '#EF4444' },
  { id: 'english', name: '📝 English', color: '#10B981' },
  { id: 'malayalam', name: '🖋️ Malayalam', color: '#F59E0B' },
  { id: 'constitution', name: '⚖️ Constitution', color: '#8B5CF6' },
  { id: 'reasoning', name: '💡 Reasoning', color: '#EC4899' },
  { id: 'computer', name: '💻 Computer', color: '#06B6D4' },
  { id: 'current-affairs', name: '📰 Current Affairs', color: '#84CC16' },
  { id: 'science', name: '🔬 Science', color: '#8B5CF6' }
]

const QuizBattle = ({ user }) => {
  const navigate = useNavigate()
  const socketRef = useRef(null)
  const questionTimerRef = useRef(null)
  const [connectionStatus, setConnectionStatus] = useState('idle')
  const [activeTab, setActiveTab] = useState('lobby')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [battleStatus, setBattleStatus] = useState('idle')
  const [countdown, setCountdown] = useState(0)
  const [queueInfo, setQueueInfo] = useState({ position: 0, size: 0 })
  const [battleInfo, setBattleInfo] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [questionTimer, setQuestionTimer] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [questionResult, setQuestionResult] = useState(null)
  const [scores, setScores] = useState({})
  const [battleSummary, setBattleSummary] = useState(null)
  const [battleHistory, setBattleHistory] = useState([])
  const [error, setError] = useState(null)
  const [isAnswerLocked, setIsAnswerLocked] = useState(false)

  const userId = user?.id

  const fetchBattleHistory = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) return

      const response = await axios.get(`${API_BASE_URL}/quiz/battles/history`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.data.status === 'success') {
        setBattleHistory(response.data.data)
      }
    } catch (err) {
      console.error('Failed to fetch battle history:', err)
    }
  }, [])

  useEffect(() => {
    fetchBattleHistory()
  }, [fetchBattleHistory])

  useEffect(() => {
    if (!user) return

    const token = localStorage.getItem('authToken')
    if (!token) {
      navigate('/signin')
      return
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setConnectionStatus('connected')
    })

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected')
      setBattleStatus('idle')
    })

    socket.on('battle:error', (payload) => {
      setError(payload?.message || 'Something went wrong with the battle server.')
      setBattleStatus('idle')
      setActiveTab('lobby')
    })

    socket.on('battle:queued', (payload) => {
      setQueueInfo({
        position: payload.position,
        size: payload.size
      })
      setBattleStatus('queued')
      setActiveTab('waiting')
    })

    socket.on('battle:queue_update', (payload) => {
      setQueueInfo({
        position: payload.position,
        size: payload.size
      })
    })

    socket.on('battle:queue_left', () => {
      setBattleStatus('idle')
      setActiveTab('lobby')
      setQueueInfo({ position: 0, size: 0 })
    })

    socket.on('battle:matched', (payload) => {
      setBattleInfo({
        battleId: payload.battleId,
        subject: payload.subject,
        opponent: payload.opponent,
        questionCount: payload.questionCount
      })
      setScores({
        [userId]: 0,
        [payload.opponent?.userId]: 0
      })
      setSelectedAnswer(null)
      setQuestionResult(null)
      setBattleStatus('countdown')
      setCountdown(Math.max(1, Math.round(payload.startsIn || 3)))
      setActiveTab('battle')
    })

    socket.on('battle:started', () => {
      setBattleStatus('active')
      setCurrentQuestion(null)
      setCurrentQuestionIndex(0)
      setQuestionResult(null)
      setSelectedAnswer(null)
      setIsAnswerLocked(false)
    })

    socket.on('battle:question', (payload) => {
      setCurrentQuestion(payload)
      setCurrentQuestionIndex(payload.sequence - 1)
      setQuestionTimer(payload.timeLimit || 15)
      setSelectedAnswer(null)
      setQuestionResult(null)
      setIsAnswerLocked(false)

      if (questionTimerRef.current) {
        clearInterval(questionTimerRef.current)
      }

      questionTimerRef.current = setInterval(() => {
        setQuestionTimer(prev => {
          if (prev <= 1) {
            clearInterval(questionTimerRef.current)
            questionTimerRef.current = null
            return 0
          }
          return prev - 1
        })
      }, 1000)
    })

    socket.on('battle:player_answered', (payload) => {
      setScores(prev => ({
        ...prev,
        [payload.userId]: payload.score
      }))
    })

    socket.on('battle:question_result', (payload) => {
      if (questionTimerRef.current) {
        clearInterval(questionTimerRef.current)
        questionTimerRef.current = null
      }

      setQuestionTimer(0)
      setQuestionResult(payload)
      setIsAnswerLocked(true)

      setScores(prev => {
        const updated = { ...prev }
        payload.players.forEach(player => {
          updated[player.userId] = player.score
        })
        return updated
      })
    })

    socket.on('battle:finished', async (payload) => {
      if (questionTimerRef.current) {
        clearInterval(questionTimerRef.current)
        questionTimerRef.current = null
      }

      setBattleStatus('finished')
      setBattleSummary(payload)
      setActiveTab('results')
      await fetchBattleHistory()
    })

    return () => {
      if (questionTimerRef.current) {
        clearInterval(questionTimerRef.current)
        questionTimerRef.current = null
      }
      socket.disconnect()
    }
  }, [user, navigate, userId, fetchBattleHistory])

  useEffect(() => {
    if (battleStatus !== 'countdown' || countdown <= 0) return

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [battleStatus, countdown])

  const joinBattleQueue = () => {
    if (!selectedSubject) {
      setError('Please select a subject first.')
      return
    }

    if (!socketRef.current || connectionStatus !== 'connected') {
      setError('Unable to connect to battle server.')
      return
    }

    setError(null)
    socketRef.current.emit('battle:join_queue', {
      subject: selectedSubject
    })
  }

  const cancelQueue = () => {
    if (socketRef.current) {
      socketRef.current.emit('battle:leave_queue')
    }
    setBattleStatus('idle')
    setActiveTab('lobby')
    setQueueInfo({ position: 0, size: 0 })
  }

  const leaveBattle = () => {
    if (socketRef.current) {
      socketRef.current.emit('battle:leave')
    }
    resetBattle()
  }

  const resetBattle = () => {
    if (questionTimerRef.current) {
      clearInterval(questionTimerRef.current)
      questionTimerRef.current = null
    }

    setBattleStatus('idle')
    setBattleInfo(null)
    setCurrentQuestion(null)
    setCurrentQuestionIndex(0)
    setSelectedAnswer(null)
    setQuestionResult(null)
    setScores({})
    setBattleSummary(null)
    setActiveTab('lobby')
  }

  const handleAnswerSelect = (answerIndex) => {
    if (battleStatus !== 'active' || isAnswerLocked || selectedAnswer !== null) return
    setSelectedAnswer(answerIndex)
    setIsAnswerLocked(true)

    if (socketRef.current) {
      socketRef.current.emit('battle:answer', {
        answerIndex
      })
    }
  }

  const getResultMessage = () => {
    if (!battleSummary) return ''

    if (battleSummary.isTie) {
      return '🤝 It\'s a Tie!'
    }

    if (battleSummary.winner === userId) {
      return '🎉 You Won!'
    }

    return '😞 You Lost'
  }

  const currentSubject = SUBJECTS.find(subject => subject.id === (battleInfo?.subject || selectedSubject))
  const opponent = battleInfo?.opponent || battleSummary?.opponent

  if (!user) {
    navigate('/')
    return null
  }

  return (
    <div className="live-quiz-page">
      <div className="quiz-battle-header">
        <h1>⚡ Quiz Battle</h1>
        <p>Challenge other quiz enthusiasts in real-time quiz competitions</p>
      </div>

      {error && (
        <div className="battle-error">
          {error}
        </div>
      )}

      {activeTab === 'lobby' && (
        <div className="battle-lobby">
          <div className="lobby-card">
            <h2>🎯 Start a Battle</h2>
            <p>Select a subject and challenge other players</p>

            <div className="subject-selection">
              <label>Choose Subject:</label>
              <div className="subject-grid">
                {SUBJECTS.map(subject => (
                  <div
                    key={subject.id}
                    className={`subject-option ${selectedSubject === subject.id ? 'selected' : ''}`}
                    style={{ '--subject-color': subject.color }}
                    onClick={() => setSelectedSubject(subject.id)}
                  >
                    <div className="subject-icon">{subject.name.split(' ')[0]}</div>
                    <span>{subject.name.split(' ').slice(1).join(' ')}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="battle-info">
              <h3>🏆 Battle Rules</h3>
              <ul>
                <li>⚡ 10 questions per battle</li>
                <li>⏱️ 15 seconds per question</li>
                <li>🎯 First correct answer secures the point</li>
                <li>🏅 Wins boost your leaderboard ranking</li>
                <li>📊 Results are tracked for battle history</li>
              </ul>
            </div>

            <button
              className="start-battle-btn"
              onClick={joinBattleQueue}
              disabled={!selectedSubject || connectionStatus !== 'connected'}
            >
              {connectionStatus === 'connected' ? '🚀 Find Opponent' : 'Connecting...'}
            </button>
          </div>

          <div className="recent-battles">
            <h3>Recent Battles</h3>
            {battleHistory.length > 0 ? (
              <div className="battle-history">
                {battleHistory.slice(0, 5).map((battle) => {
                  const subjectLabel = SUBJECTS.find(item => item.id === battle.subject)?.name || battle.subject
                  return (
                    <div key={battle.battleId} className="battle-record">
                      <span className="battle-subject">{subjectLabel}</span>
                    <span className={`battle-result ${battle.result}`}>
                      {battle.result === 'win' ? 'Won' : battle.result === 'loss' ? 'Lost' : 'Tie'} {battle.score}-{battle.opponentScore}
                    </span>
                      <span className="battle-opponent">vs {battle.opponent?.name || 'Unknown'}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="no-battles">No battles yet. Start your first battle!</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'waiting' && battleStatus === 'queued' && (
        <div className="waiting-room">
          <div className="waiting-card">
            <div className="searching-animation">
              <div className="searching-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
            <h2>🔍 Searching for Opponent...</h2>
            <p>Looking for someone equally passionate about {currentSubject?.name}</p>
            <div className="queue-info">
              <div className="queue-position">
                <span>Players in queue: </span>
                <strong>{queueInfo.size}</strong>
              </div>
              <div className="queue-position">
                <span>Your position: </span>
                <strong>{queueInfo.position}</strong>
              </div>
            </div>
            <button className="cancel-btn" onClick={cancelQueue}>
              Cancel Search
            </button>
          </div>
        </div>
      )}

      {battleStatus === 'countdown' && battleInfo && (
        <div className="battle-starting">
          <div className="countdown-card">
            <h1>Battle Starts In</h1>
            <div className="countdown-number">{countdown}</div>
            <p>Get ready to compete against {battleInfo.opponent?.name}</p>
            <div className="opponent-info">
              <div className="player-avatar">VS</div>
              <div className="player-names">
                <span className="you">You</span>
                <span className="vs">vs</span>
                <span className="opponent">{battleInfo.opponent?.name}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {battleStatus === 'active' && battleInfo && currentQuestion && (
        <div className="battle-arena">
          <div className="battle-header">
            <div className="player-info player-you">
              <div className="player-avatar">You</div>
              <div className="player-name">{user?.name}</div>
              <div className="player-score">{scores[userId] || 0}</div>
            </div>

            <div className="player-info player-opponent">
              <div className="player-avatar">OP</div>
              <div className="player-name">{battleInfo.opponent?.name}</div>
              <div className="player-score">{scores[battleInfo.opponent?.userId] || 0}</div>
            </div>

            <div className="battle-status">
              <div className="question-progress">
                Q{currentQuestionIndex + 1} of {battleInfo.questionCount}
              </div>
              <div className={`timer ${questionTimer <= 3 ? 'urgent' : ''}`}>
                ⏱️ {questionTimer}s
              </div>
              <div className="battle-subject">
                {currentSubject?.name}
              </div>
            </div>
          </div>

          <div className="question-area">
            <div className="question-card">
              <h2 className="question-text">
                {currentQuestion.question}
              </h2>

              <div className="options-grid">
                {currentQuestion.options.map((option, index) => {
                  const resultForUser = questionResult?.players?.find(player => player.userId === userId)
                  const correctAnswer = questionResult?.correctAnswer
                  const isCorrectOption = correctAnswer === index
                  const isSelected = selectedAnswer === index
                  const isWrongSelection = resultForUser && isSelected && !resultForUser.isCorrect

                  return (
                    <div
                      key={index}
                      className={`battle-option ${isSelected ? 'selected' : ''} ${isCorrectOption && questionResult ? 'correct' : ''} ${isWrongSelection ? 'wrong' : ''} ${isAnswerLocked ? 'disabled' : ''}`}
                      onClick={() => handleAnswerSelect(index)}
                    >
                      <div className="option-label">
                        {String.fromCharCode(65 + index)}
                      </div>
                      <div className="option-text">
                        {option}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <button className="leave-battle-btn" onClick={leaveBattle}>
            🏃 Leave Battle
          </button>
        </div>
      )}

      {battleStatus === 'finished' && battleSummary && (
        <div className="battle-results">
          <div className="results-card">
            <h1>{getResultMessage()}</h1>

            <div className="final-scores">
              <div className="score-player">
                <div className="player-name">You</div>
                <div className="score-value">{battleSummary.yourScore}</div>
              </div>

              <div className="score-vs">VS</div>

              <div className="score-player">
                <div className="player-name">{opponent?.name}</div>
                <div className="score-value">{battleSummary.opponentScore}</div>
              </div>
            </div>

            <div className="battle-stats">
              <div className="stat">
                <span>Subject</span>
                <strong>{currentSubject?.name}</strong>
              </div>
              <div className="stat">
                <span>Questions</span>
                <strong>{battleInfo?.questionCount || battleSummary.questionCount || 10}</strong>
              </div>
              <div className="stat">
                <span>Duration</span>
                <strong>{battleSummary.duration || 0}s</strong>
              </div>
            </div>

            <div className="result-actions">
              <button className="rematch-btn" onClick={joinBattleQueue}>
                🔥 Rematch
              </button>
              <button className="new-battle-btn" onClick={resetBattle}>
                🎯 New Battle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default QuizBattle
import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import './DailyQuiz.css'

const DailyQuiz = ({ user }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [quizSettings, setQuizSettings] = useState({
    numberOfQuestions: 10,
    timePerQuestion: 30,
    difficulty: 'medium'
  })
  const [quizStarted, setQuizStarted] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [userAnswers, setUserAnswers] = useState([])
  const [quizResults, setQuizResults] = useState(null)
  const [startTime, setStartTime] = useState(null)
  const [questionCounts, setQuestionCounts] = useState({})
  const [loadingCounts, setLoadingCounts] = useState(true)
  const [isAIGeneratedQuiz, setIsAIGeneratedQuiz] = useState(false)
  const [aiQuizId, setAiQuizId] = useState(null)
  const [activeTab, setActiveTab] = useState('competitive') // 'competitive' or 'fun'

  // Competitive Exam Subjects
  const competitiveSubjects = [
    {
      id: 1,
      name: '📚 General Knowledge',
      description: 'Current affairs, history, geography, and more',
      icon: '🌍',
      color: '#3B82F6',
      totalQuestions: 1250,
      dailyQuestions: 15
    },
    {
      id: 2,
      name: '🔢 Mathematics',
      description: 'Arithmetic, algebra, geometry, and statistics',
      icon: '🧮',
      color: '#EF4444',
      totalQuestions: 980,
      dailyQuestions: 12
    },
    {
      id: 3,
      name: '📝 English Language',
      description: 'Grammar, vocabulary, comprehension, and writing',
      icon: '📖',
      color: '#10B981',
      totalQuestions: 856,
      dailyQuestions: 10
    },
    {
      id: 4,
      name: '✍️ Malayalam',
      description: 'Malayalam grammar, literature, and comprehension',
      icon: '🖋️',
      color: '#F59E0B',
      totalQuestions: 745,
      dailyQuestions: 8
    },
    {
      id: 5,
      name: '⚖️ Constitution',
      description: 'Indian Constitution, rights, and governance',
      icon: '🏛️',
      color: '#8B5CF6',
      totalQuestions: 632,
      dailyQuestions: 10
    },
    {
      id: 6,
      name: '💡 Reasoning',
      description: 'Logical and analytical reasoning',
      icon: '🎯',
      color: '#EC4899',
      totalQuestions: 543,
      dailyQuestions: 8
    },
    {
      id: 7,
      name: '💻 Computer',
      description: 'Computer fundamentals and IT',
      icon: '🖥️',
      color: '#06B6D4',
      totalQuestions: 421,
      dailyQuestions: 6
    },
    {
      id: 8,
      name: '📊 Current Affairs',
      description: 'Latest news and events',
      icon: '📰',
      color: '#84CC16',
      totalQuestions: 'Daily',
      dailyQuestions: 20
    }
  ]

  // Fun Quiz Subjects
  const funSubjects = [
    {
      id: 101,
      name: '🎬 Movies & TV Shows',
      description: 'Bollywood, Hollywood, and popular TV series trivia',
      icon: '🎭',
      color: '#F59E0B',
      totalQuestions: 450,
      dailyQuestions: 10
    },
    {
      id: 102,
      name: '🎵 Music & Artists',
      description: 'Popular songs, artists, and music trivia',
      icon: '🎵',
      color: '#EC4899',
      totalQuestions: 380,
      dailyQuestions: 8
    },
    {
      id: 103,
      name: '🎮 Video Games',
      description: 'Popular games, characters, and gaming culture',
      icon: '🕹️',
      color: '#10B981',
      totalQuestions: 320,
      dailyQuestions: 6
    },
    {
      id: 104,
      name: '⚽ Sports',
      description: 'Cricket, football, and major sporting events',
      icon: '🏆',
      color: '#3B82F6',
      totalQuestions: 420,
      dailyQuestions: 8
    },
    {
      id: 105,
      name: '🍕 Food & Cuisine',
      description: 'World cuisines, cooking techniques, and food trivia',
      icon: '🍔',
      color: '#EF4444',
      totalQuestions: 280,
      dailyQuestions: 6
    },
    {
      id: 106,
      name: '🌍 Travel & Places',
      description: 'Famous landmarks, cultures, and travel destinations',
      icon: '✈️',
      color: '#06B6D4',
      totalQuestions: 350,
      dailyQuestions: 7
    },
    {
      id: 107,
      name: '📚 Books & Literature',
      description: 'Famous books, authors, and literary characters',
      icon: '📖',
      color: '#8B5CF6',
      totalQuestions: 290,
      dailyQuestions: 6
    },
    {
      id: 108,
      name: '🔍 Pop Culture',
      description: 'Internet memes, viral trends, and celebrity gossip',
      icon: '🌟',
      color: '#84CC16',
      totalQuestions: 400,
      dailyQuestions: 8
    }
  ]

  // Map subject ID to backend category
  const getCategoryFromSubject = (subjectId, isFunQuiz = false) => {
    if (isFunQuiz) {
      const funCategoryMap = {
        101: 'movies-tv',
        102: 'music',
        103: 'video-games',
        104: 'sports',
        105: 'food',
        106: 'travel',
        107: 'books',
        108: 'pop-culture'
      }
      return funCategoryMap[subjectId] || 'general'
    } else {
      const competitiveCategoryMap = {
        1: 'general-knowledge',
        2: 'mathematics',
        3: 'english',
        4: 'malayalam',
        5: 'constitution',
        6: 'reasoning',
        7: 'computer',
        8: 'current-affairs'
      }
      return competitiveCategoryMap[subjectId] || 'general-knowledge'
    }
  }

  // Get API base URL
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

  // Get auth token
  const getAuthToken = () => {
    return localStorage.getItem('authToken')
  }

  // Check if questions are passed via navigation state (from AI-generated quiz)
  useEffect(() => {
    if (location.state && location.state.questions) {
      const passedQuestions = location.state.questions
      const quizId = location.state.quizId
      
      if (passedQuestions && passedQuestions.length > 0) {
        // Format questions to match expected structure
        const formattedQuestions = passedQuestions.map((q, index) => ({
          _id: q._id || q.id || `ai-${index}`,
          question: q.question,
          options: q.options || [],
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || '',
          questionIndex: index // Store index for submission
        }))
        
        setQuestions(formattedQuestions)
        setQuizStarted(true)
        setCurrentQuestion(0)
        setScore(0)
        setTimeLeft(quizSettings.timePerQuestion)
        setSelectedAnswer(null)
        setShowResult(false)
        setUserAnswers([])
        setStartTime(Date.now())
        setIsAIGeneratedQuiz(true)
        setAiQuizId(quizId)
        
        // Set a dummy subject for display
        setSelectedSubject({
          id: 0,
          name: '🤖 AI Generated Quiz',
          description: 'Quiz generated from your notes',
          icon: '🤖',
          color: '#8B5CF6'
        })
        
        // Clear the state to prevent re-triggering on refresh
        navigate(location.pathname, { replace: true, state: null })
      }
    }
  }, [location.state, navigate, location.pathname])

  // Check if user wants to start timed quiz from QuizBrowser
  useEffect(() => {
    if (location.state && location.state.startTimedQuiz) {
      const subject = location.state.subject
      const category = location.state.category
      const isFunQuiz = location.state.isFunQuiz || false
      
      if (subject && category) {
        setSelectedSubject({ ...subject, isFunQuiz })
        setShowSettings(true)
        // Clear the state
        navigate(location.pathname, { replace: true, state: null })
      }
    }
  }, [location.state, navigate, location.pathname])

  // Fetch question counts from database
  useEffect(() => {
    const fetchQuestionCounts = async () => {
      try {
        const token = getAuthToken()
        if (!token) {
          setLoadingCounts(false)
          return
        }

        const response = await axios.get(`${API_BASE_URL}/quiz/counts`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.data.status === 'success') {
          setQuestionCounts(response.data.data)
        }
      } catch (err) {
        console.error('Error fetching question counts:', err)
        // Don't show error to user, just use default values
      } finally {
        setLoadingCounts(false)
      }
    }

    fetchQuestionCounts()
  }, [])

  useEffect(() => {
    let timer
    if (quizStarted && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1)
      }, 1000)
    } else if (timeLeft === 0 && quizStarted) {
      handleAnswerSubmit(null) // Auto-submit when time runs out
    }
    return () => clearInterval(timer)
  }, [quizStarted, timeLeft])

  const handleSubjectSelect = (subject, isFunQuiz = false) => {
    // Navigate to QuizBrowser page instead of showing settings modal
    const category = getCategoryFromSubject(subject.id, isFunQuiz)
    navigate('/quiz-browser', {
      state: {
        subject: subject,
        category: category,
        isFunQuiz: isFunQuiz
      }
    })
  }

  const handleSettingsChange = (key, value) => {
    setQuizSettings(prev => ({
      ...prev,
      [key]: value
    }))
    setError(null) // Clear error when settings change
  }

  const handleCloseSettings = () => {
    setShowSettings(false)
    setError(null) // Clear error when closing settings
  }

  const fetchQuestions = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const token = getAuthToken()
      if (!token) {
        setError('You are not authenticated. Please sign in again.')
        setLoading(false)
        // Redirect to sign in after a delay
        setTimeout(() => {
          navigate('/signin')
        }, 2000)
        return
      }

      const category = getCategoryFromSubject(selectedSubject.id, selectedSubject.isFunQuiz)
      const difficulty = quizSettings.difficulty
      
      const response = await axios.get(`${API_BASE_URL}/quiz/daily`, {
        params: {
          category: category,
          difficulty: difficulty,
          limit: quizSettings.numberOfQuestions
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.data.status === 'success') {
        if (!response.data.data.questions || response.data.data.questions.length === 0) {
          setError('No questions available for this category and difficulty. Please try different settings.')
          setLoading(false)
          return
        }
        setQuestions(response.data.data.questions)
        setQuizStarted(true)
        setShowSettings(false)
        setCurrentQuestion(0)
        setScore(0)
        setTimeLeft(quizSettings.timePerQuestion)
        setSelectedAnswer(null)
        setShowResult(false)
        setUserAnswers([])
        setStartTime(Date.now())
      } else {
        setError('Failed to fetch questions. Please try again.')
      }
    } catch (err) {
      console.error('Error fetching questions:', err)
      if (err.response?.status === 401) {
        setError('Your session has expired. Please sign in again.')
        // Clear invalid token
        localStorage.removeItem('authToken')
        localStorage.removeItem('user')
        // Redirect to sign in after a delay
        setTimeout(() => {
          navigate('/signin')
        }, 2000)
      } else {
        setError(err.response?.data?.message || 'Failed to fetch questions. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const startQuiz = () => {
    fetchQuestions()
  }

  const handleAnswerSelect = (answerIndex) => {
    setSelectedAnswer(answerIndex)
  }

  const submitQuizResults = async () => {
    setLoading(true)
    setError(null)

    try {
      const token = getAuthToken()
      if (!token) {
        setError('You are not authenticated. Please sign in again.')
        setLoading(false)
        setTimeout(() => {
          navigate('/signin')
        }, 2000)
        return
      }

      const timeSpent = Math.round((Date.now() - startTime) / 1000) // in seconds

      // Handle AI-generated quizzes differently
      if (isAIGeneratedQuiz && aiQuizId) {
        // Format answers for AI quiz submission - use questionIndex from questions array
        const answers = userAnswers.map((answer, index) => {
          const question = questions[index];
          return {
            questionIndex: question?.questionIndex !== undefined ? question.questionIndex : index,
            userAnswer: answer.userAnswer,
            timeTaken: answer.timeTaken || 0
          };
        })

        const response = await axios.post(`${API_BASE_URL}/quiz-from-pdf/${aiQuizId}/submit`, {
          answers: answers,
          timeSpent: timeSpent
        }, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.data.status === 'success') {
          setQuizResults(response.data.data)
          setShowResult(true)
          setQuizStarted(false)
        } else {
          setError('Failed to submit quiz results. Please try again.')
        }
      } else {
        // Regular quiz submission
        const category = selectedSubject && selectedSubject.id 
          ? getCategoryFromSubject(selectedSubject.id, selectedSubject.isFunQuiz) 
          : 'mixed'
        
        const response = await axios.post(`${API_BASE_URL}/quiz/submit`, {
          questions: userAnswers,
          timeSpent: timeSpent,
          category: category,
          difficulty: quizSettings.difficulty,
          quizType: selectedSubject?.isFunQuiz ? 'fun' : 'competitive'
        }, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.data.status === 'success') {
          setQuizResults(response.data.data)
          setShowResult(true)
          setQuizStarted(false)
        } else {
          setError('Failed to submit quiz results. Please try again.')
        }
      }
    } catch (err) {
      console.error('Error submitting quiz:', err)
      if (err.response?.status === 401) {
        setError('Your session has expired. Please sign in again.')
        localStorage.removeItem('authToken')
        localStorage.removeItem('user')
        setTimeout(() => {
          navigate('/signin')
        }, 2000)
      } else {
        setError(err.response?.data?.message || 'Failed to submit quiz results. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAnswerSubmit = (answerIndex = selectedAnswer) => {
    const currentQ = questions[currentQuestion]
    if (!currentQ) return

    // Store user answer
    const answerData = {
      questionId: currentQ._id || currentQ.id,
      userAnswer: answerIndex !== null ? answerIndex : -1,
      timeTaken: quizSettings.timePerQuestion - timeLeft
    }
    
    const updatedAnswers = [...userAnswers, answerData]
    setUserAnswers(updatedAnswers)

    // Move to next question or submit quiz
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1)
      setSelectedAnswer(null)
      setTimeLeft(quizSettings.timePerQuestion)
    } else {
      // All questions answered, submit to backend
      submitQuizResults()
    }
  }

  const resetQuiz = () => {
    setQuizStarted(false)
    setSelectedSubject(null)
    setShowResult(false)
    setQuestions([])
    setUserAnswers([])
    setQuizResults(null)
    setError(null)
    setCurrentQuestion(0)
    setScore(0)
  }

  if (!user) {
    navigate('/')
    return null
  }

  if (showResult) {
    const finalScore = quizResults?.score || 0
    const totalQuestions = quizResults?.totalQuestions || questions.length || quizSettings.numberOfQuestions
    const accuracy = quizResults?.accuracy || 0

    return (
      <div className="daily-quiz-page">
        <div className="quiz-result">
          <div className="result-card">
            <div className="result-icon">🎉</div>
            <h2>Quiz Completed!</h2>
            <div className="score-display">
              Your Score: <span className="score-value">{finalScore}</span> / {totalQuestions}
            </div>
            <div className="result-details">
              <p>Subject: <strong>{selectedSubject?.name}</strong></p>
              <p>Type: <strong>{selectedSubject?.isFunQuiz ? 'Fun Quiz' : 'Competitive Exam'}</strong></p>
              <p>Accuracy: <strong>{accuracy}%</strong></p>
              {quizResults?.timeSpent && (
                <p>Time Taken: <strong>{Math.round(quizResults.timeSpent / 60)} min {quizResults.timeSpent % 60} sec</strong></p>
              )}
            </div>
            {error && (
              <div style={{ color: '#EF4444', marginBottom: '1rem', fontSize: '0.9rem' }}>
                {error}
              </div>
            )}
            <div className="result-actions">
              <button className="home-btn" onClick={resetQuiz}>
                Choose Another Subject
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading && !quizStarted) {
    return (
      <div className="daily-quiz-page">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '80vh',
          color: 'white',
          fontSize: '1.2rem'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
            <div>Loading questions...</div>
          </div>
        </div>
      </div>
    )
  }

  if (quizStarted && questions.length > 0) {
    const question = questions[currentQuestion]
    
    if (!question) {
      return (
        <div className="daily-quiz-page">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: '80vh',
            color: 'white',
            fontSize: '1.2rem'
          }}>
            <div>No questions available. Please try again.</div>
          </div>
        </div>
      )
    }
    
    return (
      <div className="daily-quiz-page">
        <div className="quiz-container">
          {/* Quiz Header */}
          <div className="quiz-header">
            <div className="quiz-info">
              <h2>{selectedSubject?.name}</h2>
              <div className="quiz-progress">
                Question {currentQuestion + 1} of {questions.length}
              </div>
            </div>
            <div className="quiz-timer">
              ⏱️ {timeLeft}s
            </div>
          </div>

          {/* Question */}
          <div className="question-section">
            <div className="question-text">
              {question.question}
            </div>
            
            {/* Options */}
            <div className="options-grid">
              {question.options && question.options.map((option, index) => (
                <div
                  key={index}
                  className={`option-card ${selectedAnswer === index ? 'selected' : ''}`}
                  onClick={() => handleAnswerSelect(index)}
                >
                  <div className="option-label">
                    {String.fromCharCode(65 + index)}
                  </div>
                  <div className="option-text">
                    {option}
                  </div>
                </div>
              ))}
            </div>

            {/* Error Message */}
            {error && (
              <div style={{ 
                color: '#EF4444', 
                marginBottom: '1rem', 
                padding: '0.75rem',
                background: '#FEE2E2',
                borderRadius: '8px',
                fontSize: '0.9rem'
              }}>
                {error}
              </div>
            )}

            {/* Navigation */}
            <div className="quiz-navigation">
              <button 
                className="submit-btn"
                onClick={() => handleAnswerSubmit()}
                disabled={selectedAnswer === null || loading}
              >
                {loading ? 'Submitting...' : (currentQuestion < questions.length - 1 ? 'Next Question' : 'Finish Quiz')}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="daily-quiz-page">
      {/* Header */}
      <div className="quiz-page-header">
        <h1>📚 Daily Quiz</h1>
        <p>Choose between competitive exam preparation or fun quizzes to test your knowledge</p>
      </div>

      {/* Tab Navigation */}
      <div className="quiz-tabs">
        <button 
          className={`tab-button ${activeTab === 'competitive' ? 'active' : ''}`}
          onClick={() => setActiveTab('competitive')}
        >
          🎯 Competitive Exams
        </button>
        <button 
          className={`tab-button ${activeTab === 'fun' ? 'active' : ''}`}
          onClick={() => setActiveTab('fun')}
        >
          🎉 Fun Quizzes
        </button>
      </div>

      {/* Subjects Grid */}
      <div className="subjects-grid">
        {(activeTab === 'competitive' ? competitiveSubjects : funSubjects).map(subject => {
          const category = getCategoryFromSubject(subject.id, activeTab === 'fun')
          const totalQuestions = loadingCounts 
            ? '...' 
            : (questionCounts[category] !== undefined ? questionCounts[category] : subject.totalQuestions)
          
          return (
            <div
              key={subject.id}
              className="subject-card"
              style={{ '--subject-color': subject.color }}
              onClick={() => handleSubjectSelect(subject, activeTab === 'fun')}
            >
              <div className="subject-header">
                <div className="subject-icon">
                  {subject.icon}
                </div>
                <div className="subject-info">
                  <h3>{subject.name}</h3>
                  <p>{subject.description}</p>
                </div>
              </div>
              <div className="subject-stats">
                <div className="stat">
                  <span className="stat-value">{totalQuestions}</span>
                  <span className="stat-label">Total</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{subject.dailyQuestions}</span>
                  <span className="stat-label">Daily</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quiz Settings Modal */}
      {showSettings && selectedSubject && (
        <div className="modal-overlay">
          <div className="settings-modal">
            <div className="modal-header">
              <h2>Quiz Settings - {selectedSubject.name}</h2>
              <button 
                className="close-btn"
                onClick={handleCloseSettings}
              >
                ×
              </button>
            </div>

            <div className="settings-content">
              {/* Number of Questions */}
              <div className="setting-group">
                <label>Number of Questions</label>
                <div className="options-row">
                  {[5, 10, 15, 20].map(num => (
                    <button
                      key={num}
                      className={`option-btn ${quizSettings.numberOfQuestions === num ? 'selected' : ''}`}
                      onClick={() => handleSettingsChange('numberOfQuestions', num)}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time per Question */}
              <div className="setting-group">
                <label>Time per Question (seconds)</label>
                <div className="options-row">
                  {[15, 30, 45, 60].map(time => (
                    <button
                      key={time}
                      className={`option-btn ${quizSettings.timePerQuestion === time ? 'selected' : ''}`}
                      onClick={() => handleSettingsChange('timePerQuestion', time)}
                    >
                      {time}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div className="setting-group">
                <label>Difficulty Level</label>
                <div className="options-row">
                  {['easy', 'medium', 'hard'].map(difficulty => (
                    <button
                      key={difficulty}
                      className={`option-btn ${quizSettings.difficulty === difficulty ? 'selected' : ''}`}
                      onClick={() => handleSettingsChange('difficulty', difficulty)}
                    >
                      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quiz Summary */}
              <div className="quiz-summary">
                <h4>Quiz Summary</h4>
                <div className="summary-details">
                  <div className="summary-item">
                    <span>Total Questions:</span>
                    <span>{quizSettings.numberOfQuestions}</span>
                  </div>
                  <div className="summary-item">
                    <span>Total Time:</span>
                    <span>{Math.round(quizSettings.numberOfQuestions * quizSettings.timePerQuestion / 60)} min</span>
                  </div>
                  <div className="summary-item">
                    <span>Difficulty:</span>
                    <span>{quizSettings.difficulty}</span>
                  </div>
                  <div className="summary-item">
                    <span>Quiz Type:</span>
                    <span>{selectedSubject.isFunQuiz ? 'Fun Quiz' : 'Competitive Exam'}</span>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div style={{ 
                color: '#EF4444', 
                marginBottom: '1rem', 
                padding: '0.75rem',
                background: '#FEE2E2',
                borderRadius: '8px',
                fontSize: '0.9rem',
                textAlign: 'center',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem'
              }}>
                <span style={{ flex: 1 }}>{error}</span>
                <button
                  onClick={() => setError(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#EF4444',
                    fontSize: '1.2rem',
                    cursor: 'pointer',
                    padding: '0',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.1)'}
                  onMouseLeave={(e) => e.target.style.background = 'none'}
                  title="Dismiss"
                >
                  ×
                </button>
              </div>
            )}
            <div className="modal-actions">
              <button 
                className="start-quiz-btn"
                onClick={startQuiz}
                disabled={loading}
              >
                {loading ? 'Loading...' : '🚀 Start Quiz'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DailyQuiz
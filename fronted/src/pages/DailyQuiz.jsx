import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import { getCategoriesForSubject } from '../utils/quizCategories'
import './DailyQuiz.css'

const DailyQuiz = ({ user }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [quizSettings, setQuizSettings] = useState({
    numberOfQuestions: 10,
    timePerQuestion: 30,
    subCategory: 'All'
  })
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('All')
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
  const [activeTab, setActiveTab] = useState('competitive') // 'competitive' | 'fun' | 'hosted'
  const [hostedQuizzes, setHostedQuizzes] = useState([])
  const [loadingHostedQuizzes, setLoadingHostedQuizzes] = useState(true)
  const [hostedQuizError, setHostedQuizError] = useState(null)
  const [hostedQuizId, setHostedQuizId] = useState(null)
  const [hostedQuizInfo, setHostedQuizInfo] = useState(null)

  // Competitive Exam Subjects
  const competitiveSubjects = [
    {
      id: 1,
      name: '🇮🇳 India GK',
      description: 'Indian history, geography, economy, and personalities',
      icon: '🇮🇳',
      color: '#3B82F6',
      totalQuestions: 625,
      dailyQuestions: 15
    },
    {
      id: 2,
      name: '🌴 Kerala GK',
      description: 'Kerala history, geography, economy, and personalities',
      icon: '🌴',
      color: '#10B981',
      totalQuestions: 625,
      dailyQuestions: 15
    },
    {
      id: 3,
      name: '🔢 Mathematics',
      description: 'Arithmetic, algebra, geometry, and statistics',
      icon: '🧮',
      color: '#EF4444',
      totalQuestions: 980,
      dailyQuestions: 12
    },
    {
      id: 4,
      name: '📝 English Language',
      description: 'Grammar, vocabulary, comprehension, and writing',
      icon: '📖',
      color: '#10B981',
      totalQuestions: 856,
      dailyQuestions: 10
    },
    {
      id: 5,
      name: '✍️ Malayalam',
      description: 'Malayalam grammar, literature, and comprehension',
      icon: '🖋️',
      color: '#F59E0B',
      totalQuestions: 745,
      dailyQuestions: 8
    },
    {
      id: 6,
      name: '⚖️ Constitution',
      description: 'Indian Constitution, rights, and governance',
      icon: '🏛️',
      color: '#8B5CF6',
      totalQuestions: 632,
      dailyQuestions: 10
    },
    {
      id: 7,
      name: '💡 Reasoning',
      description: 'Logical and analytical reasoning',
      icon: '🎯',
      color: '#EC4899',
      totalQuestions: 543,
      dailyQuestions: 8
    },
    {
      id: 8,
      name: '💻 Computer',
      description: 'Computer fundamentals and IT',
      icon: '🖥️',
      color: '#06B6D4',
      totalQuestions: 421,
      dailyQuestions: 6
    },
    {
      id: 9,
      name: '📊 Current Affairs',
      description: 'Latest news and events',
      icon: '📰',
      color: '#84CC16',
      totalQuestions: 'Daily',
      dailyQuestions: 20
    },
    {
      id: 10,
      name: '🔬 Science',
      description: 'Biology, Chemistry, and Physics',
      icon: '🔬',
      color: '#8B5CF6',
      totalQuestions: 500,
      dailyQuestions: 10
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
        1: 'india-gk',
        2: 'kerala-gk',
        3: 'mathematics',
        4: 'english',
        5: 'malayalam',
        6: 'constitution',
        7: 'reasoning',
        8: 'computer',
        9: 'current-affairs',
        10: 'science'
      }
      return competitiveCategoryMap[subjectId] || 'india-gk'
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
      const subCategory = location.state.subCategory || 'All'
      const isFunQuiz = location.state.isFunQuiz || false
      
      if (subject && category) {
        setSelectedSubject({ ...subject, isFunQuiz })
        setSelectedCategory(subCategory)
        setQuizSettings(prev => ({ ...prev, subCategory }))
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

  // Fetch active hosted quizzes
  useEffect(() => {
    const fetchHostedQuizzes = async () => {
      try {
        const token = getAuthToken()
        if (!token) {
          setLoadingHostedQuizzes(false)
          return
        }

        const response = await axios.get(`${API_BASE_URL}/hosted-quizzes`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.data.status === 'success') {
          setHostedQuizzes(response.data.data || [])
        }
      } catch (err) {
        console.error('Error fetching hosted quizzes:', err)
        setHostedQuizError('Failed to load hosted quizzes.')
      } finally {
        setLoadingHostedQuizzes(false)
      }
    }

    fetchHostedQuizzes()
  }, [])

  // Start hosted quiz if navigated with hostedQuizId
  useEffect(() => {
    if (location.state && location.state.hostedQuizId) {
      const id = location.state.hostedQuizId
      startHostedQuiz(id)
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.state, navigate, location.pathname])

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
        subCategory: 'All',
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
      const subCategory = quizSettings.subCategory || 'All'
      
      const response = await axios.get(`${API_BASE_URL}/quiz/daily`, {
        params: {
          category: category,
          subCategory: subCategory,
          limit: quizSettings.numberOfQuestions
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.data.status === 'success') {
        if (!response.data.data.questions || response.data.data.questions.length === 0) {
          setError('No questions available for this category. Please try different settings.')
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

  const startHostedQuiz = async (id) => {
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

      const response = await axios.get(`${API_BASE_URL}/hosted-quizzes/${id}/questions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.data.status === 'success') {
        const { quiz, questions: quizQuestions } = response.data.data
        if (!quizQuestions || quizQuestions.length === 0) {
          setError('No questions available for this hosted quiz.')
          setLoading(false)
          return
        }

        setQuestions(quizQuestions)
        setHostedQuizId(quiz.id)
        setHostedQuizInfo(quiz)
        setQuizStarted(true)
        setShowSettings(false)
        setCurrentQuestion(0)
        setScore(0)
        setTimeLeft(quizSettings.timePerQuestion)
        setSelectedAnswer(null)
        setShowResult(false)
        setUserAnswers([])
        setStartTime(Date.now())
        setIsAIGeneratedQuiz(false)

        // Set a synthetic subject for display
        setSelectedSubject({
          id: -1,
          name: quiz.title || 'Hosted Quiz',
          description: quiz.description || 'User hosted quiz',
          icon: '👥',
          color: '#10B981',
          isFunQuiz: false
        })
      } else {
        setError('Failed to start hosted quiz. Please try again.')
      }
    } catch (err) {
      console.error('Error starting hosted quiz:', err)
      setError(err.response?.data?.message || 'Failed to start hosted quiz. Please try again.')
    } finally {
      setLoading(false)
    }
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
          timeSpent: timeSpent,
          totalQuestions: questions.length // Send the actual total number of questions presented
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
          subCategory: quizSettings.subCategory || 'All',
          quizType: selectedSubject?.isFunQuiz ? 'fun' : 'competitive',
          totalQuestions: questions.length, // Send the actual total number of questions presented
          hostedQuizId: hostedQuizId || null
        }, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.data.status === 'success') {
          let resultData = response.data.data

          // If this was a hosted quiz, also fetch ranking
          if (hostedQuizId) {
            try {
              const rankingResponse = await axios.get(`${API_BASE_URL}/hosted-quizzes/${hostedQuizId}/results`, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              })

              if (rankingResponse.data.status === 'success') {
                resultData = {
                  ...resultData,
                  hostedQuizId,
                  hostedQuizInfo,
                  ranking: rankingResponse.data.data.ranking || [],
                  currentUserRanking: rankingResponse.data.data.currentUser || null
                }
              }
            } catch (rankingErr) {
              console.error('Error fetching hosted quiz ranking:', rankingErr)
            }
          }

          setQuizResults(resultData)
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
    setHostedQuizId(null)
    setHostedQuizInfo(null)
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
    // Use quizResults.totalQuestions if available (from backend), otherwise fallback to userAnswers length or questions length
    const totalQuestions = quizResults?.totalQuestions || userAnswers.length || questions.length || quizSettings.numberOfQuestions
    const accuracy = quizResults?.accuracy || 0
    const ranking = quizResults?.ranking || []
    const currentUserRanking = quizResults?.currentUserRanking || null

    return (
      <div className="daily-quiz-page">
        <div className="quiz-result">
          <div className="result-layout">
            <div className="result-card">
              <div className="result-icon">🎉</div>
              <h2>Quiz Completed!</h2>
              <div className="score-display">
                Your Score: <span className="score-value">{finalScore}</span> / {totalQuestions}
              </div>
              <div className="result-details">
                <p>Subject: <strong>{selectedSubject?.name}</strong></p>
                <p>Type: <strong>{hostedQuizId ? 'Hosted Quiz' : (selectedSubject?.isFunQuiz ? 'Fun Quiz' : 'Competitive Exam')}</strong></p>
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

            {hostedQuizId && ranking && ranking.length > 0 && (
              <div className="hosted-quiz-ranking">
                <h3>🏆 Hosted Quiz Rankings</h3>
                <div className="ranking-list">
                  {ranking.map((entry) => (
                    <div
                      key={entry.userId}
                      className={`ranking-item ${entry.isCurrentUser ? 'current-user' : ''}`}
                    >
                      <div className="rank-position">#{entry.rank}</div>
                      <div className="rank-user">
                        <div className="avatar-circle">
                          {entry.avatar
                            ? <img src={entry.avatar} alt={entry.name} />
                            : (entry.name ? entry.name.charAt(0).toUpperCase() : '?')}
                        </div>
                        <div className="rank-user-info">
                          <div className="rank-name">
                            {entry.name || 'Anonymous'}
                            {entry.isCurrentUser && <span className="you-badge">You</span>}
                          </div>
                          <div className="rank-meta">
                            Score: {entry.score}/{entry.totalQuestions} • {entry.accuracy}% • {Math.round((entry.timeSpent || 0) / 60)}m
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {currentUserRanking && !currentUserRanking.isCurrentUser && (
                  <div className="your-rank-summary">
                    Your Rank: #{currentUserRanking.rank} • {currentUserRanking.score}/{currentUserRanking.totalQuestions} ({currentUserRanking.accuracy}%)
                  </div>
                )}
              </div>
            )}
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
            <div className="spinner" style={{ marginBottom: '1rem' }}></div>
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
        <p>Choose between competitive exam preparation, fun quizzes, or user hosted matches to test your knowledge</p>
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
        <button 
          className={`tab-button ${activeTab === 'hosted' ? 'active' : ''}`}
          onClick={() => setActiveTab('hosted')}
        >
          👥 Hosted Matches
        </button>
      </div>

      {/* Subjects / Hosted Grid */}
      {activeTab === 'hosted' ? (
        <div className="hosted-quizzes-section">
          <h2>👥 User Hosted Quiz Matches</h2>
          {loadingHostedQuizzes ? (
            <div className="hosted-loading">Loading hosted quizzes...</div>
          ) : hostedQuizzes && hostedQuizzes.length > 0 ? (
            <div className="hosted-quizzes-grid">
              {hostedQuizzes.map((quiz) => (
                <div key={quiz.id} className="hosted-quiz-card">
                  <div className="hosted-quiz-header">
                    <h3>{quiz.title}</h3>
                    <span className="hosted-quiz-badge">Hosted</span>
                  </div>
                  <p className="hosted-quiz-description">{quiz.description || 'Contributor hosted quiz match'}</p>
                  <div className="hosted-quiz-meta">
                    <span>{quiz.questionCount} questions</span>
                    <span>{quiz.category}{quiz.subCategory && quiz.subCategory !== 'All' ? ` • ${quiz.subCategory}` : ''}</span>
                  </div>
                  {quiz.host && (
                    <div className="hosted-quiz-host">
                      <div className="avatar-circle small">
                        {quiz.host.avatar
                          ? <img src={quiz.host.avatar} alt={quiz.host.name} />
                          : (quiz.host.name ? quiz.host.name.charAt(0).toUpperCase() : '?')}
                      </div>
                      <span>By {quiz.host.name || 'Contributor'}</span>
                    </div>
                  )}
                  <button
                    className="start-hosted-quiz-btn"
                    onClick={() => startHostedQuiz(quiz.id)}
                  >
                    Join Match
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="hosted-empty">
              <p>No hosted matches are live right now. Try again later or practice with daily quizzes.</p>
            </div>
          )}
          {hostedQuizError && (
            <div className="hosted-error">
              {hostedQuizError}
            </div>
          )}
        </div>
      ) : (
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
                
              </div>
            </div>
          )
        })}
      </div>
      )}

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

              {/* Category Selection */}
              <div className="setting-group">
                <label>Category</label>
                <button
                  className="category-select-btn"
                  onClick={() => setShowCategoryModal(true)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#F3F4F6',
                    border: '2px solid #E5E7EB',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    textAlign: 'left',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span>{quizSettings.subCategory || 'All'}</span>
                  <span>▼</span>
                </button>
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
                    <span>Category:</span>
                    <span>{quizSettings.subCategory || 'All'}</span>
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

      {/* Category Selection Modal */}
      {showCategoryModal && selectedSubject && (
        <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Select Category - {selectedSubject.name}</h2>
              <button 
                className="close-btn"
                onClick={() => setShowCategoryModal(false)}
              >
                ×
              </button>
            </div>
            <div className="settings-content">
              <div className="category-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: '0.75rem',
                maxHeight: '400px',
                overflowY: 'auto',
                padding: '1rem'
              }}>
                {getCategoriesForSubject(getCategoryFromSubject(selectedSubject.id, selectedSubject.isFunQuiz)).map(category => (
                  <button
                    key={category}
                    className={`option-btn ${quizSettings.subCategory === category ? 'selected' : ''}`}
                    onClick={() => {
                      handleSettingsChange('subCategory', category)
                      setSelectedCategory(category)
                      setShowCategoryModal(false)
                    }}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '2px solid #E5E7EB',
                      background: quizSettings.subCategory === category ? '#3B82F6' : 'white',
                      color: quizSettings.subCategory === category ? 'white' : '#374151',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DailyQuiz
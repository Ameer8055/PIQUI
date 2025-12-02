import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import { toast } from '../utils/toast'
import { getCategoriesForSubject } from '../utils/quizCategories'
import './QuizBrowser.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const QuizBrowser = ({ user }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [userAnswers, setUserAnswers] = useState({}) // { questionId: { selectedAnswer: number, isCorrect: boolean } }
  const [showTimedQuiz, setShowTimedQuiz] = useState(false)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [copiedPrompt, setCopiedPrompt] = useState('')
  const [selectedSubCategory, setSelectedSubCategory] = useState('All')
  
  const questionsPerPage = 50
  const subject = location.state?.subject || null
  const category = location.state?.category || null
  const initialSubCategory = location.state?.subCategory || 'All'
  const isFunQuiz = location.state?.isFunQuiz || false

  useEffect(() => {
    if (!user) {
      navigate('/')
      return
    }

    if (!subject || !category) {
      navigate('/daily-quiz')
      return
    }

    setSelectedSubCategory(initialSubCategory)
    fetchQuestions()
  }, [user, currentPage, category, initialSubCategory])

  useEffect(() => {
    if (selectedSubCategory !== initialSubCategory) {
      setCurrentPage(1)
      fetchQuestions()
    }
  }, [selectedSubCategory])

  const fetchQuestions = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        navigate('/signin')
        return
      }

      // Use admin endpoint which returns questions with correct answers
      // Filter by category and paginate client-side
      const response = await axios.get(`${API_BASE_URL}/admin/questions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.data.success || response.data.status === 'success') {
        let allQuestions = response.data.data?.questions || response.data.data || []
        
        // Filter by category and subCategory if specified
        if (category && category !== 'mixed') {
          allQuestions = allQuestions.filter(q => {
            const categoryMatch = q.category === category && q.isActive !== false
            if (selectedSubCategory && selectedSubCategory !== 'All') {
              return categoryMatch && q.subCategory === selectedSubCategory
            }
            return categoryMatch
          })
        } else {
          allQuestions = allQuestions.filter(q => q.isActive !== false)
        }
        
        // Paginate
        const startIndex = (currentPage - 1) * questionsPerPage
        const endIndex = startIndex + questionsPerPage
        const paginatedQuestions = allQuestions.slice(startIndex, endIndex)
        
        setQuestions(paginatedQuestions)
        setTotalQuestions(allQuestions.length)
        setTotalPages(Math.ceil(allQuestions.length / questionsPerPage))
      } else {
        setError('Failed to fetch questions. Please try again.')
      }
    } catch (err) {
      console.error('Error fetching questions:', err)
      if (err.response?.status === 401) {
        navigate('/signin')
      } else {
        setError('Failed to load questions. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAnswerSelect = (questionId, answerIndex, correctAnswer) => {
    const isCorrect = answerIndex === correctAnswer
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: {
        selectedAnswer: answerIndex,
        isCorrect: isCorrect
      }
    }))
  }

  const openChatGPT = () => {
    // Check if we're on mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    
    if (isMobile) {
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
      const isAndroid = /Android/i.test(navigator.userAgent)
      let shouldOpenWeb = true
      let visibilityTimeout = null
      
      // Track if page becomes hidden (app opened)
      const handleVisibilityChange = () => {
        if (document.hidden) {
          // App opened, cancel web opening
          shouldOpenWeb = false
          if (visibilityTimeout) {
            clearTimeout(visibilityTimeout)
          }
        }
      }
      
      document.addEventListener('visibilitychange', handleVisibilityChange, { once: true })
      
      if (isIOS) {
        // Try iOS app URL scheme
        window.location.href = 'chatgpt://'
        
        // Check after delay if app opened (if page is still visible, app didn't open)
        visibilityTimeout = setTimeout(() => {
          document.removeEventListener('visibilitychange', handleVisibilityChange)
          if (shouldOpenWeb && document.visibilityState === 'visible') {
            // App didn't open, open web version
            window.open('https://chatgpt.com', '_blank')
          }
        }, 500)
      } else if (isAndroid) {
        // Try Android intent with fallback
        try {
          // Create a hidden iframe to attempt app opening
          const iframe = document.createElement('iframe')
          iframe.style.display = 'none'
          iframe.style.width = '0'
          iframe.style.height = '0'
          iframe.src = 'chatgpt://'
          document.body.appendChild(iframe)
          
          // Remove iframe and check if we need to open web
          visibilityTimeout = setTimeout(() => {
            document.body.removeChild(iframe)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            
            // If page is still visible, app didn't open
            if (shouldOpenWeb && document.visibilityState === 'visible') {
              window.open('https://chatgpt.com', '_blank')
            }
          }, 800)
        } catch (e) {
          // If intent fails, open web
          document.removeEventListener('visibilitychange', handleVisibilityChange)
          if (shouldOpenWeb) {
            window.open('https://chatgpt.com', '_blank')
          }
        }
      } else {
        window.open('https://chatgpt.com', '_blank')
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    } else {
      // Desktop: open ChatGPT web in new tab
      window.open('https://chatgpt.com', '_blank')
    }
  }

  const copyToClipboard = async (prompt) => {
    let copySuccess = false
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(prompt)
        copySuccess = true
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = prompt
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        try {
          copySuccess = document.execCommand('copy')
          textArea.remove()
        } catch (err) {
          textArea.remove()
          console.error('Failed to copy:', err)
        }
      }
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
    return copySuccess
  }

  const handleExplainQuestion = async (question) => {
    // Create a prompt for ChatGPT
    const optionsText = question.options.map((opt, idx) => 
      `${String.fromCharCode(65 + idx)}. ${opt}`
    ).join('\n')
    
    const correctAnswerLabel = question.correctAnswer !== undefined 
      ? String.fromCharCode(65 + question.correctAnswer)
      : 'Not provided'
    
    const prompt = `Please explain this quiz question in detail:

Question: ${question.question}

Options:
${optionsText}

Correct Answer: ${correctAnswerLabel}

${question.explanation ? `Current Explanation: ${question.explanation}\n\n` : ''}Please provide a detailed explanation of why this answer is correct, including any relevant concepts, formulas, or reasoning that would help someone understand this topic better.`

    // Check if user has seen the modal before
    const hasSeenModal = localStorage.getItem('chatgpt_explain_modal_seen') === 'true'
    
    // Copy prompt to clipboard
    const copySuccess = await copyToClipboard(prompt)
    
    if (hasSeenModal) {
      // User has seen the modal before, directly open ChatGPT
      openChatGPT()
      if (copySuccess) {
        toast.success('Question copied! Paste it in ChatGPT (Ctrl+V / Cmd+V)')
      } else {
        toast.warning('Failed to copy. Please copy manually.')
      }
    } else {
      // First time user - show modal
      setCopiedPrompt(prompt)
      setShowCopyModal(true)
      if (copySuccess) {
        toast.success('Question copied!')
      } else {
        toast.warning('Please copy the text from the modal.')
      }
    }
  }

  const handleModalConfirm = async () => {
    // Mark modal as seen
    localStorage.setItem('chatgpt_explain_modal_seen', 'true')
    
    // Close modal
    setShowCopyModal(false)
    
    // Ensure prompt is copied (in case clipboard failed earlier)
    const copySuccess = await copyToClipboard(copiedPrompt)
    
    // Open ChatGPT
    openChatGPT()
    
    if (copySuccess) {
      toast.success('Question copied! Paste it in ChatGPT (Ctrl+V / Cmd+V)')
    } else {
      toast.warning('Please copy the text manually and paste it in ChatGPT.')
    }
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const startTimedQuiz = () => {
    // Navigate back to DailyQuiz with subject selected and show timed quiz modal
    navigate('/daily-quiz', {
      state: {
        subject: subject,
        category: category,
        subCategory: selectedSubCategory,
        isFunQuiz: isFunQuiz,
        startTimedQuiz: true
      }
    })
  }

  if (!user) {
    return null
  }

  if (loading && questions.length === 0) {
    return (
      <div className="quiz-browser-page">
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="quiz-browser-page">
      <div className="quiz-browser-header">
        <button className="back-btn" onClick={() => navigate('/daily-quiz')}>
          ← Back to Subjects
        </button>
        <h1>{subject?.name || 'Quiz Questions'}</h1>
        <p>Browse and practice questions at your own pace</p>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '1rem' }}>
          <button
            className="category-select-btn"
            onClick={() => setShowCategoryModal(true)}
            style={{
              padding: '0.5rem 1rem',
              background: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span>📁 Category: {selectedSubCategory}</span>
            <span>▼</span>
          </button>
          <div className="quiz-stats">
            <span>Total Questions: {totalQuestions}</span>
            <span>Page {currentPage} of {totalPages}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      {/* Timed Quiz Section */}
      <div className="timed-quiz-section">
        <div className="timed-quiz-card">
          <div className="timed-quiz-icon">⏱️</div>
          <div className="timed-quiz-content">
            <h3>Ready for a Timed Quiz?</h3>
            <p>Test yourself with a timed quiz session. Answer questions within the time limit and see your score!</p>
          </div>
          <button className="start-timed-quiz-btn" onClick={startTimedQuiz}>
            Start Timed Quiz
          </button>
        </div>
      </div>

      {/* Questions List */}
      <div className="questions-container">
        {questions.length === 0 && !loading ? (
          <div className="no-questions">
            <p>No questions available for this subject.</p>
          </div>
        ) : (
          questions.map((question, index) => {
            const questionNumber = (currentPage - 1) * questionsPerPage + index + 1
            const userAnswer = userAnswers[question._id]
            const correctAnswer = question.correctAnswer !== undefined ? question.correctAnswer : null

            return (
              <div key={question._id || index} className="question-card">
                <div className="question-header">
                  <span className="question-number">Question {questionNumber}</span>
                  {userAnswer && correctAnswer !== null && (
                    <span className={`answer-status ${userAnswer.isCorrect ? 'correct' : 'incorrect'}`}>
                      {userAnswer.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                    </span>
                  )}
                </div>
                
                <div className="question-text">
                  {question.question}
                  {question.createdBy?.name && (
                    <div className="contributor-badge">
                      ✨ Contributed by {question.createdBy.name}
                    </div>
                  )}
                  {question.contributorName && !question.createdBy?.name && (
                    <div className="contributor-badge">
                      ✨ Contributed by {question.contributorName}
                    </div>
                  )}
                </div>

                <div className="options-list">
                  {question.options && question.options.map((option, optionIndex) => {
                    const isSelected = userAnswer?.selectedAnswer === optionIndex
                    const isCorrect = correctAnswer !== null && optionIndex === correctAnswer
                    const showFeedback = userAnswer !== undefined && correctAnswer !== null

                    return (
                      <div
                        key={optionIndex}
                        className={`option-item ${
                          isSelected ? 'selected' : ''
                        } ${
                          showFeedback && isCorrect ? 'correct-answer' : ''
                        } ${
                          showFeedback && isSelected && !isCorrect ? 'wrong-answer' : ''
                        }`}
                        onClick={() => {
                          if (!userAnswer && correctAnswer !== null) {
                            handleAnswerSelect(question._id, optionIndex, correctAnswer)
                          }
                        }}
                      >
                        <div className="option-label">
                          {String.fromCharCode(65 + optionIndex)}
                        </div>
                        <div className="option-text">{option}</div>
                        {showFeedback && isCorrect && (
                          <div className="correct-badge">✓</div>
                        )}
                        {showFeedback && isSelected && !isCorrect && (
                          <div className="wrong-badge">✗</div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {userAnswer && question.explanation && (
                  <div className="explanation">
                    <strong>Explanation:</strong> {question.explanation}
                  </div>
                )}

                <div className="question-actions">
                  <button 
                    className="explain-btn"
                    onClick={() => handleExplainQuestion(question)}
                    title="Get detailed explanation from ChatGPT"
                  >
                    💡 Explain with ChatGPT
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Copy Prompt Modal */}
      {showCopyModal && (
        <div className="modal-overlay copy-prompt-modal-overlay" onClick={() => setShowCopyModal(false)}>
          <div className="modal-content copy-prompt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📋 Question Copied to Clipboard</h2>
              <button className="modal-close" onClick={() => setShowCopyModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="copy-instructions">
                <p><strong>✅ The question has been copied to your clipboard!</strong></p>
                <p>Now follow these steps:</p>
                <ol>
                  <li>Click the button below to open ChatGPT</li>
                  <li>Paste the text using <strong>Ctrl+V</strong> (Windows/Linux) or <strong>Cmd+V</strong> (Mac)</li>
                  <li>Press Enter to send</li>
                </ol>
                <p className="note-text">💡 This instruction will only show once. Next time, ChatGPT will open directly.</p>
              </div>
              <div className="prompt-preview">
                <label>Preview of what was copied:</label>
                <textarea
                  readOnly
                  value={copiedPrompt}
                  className="prompt-textarea"
                  onClick={(e) => e.target.select()}
                />
                <button 
                  className="copy-again-btn"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(copiedPrompt)
                      toast.success('Copied again!')
                    } catch (err) {
                      toast.error('Failed to copy. Please select and copy manually.')
                    }
                  }}
                >
                  📋 Copy Again
                </button>
              </div>
              <div className="modal-actions">
                <button 
                  className="open-chatgpt-btn"
                  onClick={handleModalConfirm}
                >
                  ✅ Got it! Open ChatGPT
                </button>
                <button 
                  className="close-modal-btn"
                  onClick={() => setShowCopyModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <div className="page-numbers">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }
              
              return (
                <button
                  key={pageNum}
                  className={`page-number ${currentPage === pageNum ? 'active' : ''}`}
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>
          <button
            className="page-btn"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}

      {/* Category Selection Modal */}
      {showCategoryModal && category && (
        <div className="modal-overlay copy-prompt-modal-overlay" onClick={() => setShowCategoryModal(false)}>
          <div className="modal-content copy-prompt-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Select Category - {subject?.name}</h2>
              <button className="modal-close" onClick={() => setShowCategoryModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="category-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: '0.75rem',
                maxHeight: '400px',
                overflowY: 'auto',
                padding: '1rem'
              }}>
                {getCategoriesForSubject(category).map(cat => (
                  <button
                    key={cat}
                    className={`option-btn ${selectedSubCategory === cat ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedSubCategory(cat)
                      setShowCategoryModal(false)
                    }}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '2px solid #E5E7EB',
                      background: selectedSubCategory === cat ? '#3B82F6' : 'white',
                      color: selectedSubCategory === cat ? 'white' : '#374151',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    {cat}
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

export default QuizBrowser


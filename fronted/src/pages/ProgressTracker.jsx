import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { toast } from '../utils/toast'
import './ProgressTracker.css'

const ProgressTracker = ({ user }) => {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

  const getAuthToken = () => {
    return localStorage.getItem('authToken')
  }

  useEffect(() => {
    fetchStats()
    // Show "under production" toast
    toast.info('This page is under production', 5000)
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const token = getAuthToken()
      if (!token) {
        setError('You are not authenticated. Please sign in again.')
        setTimeout(() => navigate('/signin'), 2000)
        return
      }

      const response = await axios.get(`${API_BASE_URL}/quiz/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.data.status === 'success') {
        setStats(response.data.data)
      } else {
        setError('Failed to fetch statistics.')
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
      if (err.response?.status === 401) {
        setError('Your session has expired. Please sign in again.')
        localStorage.removeItem('authToken')
        localStorage.removeItem('user')
        setTimeout(() => navigate('/signin'), 2000)
      } else {
        setError(err.response?.data?.message || 'Failed to fetch statistics.')
      }
    } finally {
      setLoading(false)
    }
  }

  const categoryNames = {
    'general-knowledge': 'General Knowledge',
    'mathematics': 'Mathematics',
    'english': 'English',
    'malayalam': 'Malayalam',
    'constitution': 'Constitution',
    'reasoning': 'Reasoning',
    'computer': 'Computer',
    'current-affairs': 'Current Affairs',
    'mixed': 'Mixed'
  }

  const formatTime = (seconds) => {
    if (!seconds) return '0 min'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes} min`
  }

  if (!user) {
    navigate('/')
    return null
  }

  if (loading) {
    return (
      <div className="progress-tracker-page">
        <div className="loading-container">
          <div className="spinner">⏳</div>
          <p>Loading your progress...</p>
        </div>
      </div>
    )
  }

  const overall = stats?.overall || {
    totalQuizzes: 0,
    totalQuestions: 0,
    totalCorrect: 0,
    averageScore: 0,
    totalTimeSpent: 0,
    bestScore: 0
  }

  const categoryStats = stats?.byCategory || []

  return (
    <div className="progress-tracker-page">
      <div className="progress-header">
        <h1>📊 Progress Tracker</h1>
        <p>Track your performance and improvement over time</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Overall Statistics */}
      <section className="overall-stats">
        <h2>Overall Performance</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📝</div>
            <div className="stat-content">
              <div className="stat-value">{overall.totalQuizzes}</div>
              <div className="stat-label">Total Quizzes</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">❓</div>
            <div className="stat-content">
              <div className="stat-value">{overall.totalQuestions}</div>
              <div className="stat-label">Questions Attempted</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-value">{overall.totalCorrect}</div>
              <div className="stat-label">Correct Answers</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-content">
              <div className="stat-value">{Math.round(overall.averageScore || 0)}%</div>
              <div className="stat-label">Average Score</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🏆</div>
            <div className="stat-content">
              <div className="stat-value">{Math.round(overall.bestScore || 0)}%</div>
              <div className="stat-label">Best Score</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">⏱️</div>
            <div className="stat-content">
              <div className="stat-value">{formatTime(overall.totalTimeSpent)}</div>
              <div className="stat-label">Total Study Time</div>
            </div>
          </div>
        </div>
      </section>

      {/* Category-wise Performance */}
      <section className="category-stats">
        <h2>Subject-wise Performance</h2>
        {categoryStats.length > 0 ? (
          <div className="category-grid">
            {categoryStats.map((cat, index) => (
              <div key={index} className="category-card">
                <div className="category-header">
                  <h3>{categoryNames[cat._id] || cat._id}</h3>
                  <span className="attempts-badge">{cat.attempts} attempts</span>
                </div>
                <div className="category-metrics">
                  <div className="metric">
                    <span className="metric-label">Average Score</span>
                    <span className="metric-value">{Math.round(cat.averageScore || 0)}%</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Best Score</span>
                    <span className="metric-value best">{Math.round(cat.bestScore || 0)}%</span>
                  </div>
                </div>
                <div className="progress-bar-container">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${Math.min(cat.averageScore || 0, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <p>No quiz data available yet.</p>
            <p className="empty-subtitle">Complete some quizzes to see your progress here!</p>
            <button 
              className="start-quiz-btn"
              onClick={() => navigate('/daily-quiz')}
            >
              Start Your First Quiz
            </button>
          </div>
        )}
      </section>

      {/* Accuracy Chart */}
      {overall.totalQuestions > 0 && (
        <section className="accuracy-section">
          <h2>Accuracy Breakdown</h2>
          <div className="accuracy-card">
            <div className="accuracy-visual">
              <div className="accuracy-circle">
                <div className="accuracy-value">
                  {Math.round((overall.totalCorrect / overall.totalQuestions) * 100)}%
                </div>
                <div className="accuracy-label">Overall Accuracy</div>
              </div>
            </div>
            <div className="accuracy-details">
              <div className="accuracy-item correct">
                <span className="accuracy-icon">✅</span>
                <div className="accuracy-info">
                  <span className="accuracy-count">{overall.totalCorrect}</span>
                  <span className="accuracy-text">Correct</span>
                </div>
              </div>
              <div className="accuracy-item incorrect">
                <span className="accuracy-icon">❌</span>
                <div className="accuracy-info">
                  <span className="accuracy-count">{overall.totalQuestions - overall.totalCorrect}</span>
                  <span className="accuracy-text">Incorrect</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

export default ProgressTracker


import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './Leaderboard.css'

const Leaderboard = ({ user }) => {
  const navigate = useNavigate()
  const [leaderboard, setLeaderboard] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [currentUserRank, setCurrentUserRank] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

  const getAuthToken = () => {
    return localStorage.getItem('authToken')
  }

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const token = getAuthToken()
      if (!token) {
        setError('You are not authenticated. Please sign in again.')
        setTimeout(() => navigate('/signin'), 2000)
        return
      }

      const response = await axios.get(`${API_BASE_URL}/quiz/leaderboard`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.data.status === 'success') {
        setLeaderboard(response.data.data.leaderboard)
        setCurrentUser(response.data.data.currentUser)
        setCurrentUserRank(response.data.data.currentUserRank)
      } else {
        setError('Failed to fetch leaderboard.')
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err)
      if (err.response?.status === 401) {
        setError('Your session has expired. Please sign in again.')
        localStorage.removeItem('authToken')
        localStorage.removeItem('user')
        setTimeout(() => navigate('/signin'), 2000)
      } else {
        setError(err.response?.data?.message || 'Failed to fetch leaderboard.')
      }
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  const getRankClass = (rank) => {
    if (rank === 1) return 'rank-first'
    if (rank === 2) return 'rank-second'
    if (rank === 3) return 'rank-third'
    return ''
  }

  if (!user) {
    navigate('/')
    return null
  }

  if (loading) {
    return (
      <div className="leaderboard-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading leaderboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-header">
        <h1>🏆 Leaderboard</h1>
        <p>See where you rank among all quiz enthusiasts</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Current User Card */}
      {currentUser && (
        <div className="current-user-card">
          <div className="user-rank-badge">
            <span className="rank-number">{currentUserRank}</span>
            <span className="rank-label">Your Rank</span>
          </div>
          <div className="user-info">
            <div className="user-avatar">
              {currentUser.avatar || '👤'}
            </div>
            <div className="user-details">
              <h3>{currentUser.name}</h3>
              <div className="user-stats">
                <span className="stat-item">
                  <span className="stat-icon">🏆</span>
                  {currentUser.battlesWon || 0} Wins
                </span>
                <span className="stat-item">
                  <span className="stat-icon">⚔️</span>
                  {currentUser.totalBattles || 0} Battles
                </span>
                <span className="stat-item">
                  <span className="stat-icon">📊</span>
                  {Math.round(currentUser.averageScore || 0)}% Avg
                </span>
              </div>
            </div>
          </div>
          <div className="user-xp">
            <span className="xp-value">{currentUser.battlesWon || 0}</span>
            <span className="xp-label">Battle Wins</span>
          </div>
        </div>
      )}

      {/* Top 3 Podium */}
      {leaderboard.length >= 3 && (
        <div className="podium-section">
          <div className="podium">
            <div className="podium-item second">
              <div className="podium-avatar">{leaderboard[1]?.avatar || '👤'}</div>
              <div className="podium-rank">🥈</div>
              <div className="podium-name">{leaderboard[1]?.name}</div>
              <div className="podium-xp">{leaderboard[1]?.battlesWon || 0} Wins</div>
            </div>
            <div className="podium-item first">
              <div className="podium-avatar">{leaderboard[0]?.avatar || '👤'}</div>
              <div className="podium-rank">🥇</div>
              <div className="podium-name">{leaderboard[0]?.name}</div>
              <div className="podium-xp">{leaderboard[0]?.battlesWon || 0} Wins</div>
            </div>
            <div className="podium-item third">
              <div className="podium-avatar">{leaderboard[2]?.avatar || '👤'}</div>
              <div className="podium-rank">🥉</div>
              <div className="podium-name">{leaderboard[2]?.name}</div>
              <div className="podium-xp">{leaderboard[2]?.battlesWon || 0} Wins</div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard List */}
      <div className="leaderboard-list">
        <h2>Full Rankings</h2>
        {leaderboard.length > 0 ? (
          <div className="leaderboard-table">
            {leaderboard.map((entry, index) => (
              <div
                key={index}
                className={`leaderboard-row ${getRankClass(entry.rank)} ${entry.isCurrentUser ? 'current-user' : ''}`}
              >
                <div className="rank-column">
                  <span className="rank-icon">{getRankIcon(entry.rank)}</span>
                </div>
                <div className="user-column">
                  <div className="user-avatar-small">
                    {entry.avatar || '👤'}
                  </div>
                  <div className="user-info-small">
                    <div className="user-name">{entry.name}</div>
                    {entry.isCurrentUser && (
                      <span className="you-badge">You</span>
                    )}
                  </div>
                </div>
                <div className="level-column">
                  <span className="level-badge">⚔️ {entry.totalBattles || 0} Battles</span>
                </div>
                <div className="stats-column">
                  <div className="stat-small">
                    <span className="stat-label-small">Wins</span>
                    <span className="stat-value-small">{entry.battlesWon || 0}</span>
                  </div>
                  <div className="stat-small">
                    <span className="stat-label-small">Losses</span>
                    <span className="stat-value-small">{entry.battlesLost || 0}</span>
                  </div>
                </div>
                <div className="xp-column">
                  <div className="xp-display">
                    <span className="xp-value-large">{entry.battlesWon || 0}</span>
                    <span className="xp-label-small">Wins</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🏆</div>
            <p>No leaderboard data available yet.</p>
            <p className="empty-subtitle">Complete quizzes to appear on the leaderboard!</p>
            <button 
              className="start-quiz-btn"
              onClick={() => navigate('/daily-quiz')}
            >
              Start Your First Quiz
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Leaderboard


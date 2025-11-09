import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { toast } from '../utils/toast'
import './Profile.css'

const Profile = ({ user }) => {
  const navigate = useNavigate()
  const [profileData, setProfileData] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    bio: '',
    pscStream: ''
  })

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

  const getAuthToken = () => {
    return localStorage.getItem('authToken')
  }

  useEffect(() => {
    if (!user) {
      navigate('/')
      return
    }
    fetchProfileData()
    fetchStats()
  }, [user])

  const fetchProfileData = async () => {
    try {
      const token = getAuthToken()
      if (!token) {
        setError('You are not authenticated. Please sign in again.')
        setTimeout(() => navigate('/signin'), 2000)
        return
      }

      // Fetch user data from API
      const response = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.data.status === 'success') {
        const userData = response.data.data
        setProfileData(userData)
        setEditForm({
          name: userData.name || '',
          phone: userData.phone || '',
          bio: userData.bio || '',
          pscStream: userData.pscStream || 'other'
        })
        // Update localStorage with fresh data
        localStorage.setItem('user', JSON.stringify({
          id: userData._id,
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          pscStream: userData.pscStream,
          role: userData.role
        }))
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
      // Fallback to localStorage if API fails
      const userData = JSON.parse(localStorage.getItem('user') || '{}')
      setProfileData(userData)
      setEditForm({
        name: userData.name || '',
        phone: userData.phone || '',
        bio: userData.bio || '',
        pscStream: userData.pscStream || 'other'
      })
      if (err.response?.status !== 401) {
        setError('Failed to load profile data.')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const token = getAuthToken()
      if (!token) return

      const response = await axios.get(`${API_BASE_URL}/quiz/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.data.status === 'success') {
        setStats(response.data.data)
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    // Reset form to original values
    const userData = JSON.parse(localStorage.getItem('user') || '{}')
    setEditForm({
      name: userData.name || '',
      phone: userData.phone || '',
      bio: userData.bio || '',
      pscStream: userData.pscStream || 'other'
    })
  }

  const handleSave = async () => {
    try {
      const token = getAuthToken()
      if (!token) {
        setError('You are not authenticated. Please sign in again.')
        return
      }

      // Update user data via API
      const response = await axios.put(`${API_BASE_URL}/auth/me`, editForm, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.data.status === 'success') {
        const updatedUser = response.data.data
        setProfileData(updatedUser)
        setIsEditing(false)
        
        // Update localStorage
        localStorage.setItem('user', JSON.stringify({
          id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          pscStream: updatedUser.pscStream,
          role: updatedUser.role
        }))
        
        toast.success('Profile updated successfully!')
      }
    } catch (err) {
      console.error('Error updating profile:', err)
      setError(err.response?.data?.message || 'Failed to update profile.')
    }
  }

  const handleInputChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const pscStreamNames = {
    'ldc': 'LDC',
    'degree': 'Degree',
    'plus-two': 'Plus Two',
    'tenth': 'Tenth',
    'police': 'Police',
    'secretariat': 'Secretariat',
    'other': 'Other'
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const formatTime = (minutes) => {
    if (!minutes) return '0 min'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${minutes} min`
  }

  if (!user) {
    navigate('/')
    return null
  }

  if (loading) {
    return (
      <div className="profile-page">
        <div className="loading-container">
          <div className="spinner">⏳</div>
          <p>Loading your profile...</p>
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

  const currentUser = profileData || user
  const battleStats = currentUser.battleStats || {
    battlesWon: 0,
    totalBattles: 0,
    battlesLost: 0,
    winStreak: 0
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>👤 My Profile</h1>
        <p>Manage your profile and view your progress</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="profile-content">
        {/* Profile Card */}
        <div className="profile-card">
          <div className="profile-avatar-section">
            <div className="profile-avatar-large">
              {currentUser.avatar || currentUser.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="profile-info">
              {!isEditing ? (
                <>
                  <h2>{currentUser.name}</h2>
                  <p className="profile-email">{currentUser.email}</p>
                  {currentUser.pscStream && (
                    <span className="psc-badge">
                      {pscStreamNames[currentUser.pscStream] || currentUser.pscStream}
                    </span>
                  )}
                  {currentUser.bio && (
                    <p className="profile-bio">{currentUser.bio}</p>
                  )}
                  <button className="edit-profile-btn" onClick={handleEdit}>
                    ✏️ Edit Profile
                  </button>
                </>
              ) : (
                <div className="edit-form">
                  <div className="form-group">
                    <label>Name</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="form-input"
                      placeholder="10 digit phone number"
                    />
                  </div>
                  <div className="form-group">
                    <label>PSC Stream</label>
                    <select
                      value={editForm.pscStream}
                      onChange={(e) => handleInputChange('pscStream', e.target.value)}
                      className="form-input"
                    >
                      {Object.entries(pscStreamNames).map(([key, value]) => (
                        <option key={key} value={key}>{value}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Bio</label>
                    <textarea
                      value={editForm.bio}
                      onChange={(e) => handleInputChange('bio', e.target.value)}
                      className="form-input"
                      rows="3"
                      maxLength="200"
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                  <div className="form-actions">
                    <button className="save-btn" onClick={handleSave}>
                      💾 Save Changes
                    </button>
                    <button className="cancel-btn" onClick={handleCancel}>
                      ❌ Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Battle Stats Card */}
        <div className="level-card">
          <div className="level-info">
            <div className="level-badge-large">
              <span className="level-number">🏆</span>
              <span className="level-label">Battle Stats</span>
            </div>
            <div className="xp-info">
              <div className="xp-value">{battleStats.battlesWon || 0} Wins</div>
              <div className="xp-progress">
                <div className="xp-progress-bar">
                  <div 
                    className="xp-progress-fill" 
                    style={{ width: `${battleStats.totalBattles > 0 ? Math.round((battleStats.battlesWon / battleStats.totalBattles) * 100) : 0}%` }}
                  ></div>
                </div>
                <span className="xp-to-next">
                  {battleStats.totalBattles || 0} Total Battles • {battleStats.winStreak || 0} Win Streak
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="stats-section">
          <h2>📊 Your Statistics</h2>
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
                <div className="stat-value">{formatTime(Math.round(overall.totalTimeSpent / 60))}</div>
                <div className="stat-label">Study Time</div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="account-section">
          <h2>ℹ️ Account Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Email</span>
              <span className="info-value">{currentUser.email}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Phone</span>
              <span className="info-value">{currentUser.phone || 'Not provided'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Member Since</span>
              <span className="info-value">
                {formatDate(currentUser.createdAt || currentUser.registrationDate)}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Last Login</span>
              <span className="info-value">
                {formatDate(currentUser.lastLogin)}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="actions-section">
          <h2>⚡ Quick Actions</h2>
          <div className="actions-grid">
            <button 
              className="action-btn"
              onClick={() => {
                toast.info('This page is under production. Coming soon!', 5000)
              }}
            >
              📊 View Progress
            </button>
            <button 
              className="action-btn"
              onClick={() => navigate('/leaderboard')}
            >
              🏆 View Leaderboard
            </button>
            <button 
              className="action-btn"
              onClick={() => navigate('/daily-quiz')}
            >
              📚 Start Quiz
            </button>
            <button 
              className="action-btn"
              onClick={() => navigate('/notes')}
            >
              📝 My Notes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile


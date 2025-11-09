import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { toast } from '../utils/toast'
import './Dashboard.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const Dashboard = ({ user }) => {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [userRank, setUserRank] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user])

  const getAuthToken = () => {
    return localStorage.getItem('authToken')
  }

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const token = getAuthToken()
      if (!token) return

      // Fetch user profile
      const profileResponse = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (profileResponse.data.status === 'success') {
        setUserProfile(profileResponse.data.data)
      }

      // Fetch quiz stats
      const statsResponse = await axios.get(`${API_BASE_URL}/quiz/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (statsResponse.data.status === 'success') {
        setStats(statsResponse.data.data)
      }

      // Fetch leaderboard to get user rank
      const leaderboardResponse = await axios.get(`${API_BASE_URL}/quiz/leaderboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (leaderboardResponse.data.status === 'success') {
        setUserRank(leaderboardResponse.data.data.currentUserRank)
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  const features = [
    {
      id: 1,
      title: "📚 Daily Quiz",
      description: "Practice with new questions every day across all subjects",
      route: "/daily-quiz",
      color: "#667eea",
      stats: "10+ new questions daily"
    },
    {
      id: 2,
      title: "⚡ Quiz Battle",
      description: "Compete with other students in real-time quiz competitions",
      route: "/live-quiz",
      color: "#f093fb",
      stats: "Live rankings"
    },
    {
      id: 3,
      title: "📝 Quiz from Notes",
      description: "Upload your handwritten notes and get AI-generated quizzes",
      route: "/notes",
      color: "#4facfe",
      stats: "AI powered"
    },
    {
      id: 4,
      title: "✍️ Note Making",
      description: "Create and organize your study notes with smart features",
      route: "/notes",
      color: "#43e97b",
      stats: "Smart organization"
    },
    {
      id: 5,
      title: "💬 Community Chat",
      description: "Discuss with fellow PSC aspirants and clear doubts",
      route: "/chat",
      color: "#fa709a",
      stats: "Active community"
    },
    {
      id: 6,
      title: "📊 Progress Tracker",
      description: "Analyze your performance and track your improvement",
      route: "/progress",
      color: "#ff9a9e",
      stats: "Detailed analytics"
    },
    {
      id: 7,
      title: "🏆 Leaderboard",
      description: "Check your rank among all PSC aspirants",
      route: "/leaderboard",
      color: "#fed6e3",
      stats: "Live rankings"
    }
  ]

  const quickStats = [
    { 
      label: "Quizzes Taken", 
      value: stats?.overall?.totalQuizzes || 0, 
      icon: "📊" 
    },
    { 
      label: "Current Rank", 
      value: userRank ? `#${userRank}` : "N/A", 
      icon: "🏆" 
    },
    { 
      label: "Battle Wins", 
      value: userProfile?.battleStats?.battlesWon || 0, 
      icon: "⚔️" 
    }
  ]

  const streak = userProfile?.stats?.currentStreak || 0

  return (
    <div className="dashboard">
      {/* Welcome Header */}
      <header className="dashboard-header">
        <div className="welcome-section">
          <h1>Welcome back, {user?.name}! 👋</h1>
          <p>Ready to continue your PSC preparation journey?</p>
        </div>
        <div className="user-stats">
          {quickStats.map((stat, index) => (
            <div key={index} className="stat-card">
              <span className="stat-icon">{stat.icon}</span>
              <div className="stat-info">
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </header>

      {/* Daily Goal Section */}
      <section className="daily-goal">
        <div className="goal-card">
          <h3>🎯 Today's Goal</h3>
          <div className="goal-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${Math.min((stats?.overall?.totalQuizzes || 0) >= 1 ? 100 : 0, 100)}%` }}></div>
            </div>
            <span>{stats?.overall?.totalQuizzes >= 1 ? '100%' : '0%'} completed</span>
          </div>
          <p>Complete at least 1 quiz to maintain your streak! {streak > 0 && `🔥 ${streak} day streak!`}</p>
        </div>
      </section>

      {/* Quick Actions Grid */}
      <section className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="features-grid">
          {features.map(feature => (
            <div 
              key={feature.id}
              className="feature-card"
              style={{ '--card-color': feature.color }}
              onClick={() => {
              if (feature.route === '/progress') {
                toast.info('This page is under production. Coming soon!', 5000)
              } else {
                navigate(feature.route)
              }
            }}
            >
              <div className="feature-header">
                <h3>{feature.title}</h3>
                <div className="feature-stats">{feature.stats}</div>
              </div>
              <p>{feature.description}</p>
              <div className="feature-arrow">→</div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Activity */}
      <section className="recent-activity">
        <h2>Recent Activity</h2>
        <div className="activity-list">
          <div className="activity-item">
            <div className="activity-icon">🎉</div>
            <div className="activity-content">
              <p>Welcome to PSC Quiz Master!</p>
              <span>Just now</span>
            </div>
          </div>
          <div className="activity-placeholder">
            <p>Complete your first quiz to see your activity here!</p>
            <button 
              className="start-quiz-btn"
              onClick={() => navigate('/daily-quiz')}
            >
              Start Your First Quiz
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Dashboard
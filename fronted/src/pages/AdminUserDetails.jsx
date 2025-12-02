import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import './AdminUserDetails.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const AdminUserDetails = () => {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)
  const [activity, setActivity] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [userRes, activityRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/admin/users/${id}`),
          axios.get(`${API_BASE_URL}/admin/users/${id}/activity`)
        ])
        setUser(userRes.data.data)
        setActivity(activityRes.data.data)
      } catch (err) {
        console.error('Error loading user details:', err)
        setError(err.response?.data?.message || 'Failed to load user details')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchData()
    }
  }, [id])

  if (loading) {
    return <div className="admin-users loading">Loading user details...</div>
  }

  if (error) {
    return <div className="admin-users error-message">{error}</div>
  }

  if (!user) {
    return <div className="admin-users error-message">User not found</div>
  }

  const overview = activity?.overview || {}
  const quizStats = activity?.quizzes || {}
  const chats = activity?.chats || []
  const questions = activity?.questions || []
  const uploads = activity?.uploads || []
  const devMessages = activity?.developerMessages || []

  return (
    <div className="admin-users admin-user-details">
      <div className="page-header">
        <h1>User Activity</h1>
      </div>

      <div className="user-details-header">
        <div className="user-info">
          <div className="user-avatar large">
            {user.name?.charAt(0).toUpperCase()}
          </div>
          <div className="user-details">
            <div className="user-name">{user.name}</div>
            <div className="user-email">{user.email}</div>
            <div className="user-meta">
              <span className={`role-badge ${user.role}`}>{user.role}</span>
              <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                {user.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="user-meta">
              <span>Joined: {new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="users-stats">
        <div className="stat-card">
          <div className="stat-value">{quizStats.totalQuizzes || 0}</div>
          <div className="stat-label">Quizzes Taken</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{quizStats.totalQuestions || 0}</div>
          <div className="stat-label">Questions Answered</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{overview.questionsContributed || 0}</div>
          <div className="stat-label">Questions Contributed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{uploads.length}</div>
          <div className="stat-label">PDF Uploads</div>
        </div>
      </div>

      <div className="user-activity-tabs">
        <button
          className={`user-activity-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`user-activity-tab ${activeTab === 'quizzes' ? 'active' : ''}`}
          onClick={() => setActiveTab('quizzes')}
        >
          Quiz History
        </button>
        <button
          className={`user-activity-tab ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          Chat History
        </button>
        <button
          className={`user-activity-tab ${activeTab === 'questions' ? 'active' : ''}`}
          onClick={() => setActiveTab('questions')}
        >
          Contributions
        </button>
        <button
          className={`user-activity-tab ${activeTab === 'uploads' ? 'active' : ''}`}
          onClick={() => setActiveTab('uploads')}
        >
          Uploads
        </button>
        <button
          className={`user-activity-tab ${activeTab === 'dev' ? 'active' : ''}`}
          onClick={() => setActiveTab('dev')}
        >
          Dev Messages
        </button>
      </div>

      <div className="user-activity-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            <h2>Overview</h2>
            <ul>
              <li>Total quizzes taken: {quizStats.totalQuizzes || 0}</li>
              <li>Total questions answered: {quizStats.totalQuestions || 0}</li>
              <li>Correct answers: {quizStats.totalCorrect || 0}</li>
              <li>Average score: {Math.round(quizStats.averageScore || 0)}%</li>
              <li>Total chat messages: {chats.length}</li>
              <li>Questions contributed: {overview.questionsContributed || 0}</li>
            </ul>
          </div>
        )}

        {activeTab === 'quizzes' && (
          <div className="activity-list">
            <h2>Quiz Sessions</h2>
            {quizStats.sessions && quizStats.sessions.length > 0 ? (
              <ul>
                {quizStats.sessions.map((s) => (
                  <li key={s.id}>
                    <strong>{new Date(s.date).toLocaleString()}</strong> – {s.category} / {s.subCategory} –{' '}
                    {s.score}/{s.totalQuestions} ({Math.round(s.accuracy)}%)
                  </li>
                ))}
              </ul>
            ) : (
              <div>No quiz history found.</div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="activity-list">
            <h2>Chat Messages</h2>
            {chats.length > 0 ? (
              <ul>
                {chats.map((m) => (
                  <li key={m.id}>
                    <strong>{new Date(m.createdAt).toLocaleString()}:</strong> {m.message}
                  </li>
                ))}
              </ul>
            ) : (
              <div>No chat messages found.</div>
            )}
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="activity-list">
            <h2>Quiz Contributions</h2>
            {questions.length > 0 ? (
              <ul>
                {questions.map((q) => (
                  <li key={q.id}>
                    <strong>{q.status.toUpperCase()}</strong> – {q.category} – {q.question}
                  </li>
                ))}
              </ul>
            ) : (
              <div>No contributed questions found.</div>
            )}
          </div>
        )}

        {activeTab === 'uploads' && (
          <div className="activity-list">
            <h2>PDF Uploads</h2>
            {uploads.length > 0 ? (
              <ul>
                {uploads.map((pdf) => (
                  <li key={pdf.id}>
                    <strong>{pdf.title}</strong> – {pdf.subject} – {pdf.status} –{' '}
                    {new Date(pdf.createdAt).toLocaleString()}
                  </li>
                ))}
              </ul>
            ) : (
              <div>No uploads found.</div>
            )}
          </div>
        )}

        {activeTab === 'dev' && (
          <div className="activity-list">
            <h2>Developer Messages</h2>
            {devMessages.length > 0 ? (
              <ul>
                {devMessages.map((msg) => (
                  <li key={msg.id}>
                    <strong>{msg.status.toUpperCase()}</strong> – {msg.messageType} –{' '}
                    {new Date(msg.createdAt).toLocaleString()}
                    <div>{msg.message}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <div>No messages to developer found.</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminUserDetails



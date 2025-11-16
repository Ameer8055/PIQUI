import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import './AdminNavbar.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const AdminNavbar = ({ user }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const [pendingMessagesCount, setPendingMessagesCount] = useState(0)

  const adminMenuItems = [
    { path: '/admin/questions', label: 'Questions', icon: '❓' },
    { path: '/admin/users', label: 'Users', icon: '👥' },
    { path: '/admin/pdfs', label: 'Approvals', icon: '📄' },
    { path: '/admin/messages', label: 'Messages', icon: '💬' },
  ]

  // Fetch pending messages count
  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/admin/developer-messages/stats`)
        const stats = response.data.data || {}
        setPendingMessagesCount(stats.pending || 0)
      } catch (error) {
        console.error('Error fetching message stats:', error)
      }
    }

    fetchPendingCount()
    // Refresh every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000)
    return () => clearInterval(interval)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleLogout = () => {
    // Clear all authentication data
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    localStorage.removeItem('rememberMe')
    sessionStorage.clear()
    
    setIsDropdownOpen(false)
    window.location.href = '/'
  }

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen)
  }

  return (
    <nav className="admin-navbar">
      <div className="admin-nav-container">
        {/* Logo/Brand */}
        <div className="admin-nav-brand" onClick={() => navigate('/admin')}>
          <span className="brand-icon">⚙️</span>
          <span className="brand-text">PIQUI Admin</span>
        </div>

        {/* Admin Navigation Links */}
        <div className="admin-nav-links">
          {adminMenuItems.map(item => (
            <button
              key={item.path}
              className={`admin-nav-link ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {item.path === '/admin/messages' && pendingMessagesCount > 0 && (
                <span className="notification-badge">{pendingMessagesCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* User Profile with Dropdown */}
        <div className="admin-user-profile" ref={dropdownRef}>
          <div className="admin-user-info" onClick={toggleDropdown}>
            <div className="admin-user-avatar">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <span className="admin-user-name">{user?.name}</span>
            <span className="admin-dropdown-arrow">
              ▼
            </span>
          </div>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="admin-dropdown-menu">
              <div className="admin-dropdown-item user-info-item">
                <div className="admin-user-avatar-small">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="admin-user-details">
                  <div className="admin-user-name-full">{user?.name}</div>
                  <div className="admin-user-email">{user?.email}</div>
                  <div className="admin-user-role">Administrator</div>
                </div>
              </div>
              
              <div className="admin-dropdown-divider"></div>
              
              
              <button 
                className="admin-dropdown-item"
                onClick={() => {
                  navigate('/admin/settings')
                  setIsDropdownOpen(false)
                }}
              >
                <span className="admin-dropdown-icon">⚙️</span>
                Admin Settings
              </button>
              
              <div className="admin-dropdown-divider"></div>
              
              <button 
                className="admin-dropdown-item logout-button"
                onClick={handleLogout}
              >
                <span className="admin-dropdown-icon">🚪</span>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

export default AdminNavbar
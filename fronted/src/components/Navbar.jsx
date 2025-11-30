import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import './Navbar.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const Navbar = ({ user }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const dropdownRef = useRef(null)
  const mobileMenuRef = useRef(null)
  const [unreadRepliesCount, setUnreadRepliesCount] = useState(0)

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { path: '/daily-quiz', label: 'Daily Quiz', icon: '📚' },
    { path: '/live-quiz', label: 'Quiz Battle', icon: '⚡' },
    { path: '/notes', label: 'Notes', icon: '📝' },
    { path: '/chat', label: 'Chat', icon: '💬' }
  ]

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target) && 
          !event.target.closest('.mobile-menu-toggle')) {
        setIsMobileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [])

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMobileMenuOpen])

  // Fetch unread replies count
  useEffect(() => {
    if (!user) return

    const fetchUnreadCount = async () => {
      try {
        const token = localStorage.getItem('authToken')
        const response = await axios.get(`${API_BASE_URL}/developer-messages/my-messages`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { status: 'replied' }
        })
        const messages = response.data.data.messages || []
        const unread = messages.filter(msg => msg.adminReply && msg.adminReply.message && !msg.isRead).length
        setUnreadRepliesCount(unread)
      } catch (error) {
        console.error('Error fetching unread replies:', error)
      }
    }

    fetchUnreadCount()
    // Refresh every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000)
    
    // Listen for custom event to update count immediately
    const handleUpdateCount = (event) => {
      setUnreadRepliesCount(event.detail)
    }
    window.addEventListener('updateUnreadCount', handleUpdateCount)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('updateUnreadCount', handleUpdateCount)
    }
  }, [user])

  // Auto-hide toast after 4 seconds
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [showToast])

  const handleLogout = () => {
    // Clear all authentication data from localStorage
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    localStorage.removeItem('rememberMe')
    
    // Clear sessionStorage as well
    sessionStorage.clear()
    
    // Close dropdown
    setIsDropdownOpen(false)
    
    // This will trigger a re-render and the ProtectedRoute will redirect
    window.location.href = '/' // Force refresh to reset all state
  }

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen)
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
    setIsDropdownOpen(false)
  }

  const handleNavigation = (item) => {
    navigate(item.path)
    setIsMobileMenuOpen(false)
  }

  const closeToast = () => {
    setShowToast(false)
  }

  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          {/* Logo/Brand */}
          <div className="nav-brand" onClick={() => navigate('/dashboard')}>
            <span className="brand-icon"><img src="/viite.png" alt="brandicon" /></span>
          </div>

          {/* Desktop Navigation Links */}
          <div className="nav-links desktop-nav">
            {navItems.map(item => (
              <button
                key={item.path}
                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => handleNavigation(item)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
                {item.path === '/chat' && unreadRepliesCount > 0 && (
                  <span className="notification-badge">{unreadRepliesCount}</span>
                )}
              </button>
            ))}
          </div>

          {/* Right Side: User Profile + Mobile Menu Toggle */}
          <div className="nav-right">
            {/* User Profile with Dropdown (Desktop) */}
            <div className="user-profile desktop-profile" ref={dropdownRef}>
              <div className="user-info" onClick={toggleDropdown}>
                <div className="user-avatar">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
              </div>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="dropdown-menu">
                  <div className="dropdown-item user-info-item">
                    <div className="user-avatar-small">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-details">
                      <div className="user-name-full">{user?.name}</div>
                      <div className="user-email">{user?.email}</div>
                    </div>
                  </div>
                  
                  <div className="dropdown-divider"></div>
                  
                  <button 
                    className="dropdown-item"
                    onClick={() => {
                      navigate('/profile')
                      setIsDropdownOpen(false)
                    }}
                  >
                    <span className="dropdown-icon">👤</span>
                    My Profile
                  </button>
                  
                  <div className="dropdown-divider"></div>
                  
                  <button 
                    className="dropdown-item logout-button"
                    onClick={handleLogout}
                  >
                    <span className="dropdown-icon">🚪</span>
                    Logout
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Toggle Button */}
            <button 
              className="mobile-menu-toggle"
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
            >
              <span className={`hamburger-menu ${isMobileMenuOpen ? 'open' : ''}`}>
                <span></span>
                <span></span>
                <span></span>
              </span>
            </button>
          </div>
        </div>

      </nav>

      {/* Mobile Menu Overlay - Outside nav for proper z-index */}
      {isMobileMenuOpen && (
        <div 
          className={`mobile-menu-overlay ${isMobileMenuOpen ? 'active' : ''}`}
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        ></div>
      )}

      {/* Mobile Menu - Outside nav for proper z-index */}
      <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`} ref={mobileMenuRef}>
        <div className="mobile-menu-content">
          {/* User Info in Mobile Menu */}
          <div className="mobile-user-info">
            <div className="mobile-user-avatar">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="mobile-user-details">
              <div className="mobile-user-name">{user?.name}</div>
              <div className="mobile-user-email">{user?.email}</div>
            </div>
          </div>

          <div className="mobile-nav-divider"></div>

          {/* Mobile Navigation Links */}
          <div className="mobile-nav-links">
            {navItems.map(item => (
              <button
                key={item.path}
                className={`mobile-nav-link ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => handleNavigation(item)}
              >
                <span className="mobile-nav-icon">{item.icon}</span>
                <span className="mobile-nav-label">{item.label}</span>
                {item.path === '/chat' && unreadRepliesCount > 0 && (
                  <span className="mobile-notification-badge">{unreadRepliesCount}</span>
                )}
                {location.pathname === item.path && (
                  <span className="mobile-active-indicator">✓</span>
                )}
              </button>
            ))}
          </div>

          <div className="mobile-nav-divider"></div>

          {/* Mobile Menu Actions */}
          <div className="mobile-menu-actions">
            <button 
              className="mobile-menu-item"
              onClick={() => {
                navigate('/profile')
                setIsMobileMenuOpen(false)
              }}
            >
              <span className="mobile-menu-icon">👤</span>
              My Profile
            </button>
            
            <button 
              className="mobile-menu-item logout-button"
              onClick={handleLogout}
            >
              <span className="mobile-menu-icon">🚪</span>
              Logout
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default Navbar
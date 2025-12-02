import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import './ContributorNavbar.css'

const ContributorNavbar = ({ user }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const dropdownRef = useRef(null)
  const mobileMenuRef = useRef(null)

  const navItems = [
    { path: '/contributor', label: 'Dashboard', icon: '📝' },
    { path: '/chat', label: 'Community Chat', icon: '💬' }
  ]

  // Close dropdown / mobile when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target) &&
        !event.target.closest('.mobile-menu-toggle')
      ) {
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

  // Close mobile on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  // Prevent body scroll when mobile menu open
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

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    localStorage.removeItem('rememberMe')
    sessionStorage.clear()
    setIsDropdownOpen(false)
    window.location.href = '/'
  }

  const handleNavigation = (item) => {
    navigate(item.path)
    setIsMobileMenuOpen(false)
  }

  return (
    <>
      <nav className="navbar contributor-navbar">
        <div className="nav-container">
          {/* Logo */}
          <div className="nav-brand" onClick={() => navigate('/contributor')}>
            <span className="brand-icon"><img src="/viite.png" alt="brandicon" /></span>
            <span className="contributor-label">Contributor</span>
          </div>

          {/* Desktop links */}
          <div className="nav-links desktop-nav">
            {navItems.map(item => (
              <button
                key={item.path}
                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => handleNavigation(item)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Right side */}
          <div className="nav-right">
            <div className="user-profile desktop-profile" ref={dropdownRef}>
              <div className="user-info" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                <div className="user-avatar">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
              </div>

              {isDropdownOpen && (
                <div className="dropdown-menu">
                  <div className="dropdown-item user-info-item">
                    <div className="user-avatar-small">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-details">
                      <div className="user-name-full">{user?.name}</div>
                      <div className="user-email">{user?.email}</div>
                      <div className="user-role">Contributor</div>
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

            {/* Mobile toggle */}
            <button
              className="mobile-menu-toggle"
              onClick={() => {
                setIsMobileMenuOpen(!isMobileMenuOpen)
                setIsDropdownOpen(false)
              }}
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

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className={`mobile-menu-overlay ${isMobileMenuOpen ? 'active' : ''}`}
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        ></div>
      )}

      {/* Mobile menu */}
      <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`} ref={mobileMenuRef}>
        <div className="mobile-menu-content">
          <div className="mobile-user-info">
            <div className="mobile-user-avatar">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="mobile-user-details">
              <div className="mobile-user-name">{user?.name}</div>
              <div className="mobile-user-email">{user?.email}</div>
              <div className="mobile-user-role">Contributor</div>
            </div>
          </div>

          <div className="mobile-nav-divider"></div>

          <div className="mobile-nav-links">
            {navItems.map(item => (
              <button
                key={item.path}
                className={`mobile-nav-link ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => handleNavigation(item)}
              >
                <span className="mobile-nav-icon">{item.icon}</span>
                <span className="mobile-nav-label">{item.label}</span>
                {location.pathname === item.path && (
                  <span className="mobile-active-indicator">✓</span>
                )}
              </button>
            ))}
          </div>

          <div className="mobile-nav-divider"></div>

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

export default ContributorNavbar



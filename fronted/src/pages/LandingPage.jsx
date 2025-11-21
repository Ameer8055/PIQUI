import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import RegistrationModal from '../components/RegistrationModal'
import './LandingPage.css'

const LandingPage = ({ onRegister }) => {
  const [showModal, setShowModal] = useState(false)
  const [isVisible, setIsVisible] = useState({})
  const navigate = useNavigate()
  const statsRef = useRef(null)
  const featuresRef = useRef(null)
  const ctaRef = useRef(null)

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -100px 0px'
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setIsVisible((prev) => ({
            ...prev,
            [entry.target.dataset.animate]: true
          }))
          // Unobserve once animated to improve performance
          observer.unobserve(entry.target)
        }
      })
    }, observerOptions)

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      const animatedElements = document.querySelectorAll('[data-animate]')
      animatedElements.forEach((el) => observer.observe(el))
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      const animatedElements = document.querySelectorAll('[data-animate]')
      animatedElements.forEach((el) => observer.unobserve(el))
    }
  }, [])

  // Animated counter for stats
  useEffect(() => {
    if (!statsRef.current) return

    const animateValue = (element, start, end, duration, suffix = '') => {
      let startTimestamp = null
      const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp
        const progress = Math.min((timestamp - startTimestamp) / duration, 1)
        const easeOut = 1 - Math.pow(1 - progress, 3)
        const current = Math.floor(easeOut * (end - start) + start)
        element.textContent = current.toLocaleString() + suffix
        if (progress < 1) {
          window.requestAnimationFrame(step)
        } else {
          element.textContent = end.toLocaleString() + suffix
        }
      }
      window.requestAnimationFrame(step)
    }

    if (isVisible.stats && statsRef.current) {
      const statValues = statsRef.current.querySelectorAll('.stat-value')
      if (statValues.length >= 3) {
        // Clear any existing text first
        statValues[0].textContent = '0+'
        statValues[1].textContent = '0+'
        statValues[2].textContent = '0+'
        
        setTimeout(() => animateValue(statValues[0], 0, 10000, 1500, '+'), 200)
        setTimeout(() => animateValue(statValues[1], 0, 5000, 1500, '+'), 400)
        setTimeout(() => animateValue(statValues[2], 0, 50, 1500, '+'), 600)
      }
    }
  }, [isVisible.stats])

  const handleRegisterSuccess = (userData) => {
    onRegister(userData)
    setShowModal(false)
    navigate('/daily-quiz')
  }

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-badge" data-animate="badge">Your Ultimate Quiz Destination</div>
            <h1 className="hero-title" data-animate="title">
              Welcome to <span className="highlight">PIQUI</span>
            </h1>
            <p className="hero-subtitle" data-animate="subtitle">
              Discover fun quizzes, time-pass challenges, competitive exam preparation, and PSC tests all in one place. 
              Join thousands of quiz enthusiasts who learn, compete, and grow with our comprehensive quiz platform.
            </p>
            
            <div className="hero-actions" data-animate="actions">
              <button 
                className="cta-primary"
                onClick={() => setShowModal(true)}
              >
                Get Started Free
              </button>
              <button 
                className="cta-secondary"
                onClick={() => navigate("/signin")}
              >
                Sign In
              </button>
            </div>

            <div className="hero-stats" ref={statsRef} data-animate="stats">
              <div className="hero-stat">
                <div className="stat-value">0+</div>
                <div className="stat-text">Questions</div>
              </div>
              <div className="hero-stat">
                <div className="stat-value">0+</div>
                <div className="stat-text">Active Users</div>
              </div>
              <div className="hero-stat">
                <div className="stat-value">0+</div>
                <div className="stat-text">Subjects</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section" ref={featuresRef}>
        <div className="features-container">
          <div className="section-header" data-animate="sectionHeader">
            <h2 className="section-title">Everything You Need for Every Quiz</h2>
            <p className="section-subtitle">From fun time-pass quizzes to serious competitive exam preparation</p>
          </div>

          <div className="features-grid">
            <div className="feature-card" data-animate="feature1">
              <div className="feature-icon-wrapper">
                <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="feature-title">Fun & Time Pass Quizzes</h3>
              <p className="feature-description">
                Enjoy engaging quizzes on movies, sports, general knowledge, and entertainment. 
                Perfect for relaxing while learning something new.
              </p>
            </div>

            <div className="feature-card" data-animate="feature2">
              <div className="feature-icon-wrapper">
                <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="feature-title">Competitive Exam Quizzes</h3>
              <p className="feature-description">
                Prepare for PSC, UPSC, SSC, and other competitive exams with thousands of 
                curated questions designed to boost your exam readiness.
              </p>
            </div>

            <div className="feature-card" data-animate="feature3">
              <div className="feature-icon-wrapper">
                <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="feature-title">Smart Note Converter</h3>
              <p className="feature-description">
                Transform your study notes into interactive quizzes instantly. 
                AI-powered conversion makes revision efficient and effective.
              </p>
            </div>

            <div className="feature-card" data-animate="feature4">
              <div className="feature-icon-wrapper">
                <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
              </div>
              <h3 className="feature-title">Live Quiz Battles</h3>
              <p className="feature-description">
                Compete in real-time with fellow quiz enthusiasts. Test your speed and accuracy, 
                climb the leaderboard, and challenge yourself every day.
              </p>
            </div>

            <div className="feature-card" data-animate="feature5">
              <div className="feature-icon-wrapper">
                <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="feature-title">Community Chat</h3>
              <p className="feature-description">
                Connect with a vibrant community of quiz enthusiasts. Share insights, 
                discuss strategies, ask questions, and learn together.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section" ref={ctaRef}>
        <div className="cta-container">
          <h2 className="cta-title" data-animate="ctaTitle">Ready to Start Your Quiz Journey?</h2>
          <p className="cta-subtitle" data-animate="ctaSubtitle">Join thousands of quiz enthusiasts today</p>
          <button 
            className="cta-button-large"
            onClick={() => setShowModal(true)}
            data-animate="ctaButton"
          >
            Start Your Free Journey
          </button>
        </div>
      </section>

      {/* Registration Modal */}
      {showModal && (
        <RegistrationModal 
          onClose={() => setShowModal(false)}
          onRegister={handleRegisterSuccess}
        />
      )}
    </div>
  )
}

export default LandingPage
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import RegistrationModal from '../components/RegistrationModal'
import './LandingPage.css'

const LandingPage = ({ onRegister }) => {
  const [showModal, setShowModal] = useState(false)
  const navigate = useNavigate()

  

  const handleRegisterSuccess = (userData) => {
    onRegister(userData)
    setShowModal(false)
    navigate('/daily-quiz')
  }

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              Welcome to <span className="highlight">PSC Quiz Master</span>
            </h1>
            <p className="hero-subtitle">
              Ace your PSC exams with daily quizzes, live competitions, 
              and smart note analysis. Join thousands of aspirants in their journey to success.
            </p>
            
            <div className="hero-features">
              <div className="feature">
                <span className="feature-icon">📚</span>
                <span>Daily Subject-wise Quizzes</span>
              </div>
              <div className="feature">
                <span className="feature-icon">⚡</span>
                <span>Live Quiz Competitions</span>
              </div>
              <div className="feature">
                <span className="feature-icon">📝</span>
                <span>Notes to Quiz Converter</span>
              </div>
              <div className="feature">
                <span className="feature-icon">💬</span>
                <span>Student Community Chat</span>
              </div>
            </div>

            <button 
              className="cta-button"
              onClick={() => setShowModal(true)}
            >
              Start Your Journey - It's Free!
            </button>

            <button 
              className="cta-button2"
              onClick={() => navigate("/signin")}
            >
              Sign In
            </button>
          </div>
          
          <div className="hero-visual">
            <div className="phone-mockup">
              <div className="phone-screen">
                <div className="quiz-demo">
                  <div className="demo-question">
                    <h4>Which article deals with Fundamental Rights?</h4>
                    <div className="demo-options">
                      <div className="option">A. Article 12-35</div>
                      <div className="option correct">B. Article 14-32</div>
                      <div className="option">C. Article 15-35</div>
                      <div className="option">D. Article 16-35</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-container">
          <div className="stat">
            <div className="stat-number">10,000+</div>
            <div className="stat-label">Questions</div>
          </div>
          <div className="stat">
            <div className="stat-number">5,000+</div>
            <div className="stat-label">Active Users</div>
          </div>
          <div className="stat">
            <div className="stat-number">50+</div>
            <div className="stat-label">Subjects</div>
          </div>
          <div className="stat">
            <div className="stat-number">24/7</div>
            <div className="stat-label">Live Quizzes</div>
          </div>
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
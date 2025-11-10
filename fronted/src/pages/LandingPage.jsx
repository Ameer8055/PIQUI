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
        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-badge">Premium PSC Preparation Platform</div>
            <h1 className="hero-title">
              Master Your PSC Exams with
              <span className="highlight"> Confidence</span>
            </h1>
            <p className="hero-subtitle">
              Join thousands of successful aspirants who have transformed their PSC preparation 
              with our comprehensive quiz platform, live competitions, and intelligent study tools.
            </p>
            
            <div className="hero-actions">
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

            <div className="hero-stats">
              <div className="hero-stat">
                <div className="stat-value">10,000+</div>
                <div className="stat-text">Questions</div>
              </div>
              <div className="hero-stat">
                <div className="stat-value">5,000+</div>
                <div className="stat-text">Active Users</div>
              </div>
              <div className="hero-stat">
                <div className="stat-value">50+</div>
                <div className="stat-text">Subjects</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="features-container">
          <div className="section-header">
            <h2 className="section-title">Everything You Need to Succeed</h2>
            <p className="section-subtitle">Comprehensive tools designed for PSC exam excellence</p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="feature-title">Daily Subject Quizzes</h3>
              <p className="feature-description">
                Practice with thousands of curated questions across all PSC subjects, 
                designed to strengthen your knowledge systematically.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="feature-title">Live Quiz Competitions</h3>
              <p className="feature-description">
                Compete in real-time with fellow aspirants, test your speed and accuracy, 
                and climb the leaderboard while learning.
              </p>
            </div>

            <div className="feature-card">
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

            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
              </div>
              <h3 className="feature-title">Community Chat</h3>
              <p className="feature-description">
                Connect with a vibrant community of PSC aspirants. Share insights, 
                discuss strategies, and learn together on your journey to success.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-container">
          <h2 className="cta-title">Ready to Transform Your PSC Preparation?</h2>
          <p className="cta-subtitle">Join thousands of successful aspirants today</p>
          <button 
            className="cta-button-large"
            onClick={() => setShowModal(true)}
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
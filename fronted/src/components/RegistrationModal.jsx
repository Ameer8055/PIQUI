import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './RegistrationModal.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const RegistrationModal = ({ onClose, onRegister }) => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    pscStream: '',
    password: '',
    agreeTerms: false
  })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    
    if (error) setError(null)
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!isFormValid) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, formData)
      const result = response.data

      if (result.status === 'success') {
        // Store token and user data
        localStorage.setItem('authToken', result.token)
        localStorage.setItem('user', JSON.stringify(result.user))
        
        // Call the onRegister callback to update App state
        if (onRegister) {
          onRegister(result.user)
        }
        
        // Redirect to dashboard
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const isFormValid = formData.name && formData.email && formData.password && formData.agreeTerms

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-button" onClick={onClose}>
          ×
        </button>

        <div className="modal-header">
          <h2>Welcome to PIQUI! 🎯</h2>
          <p>Join our community of quiz enthusiasts</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="registration-form">
          <div className="form-group">
            <label htmlFor="name">Full Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
              disabled={loading}
              minLength="6"
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone Number (Optional)</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter your phone number"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="pscStream">Exam Stream (Optional)</label>
            <select
              id="pscStream"
              name="pscStream"
              value={formData.pscStream}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="">Select your target stream</option>
              <option value="ldc">LDC</option>
              <option value="degree">Degree Level</option>
              <option value="plus-two">Plus Two Level</option>
              <option value="tenth">Tenth Level</option>
              <option value="police">Police</option>
              <option value="secretariat">Secretariat</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="terms-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="agreeTerms"
                checked={formData.agreeTerms}
                onChange={handleChange}
                required
                disabled={loading}
              />
              I agree to the Terms of Service and Privacy Policy
            </label>
          </div>

          <button 
            type="submit" 
            className={`submit-button ${!isFormValid ? 'disabled' : ''}`}
            disabled={!isFormValid || loading}
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                Registering...
              </>
            ) : (
              'Create Account'
            )}
          </button>

          <p className="login-text">
  Already have an account? <span className="login-link" onClick={() => navigate('/signin')}>Sign In</span>
</p>
        </form>
      </div>
    </div>
  )
}

export default RegistrationModal
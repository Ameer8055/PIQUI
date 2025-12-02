import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './SignInPage.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api' ;

const SignInPage = ({ onLogin }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (error) setError(null);
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: formData.email,
        password: formData.password
      });

      const result = response.data;

      if (result.status === 'success') {
        // Store token and user data
        localStorage.setItem('authToken', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
        
        // Store remember me preference
        if (formData.rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        } else {
          localStorage.removeItem('rememberMe');
        }
        
        // Call the onLogin callback to update App state
        if (onLogin) {
          onLogin(result.user);
        }
        
        // Redirect based on user role (contributors use normal dashboard with extra section)
        if (result.user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      // Handle different error types
      if (err.response?.status === 403) {
        // Account suspended/inactive
        setError(err.response?.data?.message || 'Your account has been temporarily suspended. Please contact administrator.');
      } else if (err.response?.status === 400) {
        // Invalid credentials
        setError(err.response?.data?.message || 'Invalid email or password. Please try again.');
      } else {
        // Server error
        setError(err.response?.data?.message);
      }
      console.error('Login error:', err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigate('/forgot-password');
  };

  return (
    <div className="signin-container">
      <div className="signin-card">
        <div className="signin-header">
          <h1>Welcome Back! 👋</h1>
          <p>Sign in to continue your quiz journey</p>
        </div>

        {/* Display error message with different styles for different errors */}
        {error && (
          <div className={`error-message ${error.includes('suspended') || error.includes('blocked') ? 'warning' : 'error'}`}>
            {error}
            {(error.includes('suspended') || error.includes('blocked')) && (
              <div className="contact-admin">
                <p>Need help? Contact administrator at <strong>admin@piqui.com</strong></p>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="signin-form">
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
            />
          </div>

          <div className="form-options">
            <button 
              type="button" 
              className="forgot-password"
              onClick={handleForgotPassword}
              disabled={loading}
            >
              Forgot Password?
            </button>
          </div>

          <button 
            type="submit" 
            className={`submit-button ${loading ? 'loading' : ''}`}
            disabled={!formData.email || !formData.password || loading}
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="signup-link">
          <p>
            Don't have an account?{' '}
            <Link to="/" className="link">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './ForgotPassword.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const steps = ['Request OTP', 'Verify & Reset', 'Done'];

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!cooldown) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleRequestOtp = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!email) {
      setError('Enter the email linked to your PIQUI account.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post(`${API_BASE_URL}/auth/forgot-password`, { email });
      setMessage(data.message || 'OTP sent to your mailbox.');
      setStep(1);
      setCooldown(60);
      setOtp('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!otp || !newPassword) {
      setError('Please fill in both the OTP and your new password.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post(`${API_BASE_URL}/auth/reset-password`, {
        email,
        otp,
        newPassword
      });
      setMessage(data.message || 'Password updated. You can sign in now.');
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resendDisabled = cooldown > 0 || loading;

  return (
    <div className="forgot-container">
      <div className="forgot-card">
        <div className="forgot-header">
          <img src="/viite.png" alt="PIQUI logo" className="forgot-logo" />
          <h1>Reset your password</h1>
          <p>We’ll send a six-digit code to verify your account.</p>
        </div>

        <div className="forgot-steps">
          {steps.map((label, index) => (
            <div key={label} className={`forgot-step ${index <= step ? 'active' : ''}`}>
              <span className="step-index">{index + 1}</span>
              <span className="step-label">{label}</span>
            </div>
          ))}
        </div>

        {message && <div className="status-banner success">{message}</div>}
        {error && <div className="status-banner error">{error}</div>}

        {step === 0 && (
          <form onSubmit={handleRequestOtp} className="forgot-form">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
            <button type="submit" className="forgot-primary" disabled={loading}>
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
            <p className="helper-text">
              Make sure you have access to this mailbox before continuing.
            </p>
          </form>
        )}

        {step === 1 && (
          <form onSubmit={handleResetPassword} className="forgot-form">
            <label htmlFor="otp">Enter 6-digit OTP</label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              disabled={loading}
              required
            />

            <label htmlFor="newPassword">New password</label>
            <input
              id="newPassword"
              type="password"
              minLength={6}
              placeholder="Enter a new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              required
            />

            <button type="submit" className="forgot-primary" disabled={loading}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>

            <button
              type="button"
              className="forgot-secondary"
              onClick={handleRequestOtp}
              disabled={resendDisabled}
            >
              {resendDisabled ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
            </button>
          </form>
        )}

        {step === 2 && (
          <div className="forgot-success">
            <h2>All set!</h2>
            <p>Your password has been updated. You can now sign in with your new credentials.</p>
            <Link to="/signin" className="forgot-primary full-width">
              Go to sign in
            </Link>
          </div>
        )}

        <div className="forgot-footer">
          <Link to="/signin">Back to sign in</Link>
          <span>Need help? Reach us at support@piqui.app</span>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;


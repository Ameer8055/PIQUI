import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminAnalytics.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AdminAnalytics = ({ user }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7days');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/analytics`, {
        params: { range: timeRange }
      });
      setAnalytics(response.data.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return <div className="loading">Loading analytics...</div>;
  }

  return (
    <div className="admin-analytics">
      <div className="page-header">
        <h1>Analytics Dashboard</h1>
        <div className="time-range-selector">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">👥</div>
          <div className="metric-info">
            <h3>{analytics?.userGrowth || 0}</h3>
            <p>New Users</p>
            {analytics?.userGrowthChange !== undefined && (
              <span className={`metric-change ${analytics.userGrowthChange >= 0 ? 'positive' : 'negative'}`}>
                {analytics.userGrowthChange >= 0 ? '+' : ''}{analytics.userGrowthChange}%
              </span>
            )}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">📊</div>
          <div className="metric-info">
            <h3>{analytics?.totalQuizzes || 0}</h3>
            <p>Quizzes Taken</p>
            {analytics?.quizzesChange !== undefined && (
              <span className={`metric-change ${analytics.quizzesChange >= 0 ? 'positive' : 'negative'}`}>
                {analytics.quizzesChange >= 0 ? '+' : ''}{analytics.quizzesChange}%
              </span>
            )}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">✅</div>
          <div className="metric-info">
            <h3>{analytics?.avgScore || 0}%</h3>
            <p>Avg. Score</p>
            {analytics?.avgScoreChange !== undefined && (
              <span className={`metric-change ${analytics.avgScoreChange >= 0 ? 'positive' : 'negative'}`}>
                {analytics.avgScoreChange >= 0 ? '+' : ''}{analytics.avgScoreChange}%
              </span>
            )}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">⏱️</div>
          <div className="metric-info">
            <h3>{analytics?.avgTime || 0}m</h3>
            <p>Avg. Time</p>
            {analytics?.avgTimeChange !== undefined && (
              <span className={`metric-change ${analytics.avgTimeChange >= 0 ? 'positive' : 'negative'}`}>
                {analytics.avgTimeChange >= 0 ? '+' : ''}{analytics.avgTimeChange}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Category Performance */}
      <div className="chart-section">
        <h2>Category Performance</h2>
        <div className="category-performance">
          {analytics?.categoryPerformance?.map(category => (
            <div key={category.name} className="category-item">
              <div className="category-header">
                <span className="category-name">{category.name}</span>
                <span className="category-score">{category.score}%</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${category.score}%` }}
                ></div>
              </div>
              <div className="category-stats">
                <span>Attempts: {category.attempts}</span>
                <span>Avg. Time: {category.avgTime}m</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User Activity */}
      <div className="chart-section">
        <h2>User Activity</h2>
        <div className="activity-stats">
          <div className="activity-card">
            <h4>Daily Active Users</h4>
            <div className="activity-value">{analytics?.dailyActiveUsers || 0}</div>
          </div>
          <div className="activity-card">
            <h4>Weekly Active Users</h4>
            <div className="activity-value">{analytics?.weeklyActiveUsers || 0}</div>
          </div>
          <div className="activity-card">
            <h4>Monthly Active Users</h4>
            <div className="activity-value">{analytics?.monthlyActiveUsers || 0}</div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="chart-section">
        <h2>Recent Activity</h2>
        <div className="recent-activity">
          {analytics?.recentActivity?.map(activity => (
            <div key={activity.id} className="activity-item">
              <div className="activity-avatar">
                {activity.userName.charAt(0)}
              </div>
              <div className="activity-details">
                <p>
                  <strong>{activity.userName}</strong> {activity.action}
                </p>
                <span className="activity-time">{activity.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
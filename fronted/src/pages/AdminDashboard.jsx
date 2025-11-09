// pages/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminDashboard.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AdminDashboard = ({ user }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

 useEffect(() => {
  fetchDashboardData();
}, []);

const fetchDashboardData = async () => {
  try {
    // Remove headers temporarily
    const response = await axios.get(`${API_BASE_URL}/admin/dashboard`);
    setStats(response.data.data);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
  } finally {
    setLoading(false);
  }
};

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <h3>{stats?.totalUsers}</h3>
            <p>Total Users</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">❓</div>
          <div className="stat-info">
            <h3>{stats?.totalQuestions}</h3>
            <p>Total Questions</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <h3>{stats?.activeQuestions}</h3>
            <p>Active Questions</p>
          </div>
        </div>
      </div>

      <div className="recent-section">
        <h2>Recent Users</h2>
        <div className="recent-users">
          {stats?.recentUsers?.map(user => (
            <div key={user._id} className="user-card">
              <div className="user-avatar">{user.name.charAt(0)}</div>
              <div className="user-details">
                <h4>{user.name}</h4>
                <p>{user.email}</p>
                <span className="join-date">
                  Joined: {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
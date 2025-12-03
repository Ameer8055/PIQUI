import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from '../utils/toast';
import './AdminDashboard.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AdminDashboard = ({ user }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatBanEmail, setChatBanEmail] = useState('');

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/dashboard`);
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleToggleChatBan = async () => {
    if (!chatBanEmail.trim()) {
      toast.warning('Enter user email to restrict/unrestrict chat');
      return;
    }
    try {
      const userRes = await axios.get(`${API_BASE_URL}/admin/users`, {
        params: { search: chatBanEmail.trim(), limit: 1 }
      });
      const target = userRes.data?.data?.users?.[0];
      if (!target) {
        toast.error('User not found');
        return;
      }

      const nextState = !target.isChatBanned;
      await axios.put(`${API_BASE_URL}/admin/users/${target._id}/chat-ban`, {
        isChatBanned: nextState
      });
      toast.success(`Chat access ${nextState ? 'restricted' : 'restored'} for ${target.name}`);
      setChatBanEmail('');
    } catch (error) {
      console.error('Error updating chat ban:', error);
      toast.error(error.response?.data?.message || 'Failed to update chat restriction');
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

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
          {stats?.recentUsers?.map((u) => (
            <div key={u._id} className="user-card">
              <div className="user-avatar">{u.name.charAt(0)}</div>
              <div className="user-details">
                <h4>{u.name}</h4>
                <p>{u.email}</p>
                <span className="join-date">
                  Joined: {new Date(u.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="recent-section">
        <h2>Community Chat Restriction</h2>
        <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '400px' }}>
          <input
            type="email"
            placeholder="User email"
            value={chatBanEmail}
            onChange={(e) => setChatBanEmail(e.target.value)}
            style={{ flex: 1, padding: '0.5rem' }}
          />
          <button
            onClick={handleToggleChatBan}
            style={{
              padding: '0.5rem 1rem',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Toggle Chat Access
          </button>
        </div>
        <p style={{ marginTop: '0.5rem', color: '#6b7280', fontSize: '0.9rem' }}>
          Enter a user's email, then click to restrict or restore their access to community chat.
        </p>
      </div>
    </div>
  );
};

export default AdminDashboard;
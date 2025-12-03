import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminUsers.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AdminUsers = ({ user }) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    // Reset to first page when search term changes
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchUsers(1);
  }, [searchTerm]);

  const fetchUsers = async (pageOverride) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/users`, {
        params: {
          search: searchTerm,
          page: pageOverride || pagination.page,
          limit: pagination.limit
        }
      });
      setUsers(response.data.data.users);
      setPagination(response.data.data.pagination);
    } catch (error) {
      console.error('Error fetching users:', error);
      // For demo purposes, create mock data if API fails
      if (error.response?.status === 404) {
        setUsers(generateMockUsers());
        setPagination({
          page: 1,
          limit: 20,
          total: 5,
          pages: 1
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      const response = await axios.put(`${API_BASE_URL}/admin/users/${userId}/status`, {
        isActive: newStatus
      });
      
      if (response.data.status === 'success') {
        // Update locally immediately for better UX
        setUsers(prev => prev.map(user => 
          user._id === userId ? { ...user, isActive: newStatus } : user
        ));
        // Refresh to get latest data
        fetchUsers();
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      alert(error.response?.data?.message || 'Failed to update user status');
    }
  };

  const toggleContributor = async (userId, currentValue) => {
    try {
      const newValue = !currentValue;
      const response = await axios.put(`${API_BASE_URL}/admin/users/${userId}/contributor`, {
        isContributor: newValue
      });
      
      if (response.data.status === 'success') {
        // Update locally immediately for better UX
        setUsers(prev => prev.map(u =>
          u._id === userId ? { ...u, isContributor: newValue } : u
        ));
        // Refresh to get latest data
        fetchUsers();
      }
    } catch (error) {
      console.error('Error updating contributor access:', error);
      alert(error.response?.data?.message || 'Failed to update contributor access');
    }
  };

  const toggleChatBan = async (userId, currentValue) => {
    try {
      const newValue = !currentValue;
      const response = await axios.put(`${API_BASE_URL}/admin/users/${userId}/chat-ban`, {
        isChatBanned: newValue
      });

      if (response.data.status === 'success') {
        setUsers(prev => prev.map(u =>
          u._id === userId ? { ...u, isChatBanned: newValue } : u
        ));
        fetchUsers();
      }
    } catch (error) {
      console.error('Error updating chat access:', error);
      alert(error.response?.data?.message || 'Failed to update chat access');
    }
  };

  // Mock data generator for testing
  const generateMockUsers = () => {
    return [
      {
        _id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'user',
        isActive: true,
        pscStream: 'degree',
        createdAt: new Date('2024-01-15')
      },
      {
        _id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'admin',
        isActive: true,
        pscStream: 'ldc',
        createdAt: new Date('2024-01-10')
      },
      {
        _id: '3',
        name: 'Mike Johnson',
        email: 'mike@example.com',
        role: 'user',
        isActive: false,
        pscStream: 'police',
        createdAt: new Date('2024-01-05')
      },
      {
        _id: '4',
        name: 'Sarah Wilson',
        email: 'sarah@example.com',
        role: 'user',
        isActive: true,
        pscStream: 'secretariat',
        createdAt: new Date('2024-01-01')
      },
      {
        _id: '5',
        name: 'Admin User',
        email: 'admin@piqui.com',
        role: 'admin',
        isActive: true,
        pscStream: 'other',
        createdAt: new Date('2023-12-20')
      }
    ];
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-users">
      <div className="page-header">
        <h1>User Management</h1>
        <div className="header-actions">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="users-stats">
        <div className="stat-card">
          <div className="stat-value">{pagination.total}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {users.filter(u => u.isActive).length}
          </div>
          <div className="stat-label">Active Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {users.filter(u => u.role === 'admin').length}
          </div>
          <div className="stat-label">Admins</div>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading users...</div>
      ) : (
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Contributor</th>
                <th>Chat Access</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user._id}>
                  <td>
                    <div className="user-info">
                      <div className="user-avatar">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="user-details">
                        <div className="user-name">{user.name}</div>
                        <div className="user-stream">{user.pscStream || 'Not specified'}</div>
                      </div>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`role-badge ${user.role}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${user.isContributor ? 'active' : 'inactive'}`}>
                      {user.isContributor ? '✅ Enabled' : '❌ Disabled'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${user.isChatBanned ? 'inactive' : 'active'}`}>
                      {user.isChatBanned ? '🚫 Blocked' : '✅ Allowed'}
                    </span>
                  </td>
                  <td>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="view-details-btn"
                        onClick={() => navigate(`/admin/users/${user._id}`)}
                        title="View detailed user activity"
                      >
                        📋 Details
                      </button>
                      <button
                        className={`status-btn ${user.isActive ? 'deactivate' : 'activate'}`}
                        onClick={() => toggleUserStatus(user._id, user.isActive)}
                        title={user.isActive ? 'Deactivate user account' : 'Activate user account'}
                      >
                        {user.isActive ? '🚫 Deactivate' : '✅ Activate'}
                      </button>
                      {user.role !== 'admin' && (
                        <button
                          className={`status-btn contributor-btn ${user.isContributor ? 'deactivate' : 'activate'}`}
                          onClick={() => toggleContributor(user._id, user.isContributor)}
                          title={user.isContributor ? 'Revoke contributor access' : 'Grant contributor access'}
                        >
                          {user.isContributor ? '❌ Revoke' : '✨ Allow'} Contribution
                        </button>
                      )}
                      <button
                        className={`status-btn ${user.isChatBanned ? 'activate' : 'deactivate'}`}
                        onClick={() => toggleChatBan(user._id, user.isChatBanned)}
                        title={user.isChatBanned ? 'Restore chat access' : 'Restrict chat access'}
                      >
                        {user.isChatBanned ? '✅ Allow Chat' : '🚫 Block Chat'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredUsers.length === 0 && (
            <div className="no-users">
              No users found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from '../utils/toast';
import './AdminDeveloperMessages.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const AdminDeveloperMessages = ({ user }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ pending: 0, replied: 0, resolved: 0, unread: 0, total: 0 });
  const [statusFilter, setStatusFilter] = useState('pending');
  const [messageTypeFilter, setMessageTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [newStatus, setNewStatus] = useState('replied');
  const [sendingReply, setSendingReply] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });

  useEffect(() => {
    fetchMessages();
    fetchStats();
  }, [statusFilter, messageTypeFilter, searchTerm, pagination.page]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/developer-messages`, {
        params: {
          status: statusFilter === 'all' ? undefined : statusFilter,
          messageType: messageTypeFilter === 'all' ? undefined : messageTypeFilter,
          search: searchTerm || undefined,
          page: pagination.page,
          limit: pagination.limit
        }
      });
      setMessages(response.data.data.messages || []);
      setPagination(response.data.data.pagination || pagination);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Error fetching messages: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/developer-messages/stats`);
      setStats(response.data.data || { pending: 0, replied: 0, resolved: 0, unread: 0, total: 0 });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedMessage) return;

    setSendingReply(true);
    try {
      await axios.post(
        `${API_BASE_URL}/admin/developer-messages/${selectedMessage._id}/reply`,
        {
          reply: replyText,
          status: newStatus,
          adminId: user._id
        }
      );
      toast.success('Reply sent successfully!');
      setShowReplyModal(false);
      setReplyText('');
      setSelectedMessage(null);
      setNewStatus('replied');
      fetchMessages();
      fetchStats();
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Error sending reply: ' + (error.response?.data?.message || error.message));
    } finally {
      setSendingReply(false);
    }
  };

  const handleStatusChange = async (messageId, newStatus) => {
    try {
      await axios.put(
        `${API_BASE_URL}/admin/developer-messages/${messageId}/status`,
        { status: newStatus }
      );
      fetchMessages();
      fetchStats();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Error updating status: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
      return;
    }

    setDeletingMessageId(messageId);
    try {
      await axios.delete(
        `${API_BASE_URL}/admin/developer-messages/${messageId}`
      );
      toast.success('Message deleted successfully!');
      fetchMessages();
      fetchStats();
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Error deleting message: ' + (error.response?.data?.message || error.message));
    } finally {
      setDeletingMessageId(null);
    }
  };

  const openReplyModal = (message) => {
    setSelectedMessage(message);
    setReplyText('');
    setNewStatus(message.status === 'pending' ? 'replied' : message.status);
    setShowReplyModal(true);
  };

  const getMessageTypeIcon = (type) => {
    switch (type) {
      case 'query': return '❓';
      case 'suggestion': return '💡';
      case 'bug': return '🐛';
      case 'feature': return '✨';
      default: return '📝';
    }
  };

  const getMessageTypeLabel = (type) => {
    switch (type) {
      case 'query': return 'Query';
      case 'suggestion': return 'Suggestion';
      case 'bug': return 'Bug Report';
      case 'feature': return 'Feature Request';
      default: return 'Other';
    }
  };

  return (
    <div className="admin-developer-messages">
      <div className="page-header">
        <h1>👨‍💻 Developer Messages</h1>
        <p>Manage user queries, suggestions, and feedback</p>
      </div>

      {/* Statistics */}
      <div className="messages-stats">
        <div className="stat-card pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">Pending</div>
          </div>
        </div>
        <div className="stat-card replied">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <div className="stat-value">{stats.replied}</div>
            <div className="stat-label">Replied</div>
          </div>
        </div>
        <div className="stat-card resolved">
          <div className="stat-icon">✔️</div>
          <div className="stat-info">
            <div className="stat-value">{stats.resolved}</div>
            <div className="stat-label">Resolved</div>
          </div>
        </div>
        <div className="stat-card unread">
          <div className="stat-icon">🔔</div>
          <div className="stat-info">
            <div className="stat-value">{stats.unread}</div>
            <div className="stat-label">Unread Replies</div>
          </div>
        </div>
        <div className="stat-card total">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Status</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPagination({ ...pagination, page: 1 });
            }}
            className="filter-select"
          >
            <option value="all">All</option>
            <option value="pending">⏳ Pending</option>
            <option value="replied">✅ Replied</option>
            <option value="resolved">✔️ Resolved</option>
            <option value="closed">🔒 Closed</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Type</label>
          <select
            value={messageTypeFilter}
            onChange={(e) => {
              setMessageTypeFilter(e.target.value);
              setPagination({ ...pagination, page: 1 });
            }}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="query">❓ Query</option>
            <option value="suggestion">💡 Suggestion</option>
            <option value="bug">🐛 Bug Report</option>
            <option value="feature">✨ Feature Request</option>
            <option value="other">📝 Other</option>
          </select>
        </div>
        <div className="filter-group search-group">
          <label>Search</label>
          <input
            type="text"
            placeholder="Search by message, name, or email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPagination({ ...pagination, page: 1 });
            }}
            className="search-input"
          />
        </div>
      </div>

      {/* Messages List */}
      {loading ? (
        <div className="loading">Loading messages...</div>
      ) : messages.length === 0 ? (
        <div className="no-messages">
          <div className="no-messages-icon">📭</div>
          <h3>No messages found</h3>
          <p>No messages match your current filters.</p>
        </div>
      ) : (
        <div className="messages-grid">
          {messages.map((message) => (
            <div key={message._id} className={`message-card ${message.status}`}>
              <div className="message-card-header">
                <div className="message-type">
                  <span className="type-icon">{getMessageTypeIcon(message.messageType)}</span>
                  <span className="type-label">{getMessageTypeLabel(message.messageType)}</span>
                </div>
                <div className={`status-badge ${message.status}`}>
                  {message.status === 'pending' && '⏳ Pending'}
                  {message.status === 'replied' && '✅ Replied'}
                  {message.status === 'resolved' && '✔️ Resolved'}
                  {message.status === 'closed' && '🔒 Closed'}
                </div>
              </div>

              <div className="message-card-body">
                <div className="user-info">
                  <div className="user-avatar">
                    {message.user?.name?.charAt(0).toUpperCase() || message.userName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="user-details">
                    <div className="user-name">{message.userName || message.user?.name || 'Unknown User'}</div>
                    <div className="user-email">{message.userEmail || message.user?.email || ''}</div>
                  </div>
                </div>

                <div className="message-content">
                  <p className="message-text">{message.message}</p>
                  <div className="message-meta">
                    <span>Sent: {new Date(message.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                {message.adminReply && message.adminReply.message && (
                  <div className="admin-reply-preview">
                    <div className="reply-header">
                      <span className="reply-label">Your Reply:</span>
                      {message.adminReply.repliedBy && (
                        <span className="reply-admin">
                          by {message.adminReply.repliedBy.name || 'You'}
                        </span>
                      )}
                    </div>
                    <p className="reply-text">{message.adminReply.message}</p>
                    <div className="reply-meta">
                      <span>Replied: {new Date(message.adminReply.repliedAt).toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="message-card-actions">
                <div className="action-buttons-left">
                  {!message.adminReply || !message.adminReply.message ? (
                    <button
                      className="btn-reply"
                      onClick={() => openReplyModal(message)}
                    >
                      💬 Reply
                    </button>
                  ) : (
                    <button
                      className="btn-reply-again"
                      onClick={() => openReplyModal(message)}
                    >
                      ✏️ Edit Reply
                    </button>
                  )}
                  <select
                    className="status-select"
                    value={message.status}
                    onChange={(e) => handleStatusChange(message._id, e.target.value)}
                  >
                    <option value="pending">⏳ Pending</option>
                    <option value="replied">✅ Replied</option>
                    <option value="resolved">✔️ Resolved</option>
                    <option value="closed">🔒 Closed</option>
                  </select>
                </div>
                <button
                  className="btn-delete"
                  onClick={() => handleDeleteMessage(message._id)}
                  disabled={deletingMessageId === message._id}
                  title="Delete this message"
                >
                  {deletingMessageId === message._id ? 'Deleting...' : '🗑️ Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
            disabled={pagination.page === 1}
            className="pagination-btn"
          >
            ← Previous
          </button>
          <span className="pagination-info">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
            disabled={pagination.page >= pagination.pages}
            className="pagination-btn"
          >
            Next →
          </button>
        </div>
      )}

      {/* Reply Modal */}
      {showReplyModal && selectedMessage && (
        <div className="modal-overlay" onClick={() => setShowReplyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Reply to Message</h2>
              <button className="modal-close" onClick={() => setShowReplyModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="original-message">
                <div className="original-header">
                  <strong>From:</strong> {selectedMessage.userName || selectedMessage.user?.name}
                  <br />
                  <strong>Email:</strong> {selectedMessage.userEmail || selectedMessage.user?.email}
                  <br />
                  <strong>Type:</strong> {getMessageTypeIcon(selectedMessage.messageType)} {getMessageTypeLabel(selectedMessage.messageType)}
                </div>
                <div className="original-text">{selectedMessage.message}</div>
              </div>

              <div className="form-group">
                <label>Your Reply *</label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply here... (max 2000 characters)"
                  rows="6"
                  maxLength={2000}
                  className="reply-textarea"
                  required
                />
                <div className="char-count">
                  {replyText.length} / 2000 characters
                </div>
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="status-select-modal"
                >
                  <option value="replied">✅ Replied</option>
                  <option value="resolved">✔️ Resolved</option>
                  <option value="closed">🔒 Closed</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowReplyModal(false)}>
                Cancel
              </button>
              <button
                className="btn-send-reply"
                onClick={handleReply}
                disabled={!replyText.trim() || sendingReply}
              >
                {sendingReply ? 'Sending...' : '📤 Send Reply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDeveloperMessages;


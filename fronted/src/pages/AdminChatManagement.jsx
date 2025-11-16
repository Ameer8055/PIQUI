import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import io from 'socket.io-client'
import { toast } from '../utils/toast'
import './AdminChatManagement.css'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const AdminChatManagement = ({ user }) => {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showDeleted, setShowDeleted] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 })
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showImportantModal, setShowImportantModal] = useState(false)
  const [importantMessage, setImportantMessage] = useState('')
  const [sendingImportant, setSendingImportant] = useState(false)
  const [deletingMessageId, setDeletingMessageId] = useState(null)
  const [markingImportantId, setMarkingImportantId] = useState(null)
  const [onlineUsers, setOnlineUsers] = useState([])
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const messagesEndRef = useRef(null)
  const socketRef = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    if (!token) return

    // Connect to socket for real-time updates
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setConnectionStatus('connected')
      socket.emit('chat:get_history', { limit: 100 })
    })

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected')
    })

    socket.on('chat:history', (data) => {
      const formattedMessages = (data.messages || []).map(msg => ({
        ...msg,
        isCurrentUser: msg.user?.id === user?.id
      }))
      setMessages(formattedMessages)
      setTimeout(() => scrollToBottom(), 100)
    })

    socket.on('chat:new_message', (messageData) => {
      setMessages(prev => {
        const exists = prev.find(msg => msg.id === messageData.id)
        if (exists) return prev
        return [...prev, {
          ...messageData,
          isCurrentUser: messageData.user?.id === user?.id
        }]
      })
      setTimeout(() => scrollToBottom(), 100)
    })

    socket.on('chat:message_deleted', (data) => {
      setMessages(prev => prev.filter(msg => msg.id !== data.messageId))
    })

    socket.on('chat:online_users', (data) => {
      setOnlineUsers(data.users || [])
    })

    fetchMessages()

    return () => {
      socket.disconnect()
    }
  }, [user])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchMessages = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('authToken')
      const response = await axios.get(`${API_BASE_URL}/admin/chat/messages`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: pagination.page,
          limit: pagination.limit,
          search: searchTerm || undefined,
          showDeleted: showDeleted
        }
      })

      if (response.data.status === 'success') {
        const formattedMessages = (response.data.data.messages || []).map(msg => ({
          ...msg,
          isCurrentUser: msg.user?.id === user?.id
        }))
        setMessages(formattedMessages)
        setPagination(prev => ({
          ...prev,
          total: response.data.data.pagination.total,
          pages: response.data.data.pagination.pages
        }))
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      toast.error('Failed to load messages: ' + (error.response?.data?.message || error.message))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (searchTerm || showDeleted) {
      fetchMessages()
    }
  }, [pagination.page, searchTerm, showDeleted])

  const handleDeleteMessage = async (messageId) => {
    setDeletingMessageId(messageId)
    setShowDeleteModal(false)
    
    try {
      const token = localStorage.getItem('authToken')
      await axios.delete(`${API_BASE_URL}/admin/chat/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Message deleted successfully')
      // Remove from local state
      setMessages(prev => prev.filter(msg => msg.id !== messageId))
      // Emit delete event via socket if needed
      if (socketRef.current) {
        socketRef.current.emit('chat:delete_message', { messageId })
      }
    } catch (error) {
      console.error('Error deleting message:', error)
      toast.error('Failed to delete message: ' + (error.response?.data?.message || error.message))
    } finally {
      setDeletingMessageId(null)
      setSelectedMessage(null)
    }
  }

  const handleMarkImportant = async (messageId, isImportant) => {
    setMarkingImportantId(messageId)
    
    try {
      const token = localStorage.getItem('authToken')
      await axios.put(
        `${API_BASE_URL}/admin/chat/messages/${messageId}/important`,
        { isImportant: !isImportant },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success(isImportant ? 'Message unmarked as important' : 'Message marked as important')
      // Update local state
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, isImportant: !isImportant }
          : msg
      ))
    } catch (error) {
      console.error('Error marking message:', error)
      toast.error('Failed to update message: ' + (error.response?.data?.message || error.message))
    } finally {
      setMarkingImportantId(null)
    }
  }

  const handleSendImportantMessage = async (e) => {
    e.preventDefault()
    if (!importantMessage.trim() || sendingImportant) return

    setSendingImportant(true)
    try {
      const token = localStorage.getItem('authToken')
      const response = await axios.post(
        `${API_BASE_URL}/admin/chat/messages/send-important`,
        { message: importantMessage.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('Important message sent successfully!')
      setImportantMessage('')
      setShowImportantModal(false)
      // The socket will receive the new message and update the UI
      setTimeout(() => {
        if (socketRef.current) {
          socketRef.current.emit('chat:get_history', { limit: 100 })
        }
      }, 500)
    } catch (error) {
      console.error('Error sending important message:', error)
      toast.error('Failed to send message: ' + (error.response?.data?.message || error.message))
    } finally {
      setSendingImportant(false)
    }
  }

  const openDeleteModal = (message) => {
    setSelectedMessage(message)
    setShowDeleteModal(true)
  }

  const closeDeleteModal = () => {
    setShowDeleteModal(false)
    setSelectedMessage(null)
  }

  // Filter messages based on search and deleted status
  const filteredMessages = messages.filter(msg => {
    if (!showDeleted && msg.isDeleted) return false
    if (searchTerm && !msg.message.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  return (
    <div className="admin-chat-page">
      <div className="admin-chat-header-section">
        <div className="admin-chat-title">
          <h1>💬 Community Chat Management</h1>
          <p>Manage community chat messages and send important announcements</p>
        </div>
        
        {/* Admin Controls */}
        <div className="admin-controls">
          <button
            className="btn-send-important-admin"
            onClick={() => setShowImportantModal(true)}
          >
            📢 Send Important Message
          </button>
          <div className="admin-filters">
            <input
              type="text"
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPagination(prev => ({ ...prev, page: 1 }))
              }}
              className="admin-search-input"
            />
            <label className="admin-checkbox-label">
              <input
                type="checkbox"
                checked={showDeleted}
                onChange={(e) => {
                  setShowDeleted(e.target.checked)
                  setPagination(prev => ({ ...prev, page: 1 }))
                }}
              />
              Show Deleted
            </label>
          </div>
        </div>
      </div>

      <div className="admin-chat-container">
        {/* Online Users Sidebar */}
        <div className="online-users-sidebar">
          <div className="sidebar-header">
            <h3>Online Users</h3>
            <div className="online-count">
              {onlineUsers.length} online
              {connectionStatus !== 'connected' && (
                <span className="connection-status"> ({connectionStatus})</span>
              )}
            </div>
          </div>
          <div className="users-list">
            {onlineUsers.length > 0 ? (
              onlineUsers.map(onlineUser => (
                <div key={onlineUser.userId} className="user-item">
                  <div className="user-avatar-small">
                    {onlineUser.avatar}
                    <div className="online-status online"></div>
                  </div>
                  <div className="user-info-container">
                    <span className="user-name">{onlineUser.name}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-users">No users online</div>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="chat-main">
          {/* Chat Header */}
          <div className="chat-header">
            <div className="chat-info">
              <h2>Quiz Community</h2>
              <span className="member-count">
                {onlineUsers.length} members online
              </span>
            </div>
          </div>

          {/* Messages Area */}
          <div className="messages-container">
            {loading ? (
              <div className="loading-messages">Loading messages...</div>
            ) : filteredMessages.length === 0 ? (
              <div className="empty-chat">
                <div className="empty-icon">💬</div>
                <p>No messages found</p>
              </div>
            ) : (
              filteredMessages.map((message) => (
                <div
                  key={message.id}
                  className={`message-wrapper ${message.isCurrentUser ? 'current-user' : 'other-user'} ${message.isDeleted ? 'deleted' : ''}`}
                >
                  {/* User Avatar and Name */}
                  {!message.isCurrentUser && (
                    <div className="message-user-info">
                      <div className="user-avatar">
                        {message.user?.avatar || message.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <span className="user-name">{message.user?.name || 'Unknown'}</span>
                      {message.user?.email && (
                        <span className="user-email-small">({message.user.email})</span>
                      )}
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div className={`message-bubble-wrapper ${message.isImportant ? 'important-message' : ''}`}>
                    {/* Important Badge */}
                    {message.isImportant && (
                      <div className="important-message-badge">
                        ⭐ Important Message
                      </div>
                    )}
                    {/* Reply Preview */}
                    {message.replyTo && (
                      <div className="reply-preview">
                        <div className="reply-user">{message.replyTo.user?.name || 'Unknown'}</div>
                        <div className="reply-message">{message.replyTo.message}</div>
                      </div>
                    )}

                    <div className={`message-bubble ${message.isImportant ? 'important' : ''} ${message.isDeleted ? 'deleted' : ''}`}>
                      <p>{message.message}</p>
                      <div className="message-time">
                        {message.timestamp || new Date(message.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                        {message.isCurrentUser && <span className="read-status">✓✓</span>}
                      </div>
                    </div>

                    {/* Admin Action Buttons */}
                    <div className="admin-message-actions">
                      {!message.isDeleted && (
                        <>
                          <button
                            className={`admin-action-btn mark-important-btn ${message.isImportant ? 'active' : ''}`}
                            onClick={() => handleMarkImportant(message.id, message.isImportant)}
                            disabled={markingImportantId === message.id}
                            title={message.isImportant ? 'Unmark as important' : 'Mark as important'}
                          >
                            {markingImportantId === message.id ? '⏳' : message.isImportant ? '⭐' : '☆'}
                          </button>
                          <button
                            className="admin-action-btn delete-btn"
                            onClick={() => openDeleteModal(message)}
                            disabled={deletingMessageId === message.id}
                            title="Delete message"
                          >
                            {deletingMessageId === message.id ? '⏳' : '🗑️'}
                          </button>
                        </>
                      )}
                      {message.isDeleted && (
                        <span className="deleted-label">Deleted</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedMessage && (
        <div className="modal-overlay" onClick={closeDeleteModal}>
          <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🗑️ Delete Message</h2>
              <button className="modal-close" onClick={closeDeleteModal}>×</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this message? This action cannot be undone.</p>
              <div className="message-preview">
                <strong>From:</strong> {selectedMessage.user?.name || 'Unknown'} ({selectedMessage.user?.email || 'N/A'})
                <p>"{selectedMessage.message.substring(0, 100)}{selectedMessage.message.length > 100 ? '...' : ''}"</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeDeleteModal}>
                Cancel
              </button>
              <button
                className="btn-delete-confirm"
                onClick={() => handleDeleteMessage(selectedMessage.id)}
                disabled={deletingMessageId !== null}
              >
                {deletingMessageId ? 'Deleting...' : 'Delete Message'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Important Message Modal */}
      {showImportantModal && (
        <div className="modal-overlay" onClick={() => setShowImportantModal(false)}>
          <div className="modal-content important-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📢 Send Important Message</h2>
              <button className="modal-close" onClick={() => setShowImportantModal(false)}>×</button>
            </div>
            <form onSubmit={handleSendImportantMessage} className="important-message-form">
              <div className="modal-body">
                <p>This message will be marked as important and displayed prominently to all users.</p>
                <div className="form-group">
                  <label>Your Important Message</label>
                  <textarea
                    value={importantMessage}
                    onChange={(e) => setImportantMessage(e.target.value)}
                    placeholder="Type your important message here... (max 1000 characters)"
                    rows="6"
                    maxLength={1000}
                    className="important-message-input"
                    required
                  />
                  <div className="char-count">
                    {importantMessage.length} / 1000 characters
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => {
                    setShowImportantModal(false)
                    setImportantMessage('')
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-send-important-submit"
                  disabled={!importantMessage.trim() || sendingImportant}
                >
                  {sendingImportant ? 'Sending...' : '📢 Send Important Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminChatManagement;

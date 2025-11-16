import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import io from 'socket.io-client'
import axios from 'axios'
import { toast } from '../utils/toast'
import './Chat.css'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const BANNED_WORDS = [
  'abuse', 'curse', 'hate', 'stupid', 'idiot', 'fool',
  'badword', 'swear', 'damn', 'hell', 'hate you',
  'fight', 'violence', 'kill', 'hurt', 'attack'
]

const Chat = ({ user }) => {
  const navigate = useNavigate()
  const messagesEndRef = useRef(null)
  const socketRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [replyingTo, setReplyingTo] = useState(null)
  const [onlineUsers, setOnlineUsers] = useState([])
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const [error, setError] = useState(null)
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState([])
  const [activeTab, setActiveTab] = useState('community') // 'community' or 'developer'
  
  // Developer message states
  const [developerMessage, setDeveloperMessage] = useState('')
  const [messageType, setMessageType] = useState('other')
  const [myMessages, setMyMessages] = useState([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [deletingMessageId, setDeletingMessageId] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [messageToDelete, setMessageToDelete] = useState(null)

  const userId = user?.id

  useEffect(() => {
    if (!user) {
      navigate('/')
      return
    }

    const token = localStorage.getItem('authToken')
    if (!token) {
      navigate('/signin')
      return
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setConnectionStatus('connected')
      setError(null)
      socket.emit('chat:get_history', { limit: 50 })
    })

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected')
    })

    socket.on('connect_error', (error) => {
      setConnectionStatus('error')
      setError('Failed to connect to chat server. Please refresh the page.')
    })

    socket.on('chat:connected', (data) => {
    })

    socket.on('chat:history', (data) => {
      setMessages(data.messages || [])
      setTimeout(() => scrollToBottom(), 100)
    })

    socket.on('chat:new_message', (messageData) => {
      setMessages(prev => {
        const exists = prev.find(msg => msg.id === messageData.id)
        if (exists) return prev
        return [...prev, {
          ...messageData,
          isCurrentUser: messageData.user.id === userId
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

    socket.on('chat:user_typing', (data) => {
      if (data.userId === userId) return

      setTypingUsers(prev => {
        if (data.isTyping) {
          const exists = prev.find(u => u.userId === data.userId)
          if (exists) return prev
          return [...prev, { userId: data.userId, name: data.name }]
        } else {
          return prev.filter(u => u.userId !== data.userId)
        }
      })
    })

    socket.on('chat:error', (data) => {
      setError(data.message || 'An error occurred')
      setTimeout(() => setError(null), 5000)
    })

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      socket.disconnect()
    }
  }, [user, navigate, userId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Fetch user's developer messages when developer tab is active
  useEffect(() => {
    if (activeTab === 'developer' && user) {
      fetchMyMessages()
    }
  }, [activeTab, user])

  // Refresh unread count when messages are fetched
  useEffect(() => {
    if (myMessages.length > 0) {
      const unread = myMessages.filter(msg => msg.adminReply && msg.adminReply.message && !msg.isRead).length
      // Update navbar badge count by triggering a custom event
      window.dispatchEvent(new CustomEvent('updateUnreadCount', { detail: unread }))
    }
  }, [myMessages])

  const fetchMyMessages = async () => {
    setLoadingMessages(true)
    try {
      const token = localStorage.getItem('authToken')
      const response = await axios.get(`${API_BASE_URL}/developer-messages/my-messages`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const messages = response.data.data.messages || []
      // Sort messages by creation date (newest first)
      const sortedMessages = messages.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.created_at || 0)
        const dateB = new Date(b.createdAt || b.created_at || 0)
        return dateB - dateA
      })
      setMyMessages(sortedMessages)
      
      // Mark unread messages with admin replies as read
      const unreadMessageIds = messages
        .filter(msg => msg.adminReply && msg.adminReply.message && !msg.isRead)
        .map(msg => msg._id)
      
      if (unreadMessageIds.length > 0) {
        try {
          await axios.put(
            `${API_BASE_URL}/developer-messages/mark-read`,
            { messageIds: unreadMessageIds },
            { headers: { Authorization: `Bearer ${token}` } }
          )
          // Refresh messages to get updated read status
          const refreshResponse = await axios.get(`${API_BASE_URL}/developer-messages/my-messages`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          const updatedMessages = refreshResponse.data.data.messages || []
          // Sort messages by creation date (newest first)
          const sortedUpdatedMessages = updatedMessages.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.created_at || 0)
            const dateB = new Date(b.createdAt || b.created_at || 0)
            return dateB - dateA
          })
          setMyMessages(sortedUpdatedMessages)
          
          // Update badge count to 0 since all messages are now read
          window.dispatchEvent(new CustomEvent('updateUnreadCount', { detail: 0 }))
        } catch (error) {
          console.error('Error marking messages as read:', error)
        }
      } else {
        // No unread messages, update badge to 0
        window.dispatchEvent(new CustomEvent('updateUnreadCount', { detail: 0 }))
      }
    } catch (error) {
      console.error('Error fetching my messages:', error)
      toast.error('Failed to load messages. Please try again.')
    } finally {
      setLoadingMessages(false)
    }
  }

  const handleSendDeveloperMessage = async (e) => {
    e.preventDefault()
    if (!developerMessage.trim() || sendingMessage) return

    const messageText = developerMessage.trim()
    const messageTypeValue = messageType

    setSendingMessage(true)
    try {
      const token = localStorage.getItem('authToken')
      const response = await axios.post(
        `${API_BASE_URL}/developer-messages/send`,
        {
          message: messageText,
          messageType: messageTypeValue
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      
      // Clear form immediately
      setDeveloperMessage('')
      setMessageType('other')
      
      // Show success toast
      toast.success('Your message has been sent to the developer! We will get back to you soon.')
      
      // Optimistically add the message to the list immediately for instant feedback
      if (response.data.status === 'success' && response.data.data) {
        const messageData = response.data.data
        const newMessage = {
          _id: messageData._id || messageData.id,
          message: messageData.message || messageText,
          messageType: messageData.messageType || messageTypeValue,
          status: messageData.status || 'pending',
          createdAt: messageData.createdAt || new Date().toISOString(),
          isRead: false,
          user: messageData.user,
          userName: messageData.userName,
          userEmail: messageData.userEmail
        }
        // Add to the beginning of the list (avoid duplicates)
        setMyMessages(prev => {
          // Check if message already exists to avoid duplicates
          const exists = prev.some(msg => msg._id === newMessage._id)
          if (exists) return prev
          return [newMessage, ...prev]
        })
        
        // Scroll to top to show the new message
        setTimeout(() => {
          const messagesList = document.querySelector('.messages-list')
          if (messagesList) {
            messagesList.scrollTop = 0
          }
        }, 100)
      }
      
      // Then refresh after a short delay to get the complete data from server
      // This ensures we have the full message data from the database
      setTimeout(() => {
        fetchMyMessages()
      }, 1000)
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Error sending message: ' + (error.response?.data?.message || error.message))
    } finally {
      setSendingMessage(false)
    }
  }

  const openDeleteModal = (messageId) => {
    const message = myMessages.find(msg => msg._id === messageId)
    setMessageToDelete({ id: messageId, preview: message?.message?.substring(0, 50) || '' })
    setShowDeleteModal(true)
  }

  const closeDeleteModal = () => {
    setShowDeleteModal(false)
    setMessageToDelete(null)
  }

  const handleDeleteMessage = async () => {
    if (!messageToDelete) return

    const messageId = messageToDelete.id
    setDeletingMessageId(messageId)
    setShowDeleteModal(false)
    
    try {
      const token = localStorage.getItem('authToken')
      await axios.delete(
        `${API_BASE_URL}/developer-messages/${messageId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      toast.success('Message deleted successfully!')
      // Remove message from list immediately
      setMyMessages(prev => prev.filter(msg => msg._id !== messageId))
    } catch (error) {
      console.error('Error deleting message:', error)
      toast.error('Error deleting message: ' + (error.response?.data?.message || error.message))
      // Refresh to get accurate list
      fetchMyMessages()
    } finally {
      setDeletingMessageId(null)
      setMessageToDelete(null)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !socketRef.current) return

    const messageToSend = newMessage.trim()

    socketRef.current.emit('chat:send_message', {
      message: messageToSend,
      replyToId: replyingTo?.id || null
    })

    setNewMessage('')
    setReplyingTo(null)
    setIsTyping(false)

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }

    socketRef.current.emit('chat:typing', { isTyping: false })
  }

  const handleReply = (message) => {
    setReplyingTo(message)
    const input = document.querySelector('.message-input')
    if (input) {
      input.focus()
    }
  }

  const cancelReply = () => {
    setReplyingTo(null)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e)
    }
  }

  const handleInputChange = (e) => {
    setNewMessage(e.target.value)

    if (!socketRef.current) return

    if (!isTyping) {
      setIsTyping(true)
      socketRef.current.emit('chat:typing', { isTyping: true })
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      if (socketRef.current) {
        socketRef.current.emit('chat:typing', { isTyping: false })
      }
    }, 3000)
  }

  const handleDeleteChatMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) {
      return
    }

    try {
      const token = localStorage.getItem('authToken')
      const response = await axios.delete(
        `${API_BASE_URL}/chat/message/${messageId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      if (response.data.status === 'success') {
        setMessages(prev => prev.filter(msg => msg.id !== messageId))
      }
    } catch (err) {
      console.error('Error deleting message:', err)
      setError(err.response?.data?.message || 'Failed to delete message')
      setTimeout(() => setError(null), 5000)
    }
  }

  if (!user) {
    navigate('/')
    return null
  }

  return (
    <div className="chat-page">
      {error && (
        <div className="chat-error-banner">
          {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Tab Selector */}
      <div className="chat-tabs">
        <button
          className={`chat-tab ${activeTab === 'community' ? 'active' : ''}`}
          onClick={() => setActiveTab('community')}
        >
          💬 Community Chat
        </button>
        <button
          className={`chat-tab ${activeTab === 'developer' ? 'active' : ''}`}
          onClick={() => setActiveTab('developer')}
        >
          👨‍💻 Contact Developer
        </button>
      </div>

      {activeTab === 'community' ? (
      <div className="chat-container">
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
              onlineUsers.map(onlineUser => {
                const isTyping = typingUsers.some(u => u.userId === onlineUser.userId)
                return (
                  <div key={onlineUser.userId} className="user-item">
                    <div className="user-avatar-small">
                      {onlineUser.avatar}
                      <div className="online-status online"></div>
                    </div>
                    <div className="user-info-container">
                      <span className="user-name">{onlineUser.name}</span>
                      {isTyping && (
                        <span className="typing-badge">typing...</span>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="no-users">No users online</div>
            )}
          </div>

          {/* Banned Words List */}
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
            {messages.length === 0 && connectionStatus === 'connected' ? (
              <div className="empty-chat">
                <div className="empty-icon">💬</div>
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`message-wrapper ${message.isCurrentUser ? 'current-user' : 'other-user'}`}
                >
                  {/* User Avatar and Name */}
                  {!message.isCurrentUser && (
                    <div className="message-user-info">
                      <div className="user-avatar">
                        {message.user.avatar}
                      </div>
                      <span className="user-name">{message.user.name}</span>
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
                        <div className="reply-user">{message.replyTo.user.name}</div>
                        <div className="reply-message">{message.replyTo.message}</div>
                      </div>
                    )}

                    <div className={`message-bubble ${message.isImportant ? 'important' : ''}`}>
                      <p>{message.message}</p>
                      <div className="message-time">
                        {message.timestamp}
                        {message.isCurrentUser && <span className="read-status">✓✓</span>}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="message-actions">
                      {!message.isCurrentUser && (
                        <button
                          className="reply-btn"
                          onClick={() => handleReply(message)}
                          title="Reply to this message"
                        >
                          ↶
                        </button>
                      )}
                      {(message.isCurrentUser || user?.role === 'admin') && (
                        <button
                          className="delete-btn"
                          onClick={() => handleDeleteChatMessage(message.id)}
                          title="Delete message"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply Preview */}
          {replyingTo && (
            <div className="reply-preview-bar">
              <div className="reply-info">
                <span>Replying to {replyingTo.user.name}</span>
                <div className="reply-message-preview">{replyingTo.message}</div>
              </div>
              <button className="cancel-reply-btn" onClick={cancelReply}>✕</button>
            </div>
          )}

          {/* Message Input */}
          <form className="message-input-form" onSubmit={handleSendMessage}>
            <div className="input-container">
              <textarea
                className="message-input"
                placeholder={connectionStatus === 'connected' ? "Type your message..." : "Connecting..."}
                value={newMessage}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                rows="1"
                disabled={connectionStatus !== 'connected'}
              />
              <button
                type="submit"
                className="send-button"
                disabled={!newMessage.trim() || connectionStatus !== 'connected'}
              >
                ➤
              </button>
            </div>
          </form>
        </div>
      </div>
      ) : (
        <div className="developer-contact-container">
          <div className="developer-contact-header">
            <h2>👨‍💻 Contact Developer</h2>
            <p>Share your queries, suggestions, bug reports, or feature requests. We'll get back to you soon!</p>
          </div>

          <div className="developer-contact-content">
            {/* Send Message Form */}
            <div className="send-message-section">
              <h3>Send a Message</h3>
              <form onSubmit={handleSendDeveloperMessage} className="developer-message-form">
                <div className="form-group">
                  <label>Message Type</label>
                  <select
                    value={messageType}
                    onChange={(e) => setMessageType(e.target.value)}
                    className="message-type-select"
                  >
                    <option value="query">❓ Query</option>
                    <option value="suggestion">💡 Suggestion</option>
                    <option value="bug">🐛 Bug Report</option>
                    <option value="feature">✨ Feature Request</option>
                    <option value="other">📝 Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Your Message</label>
                  <textarea
                    value={developerMessage}
                    onChange={(e) => setDeveloperMessage(e.target.value)}
                    placeholder="Type your message here... (max 2000 characters)"
                    rows="6"
                    maxLength={2000}
                    className="developer-message-input"
                    required
                  />
                  <div className="char-count">
                    {developerMessage.length} / 2000 characters
                  </div>
                </div>
                <button
                  type="submit"
                  className="send-developer-message-btn"
                  disabled={!developerMessage.trim() || sendingMessage}
                >
                  {sendingMessage ? (
                    <>
                      <span className="sending-spinner">⏳</span> Sending...
                    </>
                  ) : (
                    '📤 Send Message'
                  )}
                </button>
              </form>
            </div>

            {/* My Messages Section */}
            <div className="my-messages-section">
              <h3>My Messages {myMessages.length > 0 && <span className="message-count">({myMessages.length})</span>}</h3>
              {loadingMessages && myMessages.length === 0 ? (
                <div className="loading-messages">Loading your messages...</div>
              ) : myMessages.length === 0 ? (
                <div className="no-messages">
                  <div className="no-messages-icon">📭</div>
                  <p>You haven't sent any messages yet.</p>
                </div>
              ) : (
                <div className="messages-list">
                  {myMessages.map((msg, index) => (
                    <div 
                      key={msg._id || `msg-${index}`} 
                      className={`message-card ${msg.status} ${index === 0 && msg.status === 'pending' ? 'new-message' : ''}`}
                    >
                      <div className="message-card-header">
                        <div className="message-type-badge">
                          {msg.messageType === 'query' && '❓ Query'}
                          {msg.messageType === 'suggestion' && '💡 Suggestion'}
                          {msg.messageType === 'bug' && '🐛 Bug Report'}
                          {msg.messageType === 'feature' && '✨ Feature Request'}
                          {msg.messageType === 'other' && '📝 Other'}
                        </div>
                        <div className={`status-badge ${msg.status}`}>
                          {msg.status === 'pending' && '⏳ Pending'}
                          {msg.status === 'replied' && '✅ Replied'}
                          {msg.status === 'resolved' && '✔️ Resolved'}
                          {msg.status === 'closed' && '🔒 Closed'}
                        </div>
                      </div>
                      <div className="message-card-body">
                        <p className="message-text">{msg.message}</p>
                        <div className="message-meta">
                          <span>Sent: {new Date(msg.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                      {msg.adminReply && msg.adminReply.message && (
                        <div className="admin-reply-section">
                          <div className="admin-reply-header">
                            <span className="admin-label">👨‍💻 Developer Reply:</span>
                            {msg.adminReply.repliedBy && (
                              <span className="admin-name">
                                by {msg.adminReply.repliedBy.name || 'Admin'}
                              </span>
                            )}
                          </div>
                          <p className="admin-reply-text">{msg.adminReply.message}</p>
                          <div className="admin-reply-meta">
                            <span>
                              Replied: {new Date(msg.adminReply.repliedAt).toLocaleString()}
                            </span>
                            {!msg.isRead && <span className="unread-badge">New</span>}
                          </div>
                        </div>
                      )}
                      <div className="message-card-footer">
                        <button
                          className="btn-delete-message"
                          onClick={() => openDeleteModal(msg._id)}
                          disabled={deletingMessageId === msg._id}
                          title="Delete this message"
                        >
                          {deletingMessageId === msg._id ? 'Deleting...' : '🗑️ Delete'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={closeDeleteModal}>
          <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🗑️ Delete Message</h2>
              <button className="modal-close" onClick={closeDeleteModal}>×</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this message? This action cannot be undone.</p>
              {messageToDelete?.preview && (
                <div className="message-preview">
                  <strong>Message preview:</strong>
                  <p>"{messageToDelete.preview}{messageToDelete.preview.length >= 50 ? '...' : ''}"</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeDeleteModal}>
                Cancel
              </button>
              <button
                className="btn-delete-confirm"
                onClick={handleDeleteMessage}
                disabled={deletingMessageId !== null}
              >
                {deletingMessageId ? 'Deleting...' : 'Delete Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Chat

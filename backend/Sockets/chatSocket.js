const jwt = require('jsonwebtoken');
const User = require('../Models/User');
const ChatMessage = require('../Models/ChatMessage');

// Helper function to format message time
function formatMessageTime(date) {
  const now = new Date();
  const msgDate = new Date(date);
  const diffMs = now - msgDate;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Same day - show time only
  if (diffDays === 0) {
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
  }

  // Yesterday
  if (diffDays === 1) {
    return `Yesterday ${msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  // Within a week - show day and time
  if (diffDays < 7) {
    return `${msgDate.toLocaleDateString([], { weekday: 'short' })} ${msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  // Older - show date and time
  return `${msgDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

const BANNED_WORDS = [
   'attack'
];

const MAX_MESSAGE_LENGTH = 1000;
const MAX_MESSAGES_PER_MINUTE = 10;

const extractSocketToken = (socket) => {
  if (socket.handshake.auth && socket.handshake.auth.token) {
    return socket.handshake.auth.token;
  }

  const headerToken = socket.handshake.headers?.authorization;
  if (headerToken && headerToken.startsWith('Bearer ')) {
    return headerToken.replace('Bearer ', '').trim();
  }

  return null;
};

const containsBannedWords = (text) => {
  const lowerText = text.toLowerCase();
  return BANNED_WORDS.some(word => lowerText.includes(word.toLowerCase()));
};

module.exports = function registerChatSocket(io) {
  const onlineUsers = new Map(); // socketId -> user info
  const userMessageCounts = new Map(); // userId -> { count, resetTime }
  const CHAT_ROOM = 'community-chat';

  const getUserInfo = (socket) => {
    return {
      userId: socket.user._id.toString(),
      name: socket.user.name,
      avatar: socket.user.avatar || socket.user.name?.charAt(0)?.toUpperCase() || 'U'
    };
  };

  const broadcastOnlineUsers = () => {
    const usersList = Array.from(onlineUsers.values()).map(user => ({
      userId: user.userId,
      name: user.name,
      avatar: user.avatar,
      isOnline: true
    }));

    io.to(CHAT_ROOM).emit('chat:online_users', {
      users: usersList,
      count: usersList.length
    });
  };

  const checkRateLimit = (userId) => {
    const now = Date.now();
    const userLimit = userMessageCounts.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      userMessageCounts.set(userId, {
        count: 1,
        resetTime: now + 60000 // 1 minute
      });
      return true;
    }

    if (userLimit.count >= MAX_MESSAGES_PER_MINUTE) {
      return false;
    }

    userLimit.count += 1;
    return true;
  };

  const sanitizeMessage = (message) => {
    return message.trim().substring(0, MAX_MESSAGE_LENGTH);
  };

  io.use(async (socket, next) => {
    try {
      const token = extractSocketToken(socket);
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const user = await User.findById(decoded.userId).select('name avatar isActive role');
      
      if (!user || !user.isActive) {
        return next(new Error('User not authorized for chat'));
      }

      socket.user = user;
      next();
    } catch (error) {
      console.error('Chat socket authentication failed:', error.message);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const userInfo = getUserInfo(socket);
    
    socket.join(CHAT_ROOM);
    onlineUsers.set(socket.id, userInfo);
    broadcastOnlineUsers();

    socket.emit('chat:connected', {
      userId: userInfo.userId,
      name: userInfo.name,
      message: 'Connected to community chat'
    });

    socket.on('chat:get_history', async (payload) => {
      try {
        const limit = Math.min(parseInt(payload?.limit) || 50, 100);
        
        const messages = await ChatMessage.find({
          isDeleted: false
        })
          .populate('user', 'name avatar')
          .populate('replyTo', 'message user')
          .sort({ isImportant: -1, createdAt: -1 })
          .limit(limit)
          .lean();

        const formattedMessages = messages.reverse().map(msg => ({
          id: msg._id.toString(),
          user: {
            id: msg.user._id.toString(),
            name: msg.user.name,
            avatar: msg.user.avatar || msg.user.name?.charAt(0)?.toUpperCase() || 'U'
          },
          message: msg.message,
          timestamp: formatMessageTime(msg.createdAt),
          createdAt: msg.createdAt,
          isImportant: msg.isImportant || false,
          replyTo: msg.replyTo ? {
            id: msg.replyTo._id.toString(),
            message: msg.replyTo.message,
            user: {
              name: msg.replyTo.user?.name || 'Unknown'
            }
          } : null,
          isCurrentUser: msg.user._id.toString() === userInfo.userId
        }));

        socket.emit('chat:history', {
          messages: formattedMessages
        });
      } catch (error) {
        console.error('Error fetching chat history:', error);
        socket.emit('chat:error', {
          message: 'Failed to load chat history'
        });
      }
    });

    socket.on('chat:send_message', async (payload) => {
      try {
        const { message, replyToId } = payload;

        if (!message || !message.trim()) {
          socket.emit('chat:error', {
            message: 'Message cannot be empty'
          });
          return;
        }

        const sanitizedMessage = sanitizeMessage(message);

        if (containsBannedWords(sanitizedMessage)) {
          socket.emit('chat:error', {
            message: 'Your message contains inappropriate words and cannot be sent.'
          });
          return;
        }

        if (!checkRateLimit(userInfo.userId)) {
          socket.emit('chat:error', {
            message: 'You are sending messages too quickly. Please wait a moment.'
          });
          return;
        }

        let replyTo = null;
        if (replyToId) {
          replyTo = await ChatMessage.findById(replyToId);
          if (!replyTo || replyTo.isDeleted) {
            socket.emit('chat:error', {
              message: 'The message you are replying to no longer exists.'
            });
            return;
          }
        }

        const chatMessage = new ChatMessage({
          user: socket.user._id,
          message: sanitizedMessage,
          replyTo: replyTo ? replyTo._id : null
        });

        await chatMessage.save();

        await chatMessage.populate([
          { path: 'user', select: 'name avatar' },
          { path: 'replyTo', select: 'message', populate: { path: 'user', select: 'name' } }
        ]);

        const messageData = {
          id: chatMessage._id.toString(),
          user: {
            id: chatMessage.user._id.toString(),
            name: chatMessage.user.name,
            avatar: chatMessage.user.avatar || chatMessage.user.name?.charAt(0)?.toUpperCase() || 'U'
          },
          message: chatMessage.message,
          timestamp: new Date(chatMessage.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          }),
          createdAt: chatMessage.createdAt,
          isImportant: chatMessage.isImportant || false,
          replyTo: chatMessage.replyTo ? {
            id: chatMessage.replyTo._id.toString(),
            message: chatMessage.replyTo.message,
            user: {
              name: chatMessage.replyTo.user?.name || 'Unknown'
            }
          } : null,
          isCurrentUser: false
        };

        io.to(CHAT_ROOM).emit('chat:new_message', messageData);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('chat:error', {
          message: 'Failed to send message. Please try again.'
        });
      }
    });

    socket.on('chat:delete_message', async (payload) => {
      try {
        const { messageId } = payload;

        const message = await ChatMessage.findById(messageId);
        if (!message) {
          socket.emit('chat:error', {
            message: 'Message not found'
          });
          return;
        }

        const isOwner = message.user.toString() === userInfo.userId;
        const isAdmin = socket.user.role === 'admin';

        if (!isOwner && !isAdmin) {
          socket.emit('chat:error', {
            message: 'You do not have permission to delete this message'
          });
          return;
        }

        message.isDeleted = true;
        message.deletedAt = new Date();
        message.deletedBy = socket.user._id;
        await message.save();

        io.to(CHAT_ROOM).emit('chat:message_deleted', {
          messageId: messageId
        });
      } catch (error) {
        console.error('Error deleting message:', error);
        socket.emit('chat:error', {
          message: 'Failed to delete message'
        });
      }
    });

    socket.on('chat:typing', (payload) => {
      socket.to(CHAT_ROOM).emit('chat:user_typing', {
        userId: userInfo.userId,
        name: userInfo.name,
        isTyping: payload.isTyping || false
      });
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(socket.id);
      broadcastOnlineUsers();
    });
  });
};


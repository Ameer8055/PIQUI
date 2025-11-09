const express = require('express');
const router = express.Router();
const ChatMessage = require('../Models/ChatMessage');
const { auth } = require('../Middlewares/authMiddleware');

// Get chat history
router.get('/history', auth, async (req, res) => {
  try {
    const { limit = 50, before } = req.query;
    const maxLimit = Math.min(parseInt(limit), 100);

    let query = { isDeleted: false };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await ChatMessage.find(query)
      .populate('user', 'name avatar')
      .populate('replyTo', 'message user')
      .sort({ isImportant: -1, createdAt: -1 })
      .limit(maxLimit)
      .lean();

    const formattedMessages = messages.reverse().map(msg => ({
      id: msg._id.toString(),
      user: {
        id: msg.user._id.toString(),
        name: msg.user.name,
        avatar: msg.user.avatar || msg.user.name?.charAt(0)?.toUpperCase() || 'U'
      },
      message: msg.message,
      timestamp: new Date(msg.createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      }),
      createdAt: msg.createdAt,
      isImportant: msg.isImportant || false,
      replyTo: msg.replyTo ? {
        id: msg.replyTo._id.toString(),
        message: msg.replyTo.message,
        user: {
          name: msg.replyTo.user?.name || 'Unknown'
        }
      } : null,
      isCurrentUser: msg.user._id.toString() === req.user._id.toString()
    }));

    res.json({
      status: 'success',
      data: {
        messages: formattedMessages,
        hasMore: messages.length === maxLimit
      }
    });
  } catch (error) {
    console.error('Chat history error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Delete a message (user can delete their own, admin can delete any)
router.delete('/message/:messageId', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';

    const message = await ChatMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({
        status: 'error',
        message: 'Message not found'
      });
    }

    const isOwner = message.user.toString() === userId.toString();

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to delete this message'
      });
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.deletedBy = userId;
    await message.save();

    res.json({
      status: 'success',
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router;


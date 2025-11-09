const express = require('express');
const router = express.Router();
const DeveloperMessage = require('../Models/DeveloperMessage');
const { auth } = require('../Middlewares/authMiddleware');

// User routes - Send a message to developer
router.post('/send', auth, async (req, res) => {
  try {
    const { message, messageType = 'other' } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Message is required'
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        status: 'error',
        message: 'Message cannot exceed 2000 characters'
      });
    }

    const developerMessage = new DeveloperMessage({
      user: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      message: message.trim(),
      messageType: messageType
    });

    await developerMessage.save();

    res.status(201).json({
      status: 'success',
      message: 'Your message has been sent to the developer. We will get back to you soon!',
      data: developerMessage
    });
  } catch (error) {
    console.error('Error sending developer message:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to send message'
    });
  }
});

// User routes - Get user's own messages
router.get('/my-messages', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = { user: req.user._id };

    if (status && ['pending', 'replied', 'resolved', 'closed'].includes(status)) {
      query.status = status;
    }

    const messages = await DeveloperMessage.find(query)
      .populate('adminReply.repliedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await DeveloperMessage.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        messages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user messages:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch messages'
    });
  }
});

// User routes - Delete own message (must be before /:messageId route)
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const message = await DeveloperMessage.findOne({
      _id: req.params.messageId,
      user: req.user._id
    });

    if (!message) {
      return res.status(404).json({
        status: 'error',
        message: 'Message not found'
      });
    }

    await DeveloperMessage.findByIdAndDelete(req.params.messageId);

    res.json({
      status: 'success',
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to delete message'
    });
  }
});

// Mark messages as read when user views them
router.put('/mark-read', auth, async (req, res) => {
  try {
    const { messageIds } = req.body;

    if (!messageIds || !Array.isArray(messageIds)) {
      return res.status(400).json({
        status: 'error',
        message: 'Message IDs array is required'
      });
    }

    // Mark all messages with admin replies as read
    const result = await DeveloperMessage.updateMany(
      {
        _id: { $in: messageIds },
        user: req.user._id,
        'adminReply.message': { $exists: true },
        isRead: false
      },
      {
        $set: {
          isRead: true,
          readAt: new Date()
        }
      }
    );

    res.json({
      status: 'success',
      message: 'Messages marked as read',
      data: { updated: result.modifiedCount }
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to mark messages as read'
    });
  }
});

// User routes - Get a specific message
router.get('/:messageId', auth, async (req, res) => {
  try {
    const message = await DeveloperMessage.findOne({
      _id: req.params.messageId,
      user: req.user._id
    }).populate('adminReply.repliedBy', 'name email');

    if (!message) {
      return res.status(404).json({
        status: 'error',
        message: 'Message not found'
      });
    }

    // Mark as read if it has admin reply
    if (message.adminReply && message.adminReply.message && !message.isRead) {
      message.isRead = true;
      message.readAt = new Date();
      await message.save();
    }

    res.json({
      status: 'success',
      data: message
    });
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch message'
    });
  }
});

module.exports = router;


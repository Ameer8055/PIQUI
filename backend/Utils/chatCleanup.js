// Utility to clean up old chat messages (older than 7 days)
const ChatMessage = require('../Models/ChatMessage');

const cleanupOldChatMessages = async () => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Delete messages older than 7 days (excluding important messages)
    const result = await ChatMessage.deleteMany({
      createdAt: { $lt: sevenDaysAgo },
      isImportant: false // Don't delete important messages
    });

    console.log(`Cleaned up ${result.deletedCount} old chat messages (older than 7 days)`);
    return result.deletedCount;
  } catch (error) {
    console.error('Error cleaning up old chat messages:', error);
    return 0;
  }
};

module.exports = { cleanupOldChatMessages };


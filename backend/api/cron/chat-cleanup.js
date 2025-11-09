// Vercel Cron Job Endpoint for Chat Cleanup
// This runs daily at 2 AM (configured in vercel.json)

const mongoose = require('mongoose');
const { cleanupOldChatMessages } = require('../../Utils/chatCleanup');

// MongoDB Connection (cached for serverless)
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }

  try {
    const db = await mongoose.connect(process.env.mongoDB_url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    cachedDb = db;
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

module.exports = async (req, res) => {
  // Verify this is a cron request (Vercel adds a header)
  const authHeader = req.headers['authorization'];
  const isCronRequest = authHeader === `Bearer ${process.env.CRON_SECRET}` || 
                       req.headers['x-vercel-cron'] === '1';

  if (!isCronRequest && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }

  try {
    // Connect to database
    await connectToDatabase();

    // Run cleanup
    const deletedCount = await cleanupOldChatMessages();

    console.log(`Chat cleanup completed: ${deletedCount} messages deleted`);

    res.json({
      status: 'success',
      message: 'Chat cleanup completed',
      deleted: deletedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cron job error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};


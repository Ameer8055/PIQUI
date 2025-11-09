// Vercel Serverless Function Entry Point
// This handles all API routes but NOT Socket.IO (which needs a separate deployment)

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_ORIGIN?.split(',') || '*',
  credentials: true
}));

// Only log in development
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// MongoDB Connection with connection pooling for serverless
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
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
    console.log('MongoDB connected');
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// Connect to database
connectToDatabase().catch(console.error);

// Import routes
const authRoutes = require('../Routes/AuthRoutes');
const adminRoutes = require('../Routes/adminRoutes');
const quizRoutes = require('../Routes/quizRoutes');
const chatRoutes = require('../Routes/chatRoutes');
const sharedPDFRoutes = require('../Routes/sharedPDFRoutes');
const typedNoteRoutes = require('../Routes/typedNoteRoutes');
const quizFromPDFRoutes = require('../Routes/quizFromPDFRoutes');
const developerMessageRoutes = require('../Routes/developerMessageRoutes');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/shared-pdfs', sharedPDFRoutes);
app.use('/api/typed-notes', typedNoteRoutes);
app.use('/api/quiz-from-pdf', quizFromPDFRoutes);
app.use('/api/developer-messages', developerMessageRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files (if needed)
// Note: For production, use Cloudinary or similar for file storage
app.use('/uploads', express.static(path.join(__dirname, '../Public', 'uploads')));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal server error'
  });
});

// Export for Vercel
module.exports = app;


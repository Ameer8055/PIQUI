// Vercel Serverless Function Entry Point
// This handles all API routes but NOT Socket.IO (which needs a separate deployment)

// Load environment variables (Vercel injects these automatically, but dotenv helps for local dev)
try {
  require('dotenv').config();
} catch (e) {
  // dotenv might not be needed in production on Vercel
  console.log('dotenv not available, using Vercel env vars');
}

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
let isConnecting = false;

async function connectToDatabase() {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }

  if (isConnecting) {
    // Wait for existing connection attempt
    return new Promise((resolve) => {
      const checkConnection = setInterval(() => {
        if (cachedDb && mongoose.connection.readyState === 1) {
          clearInterval(checkConnection);
          resolve(cachedDb);
        }
      }, 100);
    });
  }

  isConnecting = true;

  try {
    if (!process.env.mongoDB_url) {
      throw new Error('MongoDB URL is not configured');
    }

    const db = await mongoose.connect(process.env.mongoDB_url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    cachedDb = db;
    isConnecting = false;
    console.log('MongoDB connected');
    return db;
  } catch (error) {
    isConnecting = false;
    console.error('MongoDB connection error:', error);
    // Don't throw - allow function to start even if DB connection fails
    // The routes will handle DB errors individually
    return null;
  }
}

// Import routes with error handling - load each route individually to catch specific errors
let authRoutes, adminRoutes, quizRoutes, chatRoutes, sharedPDFRoutes, typedNoteRoutes, quizFromPDFRoutes, developerMessageRoutes;
const routeErrors = [];

try {
  authRoutes = require('../Routes/AuthRoutes');
  console.log('✓ AuthRoutes loaded');
} catch (error) {
  console.error('✗ Error loading AuthRoutes:', error.message);
  routeErrors.push('AuthRoutes: ' + error.message);
}

try {
  adminRoutes = require('../Routes/adminRoutes');
  console.log('✓ adminRoutes loaded');
} catch (error) {
  console.error('✗ Error loading adminRoutes:', error.message);
  routeErrors.push('adminRoutes: ' + error.message);
}

try {
  quizRoutes = require('../Routes/quizRoutes');
  console.log('✓ quizRoutes loaded');
} catch (error) {
  console.error('✗ Error loading quizRoutes:', error.message);
  routeErrors.push('quizRoutes: ' + error.message);
}

try {
  chatRoutes = require('../Routes/chatRoutes');
  console.log('✓ chatRoutes loaded');
} catch (error) {
  console.error('✗ Error loading chatRoutes:', error.message);
  routeErrors.push('chatRoutes: ' + error.message);
}

try {
  sharedPDFRoutes = require('../Routes/sharedPDFRoutes');
  console.log('✓ sharedPDFRoutes loaded');
} catch (error) {
  console.error('✗ Error loading sharedPDFRoutes:', error.message);
  routeErrors.push('sharedPDFRoutes: ' + error.message);
}

try {
  typedNoteRoutes = require('../Routes/typedNoteRoutes');
  console.log('✓ typedNoteRoutes loaded');
} catch (error) {
  console.error('✗ Error loading typedNoteRoutes:', error.message);
  routeErrors.push('typedNoteRoutes: ' + error.message);
}

try {
  quizFromPDFRoutes = require('../Routes/quizFromPDFRoutes');
  console.log('✓ quizFromPDFRoutes loaded');
} catch (error) {
  console.error('✗ Error loading quizFromPDFRoutes:', error.message);
  routeErrors.push('quizFromPDFRoutes: ' + error.message);
}

try {
  developerMessageRoutes = require('../Routes/developerMessageRoutes');
  console.log('✓ developerMessageRoutes loaded');
} catch (error) {
  console.error('✗ Error loading developerMessageRoutes:', error.message);
  routeErrors.push('developerMessageRoutes: ' + error.message);
}

// If any routes failed to load, add an error endpoint
if (routeErrors.length > 0) {
  app.get('/api/route-errors', (req, res) => {
    res.status(500).json({ 
      status: 'error', 
      message: 'Some routes failed to load',
      errors: routeErrors
    });
  });
}

// Health check endpoint (should work even if DB is not connected)
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const mongoUrl = process.env.mongoDB_url ? 'configured' : 'not configured';
    
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: dbStatus,
      mongoUrl: mongoUrl,
      environment: process.env.NODE_ENV || 'development',
      routesLoaded: {
        auth: !!authRoutes,
        admin: !!adminRoutes,
        quiz: !!quizRoutes,
        chat: !!chatRoutes,
        sharedPDF: !!sharedPDFRoutes,
        typedNote: !!typedNoteRoutes,
        quizFromPDF: !!quizFromPDFRoutes,
        developerMessage: !!developerMessageRoutes
      },
      routeErrors: routeErrors.length > 0 ? routeErrors : null
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

// Middleware to ensure DB connection before handling requests (except health check)
app.use(async (req, res, next) => {
  // Skip DB connection for health check
  if (req.path === '/api/health') {
    return next();
  }
  
  // Try to connect to DB if not already connected
  if (mongoose.connection.readyState !== 1) {
    await connectToDatabase();
  }
  
  next();
});

// API Routes (only if routes loaded successfully)
if (authRoutes) app.use('/api/auth', authRoutes);
if (adminRoutes) app.use('/api/admin', adminRoutes);
if (quizRoutes) app.use('/api/quiz', quizRoutes);
if (chatRoutes) app.use('/api/chat', chatRoutes);
if (sharedPDFRoutes) app.use('/api/shared-pdfs', sharedPDFRoutes);
if (typedNoteRoutes) app.use('/api/typed-notes', typedNoteRoutes);
if (quizFromPDFRoutes) app.use('/api/quiz-from-pdf', quizFromPDFRoutes);
if (developerMessageRoutes) app.use('/api/developer-messages', developerMessageRoutes);

// Serve static files (if needed)
// Note: For production, use Cloudinary or similar for file storage
// Only serve static files if Public folder exists
try {
  const fs = require('fs');
  const publicPath = path.join(__dirname, '../Public', 'uploads');
  if (fs.existsSync(publicPath)) {
    app.use('/uploads', express.static(publicPath));
  }
} catch (error) {
  // Public folder doesn't exist or can't be accessed - this is fine for serverless
  console.log('Static file serving disabled (using Cloudinary for production)');
}

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


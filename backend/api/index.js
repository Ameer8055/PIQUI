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

// CORS Configuration - Handle preflight requests properly
const allowedOrigins = process.env.CLIENT_ORIGIN 
  ? process.env.CLIENT_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://localhost:3000', '*']; // Default to allow localhost for development

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, or server-to-server)
    if (!origin) return callback(null, true);
    
    // Allow all origins if '*' is in the list (for development)
    if (allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    
    // Check if origin is allowed
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 24 hours
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Middleware to fix double slashes and normalize paths
app.use((req, res, next) => {
  // Fix double slashes in path
  if (req.path.includes('//')) {
    const normalizedPath = req.path.replace(/\/+/g, '/');
    console.log(`[Path Normalizer] Fixed path: ${req.path} -> ${normalizedPath}`);
    req.url = req.url.replace(req.path, normalizedPath);
    req.path = normalizedPath;
  }
  next();
});

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
  console.log('[connectToDatabase] Function called');
  console.log('[connectToDatabase] Current state:', {
    hasCachedDb: !!cachedDb,
    readyState: mongoose.connection.readyState,
    isConnecting: isConnecting
  });
  
  if (cachedDb && mongoose.connection.readyState === 1) {
    console.log('[connectToDatabase] Using cached connection');
    return cachedDb;
  }

  if (isConnecting) {
    console.log('[connectToDatabase] Connection already in progress, waiting...');
    // Wait for existing connection attempt (with timeout)
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max wait
      const checkConnection = setInterval(() => {
        attempts++;
        if (cachedDb && mongoose.connection.readyState === 1) {
          clearInterval(checkConnection);
          console.log('[connectToDatabase] Waited for connection, now connected');
          resolve(cachedDb);
        } else if (attempts >= maxAttempts) {
          clearInterval(checkConnection);
          console.error('[connectToDatabase] Connection wait timeout');
          reject(new Error('Connection timeout'));
        }
      }, 100);
    });
  }

  isConnecting = true;
  console.log('[connectToDatabase] Starting new connection attempt...');
  
  const startTime = Date.now();

  try {
    if (!process.env.mongoDB_url) {
      throw new Error('MongoDB URL is not configured. Please set mongoDB_url environment variable.');
    }

    console.log('[connectToDatabase] MongoDB URL configured:', {
      hasUrl: true,
      urlLength: process.env.mongoDB_url.length,
      urlPrefix: process.env.mongoDB_url.substring(0, 20) + '...' // Show first 20 chars only for security
    });
    
    console.log('[connectToDatabase] Attempting to connect to MongoDB...');
    
    const db = await mongoose.connect(process.env.mongoDB_url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000, // Increased to 10 seconds
      socketTimeoutMS: 45000,
    });
    
    const connectionTime = Date.now() - startTime;
    cachedDb = db;
    isConnecting = false;
    console.log(`[connectToDatabase] ✓ MongoDB connected successfully in ${connectionTime}ms`);
    console.log('[connectToDatabase] Connection details:', {
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name,
      readyState: mongoose.connection.readyState
    });
    return db;
  } catch (error) {
    isConnecting = false;
    const connectionTime = Date.now() - startTime;
    console.error(`[connectToDatabase] ✗ MongoDB connection error after ${connectionTime}ms:`, error.message);
    console.error('[connectToDatabase] Error details:', {
      errorName: error.name,
      errorCode: error.code,
      hasUrl: !!process.env.mongoDB_url,
      urlLength: process.env.mongoDB_url?.length || 0,
      stack: error.stack?.split('\n').slice(0, 3).join('\n') // First 3 lines of stack
    });
    // Return null to indicate failure, but don't throw
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
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const dbState = mongoose.connection.readyState;
    const dbStatus = states[dbState] || 'unknown';
    const mongoUrl = process.env.mongoDB_url ? 'configured' : 'not configured';
    
    console.log('[Health Check] Request received');
    console.log('[Health Check] DB State:', dbStatus, `(${dbState})`);
    
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: dbStatus,
      dbStateCode: dbState,
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
    console.error('[Health Check] Error:', error.message);
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
  // Skip DB connection for health check and route errors
  if (req.path === '/api/health' || req.path === '/api/route-errors') {
    return next();
  }
  
  // Log connection status before attempting connection
  const currentState = mongoose.connection.readyState;
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  console.log(`[DB Middleware] ========================================`);
  console.log(`[DB Middleware] Request received: ${req.method} ${req.path}`);
  console.log(`[DB Middleware] Current DB state: ${states[currentState] || 'unknown'} (${currentState})`);
  
  // Try to connect to DB if not already connected
  if (mongoose.connection.readyState !== 1) {
    console.log(`[DB Middleware] DB not connected, attempting connection...`);
    try {
      const db = await connectToDatabase();
      
      // Check final state after connection attempt
      const finalState = mongoose.connection.readyState;
      console.log(`[DB Middleware] After connection attempt - DB state: ${states[finalState] || 'unknown'} (${finalState})`);
      
      // If connection failed, log but don't block - let routes handle it
      if (!db && mongoose.connection.readyState !== 1) {
        console.error(`[DB Middleware] ⚠️  Database connection failed, but allowing request to proceed`);
        console.error(`[DB Middleware] Routes will handle DB errors individually`);
        // Don't block - let the route handlers deal with DB errors
        // This allows us to see what error the route handler gets
      } else if (mongoose.connection.readyState === 1) {
        console.log(`[DB Middleware] ✓ Database connected successfully`);
      }
    } catch (error) {
      console.error(`[DB Middleware] Connection attempt threw error:`, error.message);
      // Don't block - let routes handle it
    }
  } else {
    console.log(`[DB Middleware] ✓ DB already connected`);
  }
  
  console.log(`[DB Middleware] Proceeding to route handler...`);
  console.log(`[DB Middleware] ========================================`);
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


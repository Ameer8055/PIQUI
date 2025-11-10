const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();

app.use(cors({
  origin: process.env.CLIENT_ORIGIN?.split(',') || '*',
  credentials: true
}));
// Add this after your CORS middleware but before your routes
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.originalUrl}`);
  console.log(`📍 Headers:`, req.headers);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Add route listing for debugging
app.get('/api/debug/routes', (req, res) => {
  const routes = [
    'GET /api/health',
    'GET /api/debug/routes',
    'POST /api/auth/login',
    'POST /api/auth/register',
    'GET /api/admin/*',
    'GET /api/quiz/*',
    'GET /api/chat/*',
    'GET /api/shared-pdfs/*',
    'GET /api/typed-notes/*',
    'GET /api/quiz-from-pdf/*',
    'GET /api/developer-messages/*'
  ];
  res.json({ availableRoutes: routes });
});
app.use(morgan('dev'));
app.use(express.json());

mongoose
  .connect(process.env.mongoDB_url)
  .then(() => {
    console.log('MongoDB connection established');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// Health check
app.get('/api/health', (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const dbState = mongoose.connection.readyState;
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: states[dbState] || 'unknown',
    dbStateCode: dbState,
    environment: process.env.NODE_ENV || 'development'
  });
});

const authRoutes = require('./Routes/AuthRoutes');
const adminRoutes = require('./Routes/adminRoutes');
const quizRoutes = require('./Routes/quizRoutes');
const chatRoutes = require('./Routes/chatRoutes');
const sharedPDFRoutes = require('./Routes/sharedPDFRoutes');
const typedNoteRoutes = require('./Routes/typedNoteRoutes');
const quizFromPDFRoutes = require('./Routes/quizFromPDFRoutes');
const developerMessageRoutes = require('./Routes/developerMessageRoutes');
const path = require('path');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/shared-pdfs', sharedPDFRoutes);
app.use('/api/typed-notes', typedNoteRoutes);
app.use('/api/quiz-from-pdf', quizFromPDFRoutes);
app.use('/api/developer-messages', developerMessageRoutes);

// Serve static files from Public directory
app.use('/uploads', express.static(path.join(__dirname, 'Public', 'uploads')));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN?.split(',') || '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const registerQuizBattleSocket = require('./Sockets/quizBattleSocket');
const registerChatSocket = require('./Sockets/chatSocket');
const cron = require('node-cron');
const { cleanupOldChatMessages } = require('./Utils/chatCleanup');

registerQuizBattleSocket(io);
registerChatSocket(io);

// Schedule chat cleanup to run daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('Running scheduled chat cleanup...');
  await cleanupOldChatMessages();
}, {
  scheduled: true,
  timezone: "Asia/Kolkata"
});

// Run cleanup on server start (optional - for immediate cleanup)
// Uncomment if you want to clean up immediately on server start
// cleanupOldChatMessages().then(count => {
//   console.log(`Initial cleanup completed: ${count} messages deleted`);
// });

const PORT = process.env.port || process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Standalone Socket.IO Server for Railway/Render/Fly.io
// This handles WebSocket connections (chat and quiz battle)
// Deploy this separately from the Vercel API

const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Basic middleware
app.use(cors({
  origin: process.env.CLIENT_ORIGIN?.split(',') || '*',
  credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'socket-server', timestamp: new Date().toISOString() });
});

// MongoDB Connection
mongoose
  .connect(process.env.mongoDB_url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('MongoDB connection established for Socket.IO server');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN?.split(',') || '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Import and register socket handlers
const registerQuizBattleSocket = require('./Sockets/quizBattleSocket');
const registerChatSocket = require('./Sockets/chatSocket');

registerQuizBattleSocket(io);
registerChatSocket(io);

// Start server
const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`Socket.IO server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});


// server.js - Express + Socket.io server
require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const setupSocketHandlers = require('./socketHandler');

const app = express();
const server = http.createServer(app);

// Parse CORS_ORIGINS from env (comma-separated) or fall back to localhost defaults
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Setup socket handlers
setupSocketHandlers(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🃏 Bid6 server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  console.log(`🔒 Allowed origins: ${allowedOrigins.join(', ')}`);
});

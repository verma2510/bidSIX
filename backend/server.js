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
    credentials: true,
  },
  // Prefer websocket; fall back to polling only when websocket is blocked
  transports: ['websocket', 'polling'],
  // Give mobile clients more breathing room before declaring them dead.
  // Default pingTimeout=20s is too short for backgrounded mobile tabs.
  pingInterval: 25000,   // send a ping every 25 s
  pingTimeout:  60000,   // declare dead only after 60 s without pong
  // Allow 30 s for the transport upgrade (polling → websocket)
  upgradeTimeout: 30000,
  // Prevent oversized payloads from crashing the process
  maxHttpBufferSize: 1e6,
});

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Setup socket handlers
setupSocketHandlers(io);

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on ${PORT}`);
});

// Socket connection manager
import { io } from 'socket.io-client';

// VITE_SOCKET_URL must be set in your deployment environment variables.
// On local dev it falls back to localhost:3001.
// NEVER use window.location.hostname as a fallback — on deployment the
// frontend and backend are on different domains, so that gives the wrong host.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

// Generate or retrieve a stable persistent player ID stored in localStorage
function getOrCreatePlayerId() {
  let pid = localStorage.getItem('bid6_playerId');
  if (!pid) {
    pid = 'pid_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    localStorage.setItem('bid6_playerId', pid);
  }
  return pid;
}

export function getPlayerId() {
  return getOrCreatePlayerId();
}

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      // Send our stable playerId on every connection/reconnection
      auth: {
        playerId: getOrCreatePlayerId(),
      },
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
  }
}

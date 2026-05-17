// Socket connection manager
import { io } from 'socket.io-client';

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

let socket = null;

// Stable persistent player ID stored in localStorage
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
      // Try websocket first — faster and more stable on mobile.
      // Fall back to polling if websocket is blocked by a proxy/firewall.
      transports: ['websocket', 'polling'],
      // Keep retrying indefinitely; the server's 2-minute grace period means
      // players have plenty of time to reconnect after a network blip.
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,       // first retry after 1 s
      reconnectionDelayMax: 10000,   // cap at 10 s between retries
      randomizationFactor: 0.4,      // jitter to avoid thundering herd
      // How long to wait for the server's initial handshake before giving up
      timeout: 20000,
      // Stable ID sent on every connect/reconnect so the server can match
      // this socket to an existing room session
      auth: { playerId: getOrCreatePlayerId() },
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket) socket.disconnect();
}

// ── Application-level heartbeat ─────────────────────────────────────────────
// Socket.io's built-in ping/pong runs at the engine level and may be paused
// by mobile browsers when the tab is backgrounded. We send our own lightweight
// ping every 15 s so the server can detect and log stale connections, and so
// we can detect a broken socket before Socket.io's 60 s timeout fires.

let heartbeatTimer = null;
let lastPongAt = Date.now();

function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    const s = getSocket();
    if (s.connected) {
      if (Date.now() - lastPongAt > 35000) {
        console.warn('[socket] No server_pong received in >35s — reconnecting…');
        lastPongAt = Date.now();
        s.disconnect();
        s.connect();
        return;
      }
      s.emit('client_ping', Date.now());
    }
  }, 15000);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

// ── Visibility-change recovery ──────────────────────────────────────────────
// Mobile browsers suspend network activity when the tab is hidden. When the
// user returns, the WebSocket may be silently dead. We reconnect proactively
// on `visibilitychange` so the rejoin handshake fires as fast as possible.

function handleVisibilityChange() {
  if (document.visibilityState !== 'visible') return;
  const s = getSocket();
  if (!s.connected) {
    console.log('[socket] Tab visible again — reconnecting…');
    s.connect();
  }
}

export function initSocketLifecycle() {
  const s = getSocket();

  s.on('connect', () => {
    lastPongAt = Date.now();
    startHeartbeat();
  });

  s.on('disconnect', () => {
    stopHeartbeat();
  });

  s.on('server_pong', () => {
    lastPongAt = Date.now();
  });

  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Online/offline browser events — reconnect immediately when network returns
  window.addEventListener('online', () => {
    const s = getSocket();
    if (!s.connected) {
      console.log('[socket] Network online — reconnecting…');
      s.connect();
    }
  });

  // HTTP keep-alive ping every 4 minutes — prevents Render/Railway free-tier
  // servers from sleeping and wiping all in-memory rooms.
  setInterval(() => {
    fetch(SOCKET_URL + '/api/health', { method: 'GET' }).catch(() => {});
  }, 4 * 60 * 1000);
}

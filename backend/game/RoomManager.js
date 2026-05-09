// RoomManager.js - Manages game rooms and player connections

const { GameEngine } = require('./GameEngine');
const { v4: uuidv4 } = require('uuid');

// How long (ms) to wait before permanently removing a disconnected player
const RECONNECT_TIMEOUT_MS = parseInt(process.env.RECONNECT_TIMEOUT_MS, 10) || 60 * 1000;

class RoomManager {
  constructor() {
    this.rooms = new Map();           // roomId -> GameEngine
    this.playerRooms = new Map();     // playerId -> roomId  (stable playerId, NOT socket.id)
    this.reconnectTimers = new Map(); // playerId -> timeoutHandle
  }

  // Create a new room
  createRoom(playerId, playerName) {
    const roomId = uuidv4().substring(0, 6).toUpperCase();
    const game = new GameEngine(roomId);
    const player = game.addPlayer(playerId, playerName);

    this.rooms.set(roomId, game);
    this.playerRooms.set(playerId, roomId);

    return { roomId, player, game };
  }

  // Join an existing room, or restore session if playerId already exists in room
  joinRoom(roomId, playerId, playerName) {
    const game = this.rooms.get(roomId);
    if (!game) return { error: 'Room not found' };

    // --- Reconnection path: player already has a seat in this room ---
    const existing = game.players.find(p => p.playerId === playerId);
    if (existing) {
      // Cancel any pending removal timer
      if (this.reconnectTimers.has(playerId)) {
        clearTimeout(this.reconnectTimers.get(playerId));
        this.reconnectTimers.delete(playerId);
      }
      existing.connected = true;
      this.playerRooms.set(playerId, roomId);
      return { player: existing, game, reconnected: true };
    }

    // --- New player path ---
    // Count only seats occupied by persistent playerIds (connected or pending reconnect)
    const occupiedSeats = game.players.length;
    if (occupiedSeats >= 6) return { error: 'Room is full' };

    const player = game.addPlayer(playerId, playerName);
    if (!player) return { error: 'Could not join room' };

    this.playerRooms.set(playerId, roomId);
    return { player, game, reconnected: false };
  }

  // Get room by stable playerId
  getRoomByPlayer(playerId) {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return null;
    return this.rooms.get(roomId);
  }

  // Get room by roomId
  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  // Handle player disconnect - mark inactive, start removal timer
  handleDisconnect(playerId) {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return null;

    const game = this.rooms.get(roomId);
    if (!game) return null;

    const player = game.players.find(p => p.playerId === playerId);
    if (player) {
      player.connected = false;

      // Start a grace period timer — remove seat only after timeout
      const timer = setTimeout(() => {
        this._permanentlyRemovePlayer(playerId, roomId);
      }, RECONNECT_TIMEOUT_MS);

      this.reconnectTimers.set(playerId, timer);
    }

    return { roomId, player, game };
  }

  // Permanently remove player after timeout expires
  _permanentlyRemovePlayer(playerId, roomId) {
    this.reconnectTimers.delete(playerId);
    this.playerRooms.delete(playerId);

    const game = this.rooms.get(roomId);
    if (!game) return;

    // Only remove if game hasn't started yet; mid-game keep seat
    if (game.phase === 'waiting') {
      const idx = game.players.findIndex(p => p.playerId === playerId);
      if (idx !== -1) {
        game.players.splice(idx, 1);
        // Re-assign seatIndex for remaining players to keep them sequential
        game.players.forEach((p, i) => { p.seatIndex = i; p.team = i % 2 === 0 ? 'A' : 'B'; });
      }
    }

    // Clean up empty waiting rooms
    if (game.players.length === 0 && game.phase === 'waiting') {
      this.rooms.delete(roomId);
    }
  }

  // Get all active rooms (for lobby)
  getActiveRooms() {
    const rooms = [];
    for (const [roomId, game] of this.rooms) {
      rooms.push({
        roomId,
        playerCount: game.players.length,
        phase: game.phase,
        players: game.players.map(p => ({
          name: p.name,
          team: p.team,
          connected: p.connected,
        })),
      });
    }
    return rooms;
  }
}

module.exports = new RoomManager();

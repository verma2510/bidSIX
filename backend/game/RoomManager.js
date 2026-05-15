// RoomManager.js - Manages game rooms and player connections

const { GameEngine } = require('./GameEngine');
const { v4: uuidv4 } = require('uuid');

// How long (ms) to wait before permanently removing a disconnected player
const RECONNECT_TIMEOUT_MS = parseInt(process.env.RECONNECT_TIMEOUT_MS, 10) || 120 * 1000;

// How long (ms) after ALL players have gone before a mid-game room is deleted
const STALE_ROOM_TTL_MS = parseInt(process.env.STALE_ROOM_TTL_MS, 10) || 30 * 60 * 1000;

// How often to scan for stale rooms
const STALE_ROOM_CHECK_INTERVAL_MS = 10 * 60 * 1000;

class RoomManager {
  constructor() {
    this.rooms = new Map();           // roomId -> GameEngine
    this.playerRooms = new Map();     // playerId -> roomId  (stable playerId, NOT socket.id)
    this.reconnectTimers = new Map(); // playerId -> timeoutHandle
    this.roomEmptiedAt = new Map();   // roomId -> timestamp when last player disconnected

    // Periodically delete mid-game rooms abandoned by all players
    setInterval(() => this._cleanStaleRooms(), STALE_ROOM_CHECK_INTERVAL_MS);
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
      // Room is no longer empty — clear stale-cleanup timestamp
      this.roomEmptiedAt.delete(roomId);
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

      // Track when the room became fully empty so stale cleanup can act on it
      const anyConnected = game.players.some(p => p.connected);
      if (!anyConnected) {
        this.roomEmptiedAt.set(roomId, Date.now());
      }
    }

    return { roomId, player, game };
  }

  // Voluntary leave — player clicks "Leave Room"
  leaveRoom(playerId) {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return { error: 'Not in a room' };

    const game = this.rooms.get(roomId);
    if (!game) return { error: 'Room not found' };

    // Only allow leaving during the waiting phase
    if (game.phase !== 'waiting') {
      return { error: 'Cannot leave mid-game' };
    }

    // Cancel any pending reconnect timer
    if (this.reconnectTimers.has(playerId)) {
      clearTimeout(this.reconnectTimers.get(playerId));
      this.reconnectTimers.delete(playerId);
    }

    const player = game.players.find(p => p.playerId === playerId);
    const playerInfo = player ? { name: player.name, seatIndex: player.seatIndex, team: player.team } : null;

    // Remove player from the game
    const idx = game.players.findIndex(p => p.playerId === playerId);
    if (idx !== -1) {
      game.players.splice(idx, 1);
      // Do NOT re-assign seatIndex — seats are fixed positions (0-5)
    }

    // Transfer admin if the leaving player was admin
    if (game.adminPlayerId === playerId && game.players.length > 0) {
      game.adminPlayerId = game.players[0].playerId;
    }

    // Clean up mapping
    this.playerRooms.delete(playerId);

    // Clean up empty rooms
    if (game.players.length === 0) {
      this.rooms.delete(roomId);
    }

    return { roomId, player: playerInfo, game, playersRemaining: game.players.length };
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
        // Do NOT re-assign seatIndex — seats are fixed positions (0-5)
      }

      // Transfer admin if needed
      if (game.adminPlayerId === playerId && game.players.length > 0) {
        game.adminPlayerId = game.players[0].playerId;
      }
    }

    // Clean up empty waiting rooms
    if (game.players.length === 0 && game.phase === 'waiting') {
      this.rooms.delete(roomId);
    }
  }

  // Admin kicks a player from the room
  kickPlayer(adminId, targetPlayerId) {
    const roomId = this.playerRooms.get(adminId);
    if (!roomId) return { error: 'Admin not in a room' };

    const game = this.rooms.get(roomId);
    if (!game) return { error: 'Room not found' };

    const result = game.kickPlayer(adminId, targetPlayerId);
    if (result.error) return result;

    // Clean up the kicked player's mappings
    if (this.reconnectTimers.has(targetPlayerId)) {
      clearTimeout(this.reconnectTimers.get(targetPlayerId));
      this.reconnectTimers.delete(targetPlayerId);
    }
    this.playerRooms.delete(targetPlayerId);

    return { ...result, roomId, game };
  }

  // Remove rooms that have been fully abandoned (all players gone) past the TTL
  _cleanStaleRooms() {
    const now = Date.now();
    for (const [roomId, emptiedAt] of this.roomEmptiedAt) {
      if (now - emptiedAt < STALE_ROOM_TTL_MS) continue;

      const game = this.rooms.get(roomId);
      if (!game) { this.roomEmptiedAt.delete(roomId); continue; }

      // Re-check: if someone reconnected, clear the emptied timestamp
      const anyConnected = game.players.some(p => p.connected);
      const anyPendingTimer = game.players.some(p => this.reconnectTimers.has(p.playerId));
      if (anyConnected || anyPendingTimer) {
        this.roomEmptiedAt.delete(roomId);
        continue;
      }

      // All players permanently gone — clean up mappings and delete room
      for (const p of game.players) {
        this.playerRooms.delete(p.playerId);
        if (this.reconnectTimers.has(p.playerId)) {
          clearTimeout(this.reconnectTimers.get(p.playerId));
          this.reconnectTimers.delete(p.playerId);
        }
      }
      this.rooms.delete(roomId);
      this.roomEmptiedAt.delete(roomId);
      console.log(`[RoomManager] Stale room ${roomId} cleaned up after ${Math.round((now - emptiedAt) / 60000)} min`);
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

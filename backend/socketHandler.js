// socketHandler.js - Socket.io event handling for the card game

const roomManager = require('./game/RoomManager');
const { PHASES } = require('./game/GameEngine');

// Find the socket.id of a connected socket by its stable playerId
function findSocketByPlayerId(io, targetPlayerId) {
  for (const [, s] of io.sockets.sockets) {
    if (s.handshake.auth?.playerId === targetPlayerId) {
      return s.id;
    }
  }
  return null;
}

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    // Use the stable playerId sent from the client (stored in localStorage).
    // Fall back to socket.id only if not provided (shouldn't happen in practice).
    const playerId = socket.handshake.auth?.playerId || socket.id;
    console.log(`Player connected: socket=${socket.id} playerId=${playerId}`);

    // ---- Helpers ----
    // Broadcast updated state to every connected player in a game
    function broadcastState(game) {
      game.players.forEach(p => {
        if (p.connected) {
          io.to(p.id).emit('game_state', game.getStateForPlayer(p.playerId));
        }
      });
    }

    // Create a new room
    socket.on('create_room', ({ playerName }, callback) => {
      try {
        const { roomId, player, game } = roomManager.createRoom(playerId, playerName);

        // Critical: set the socket ID so broadcastState can reach this player
        player.id = socket.id;

        socket.join(roomId);

        // Include the full game state in the callback so the frontend has it
        // immediately — no second round-trip needed, no race conditions.
        callback({
          success: true,
          roomId,
          player: { name: player.name, seatIndex: player.seatIndex, team: player.team },
          gameState: game.getStateForPlayer(playerId),
        });

        broadcastState(game);
        io.to(roomId).emit('player_joined', {
          playerName: player.name,
          seatIndex: player.seatIndex,
          team: player.team,
          playerCount: game.players.length,
        });

        console.log(`Room ${roomId} created by ${playerName} (${playerId})`);
      } catch (err) {
        callback({ success: false, error: err.message });
      }
    });

    // Join an existing room (also handles reconnection transparently)
    socket.on('join_room', ({ roomId, playerName }, callback) => {
      try {
        const upperRoomId = roomId.toUpperCase();
        const result = roomManager.joinRoom(upperRoomId, playerId, playerName);
        if (result.error) {
          callback({ success: false, error: result.error });
          return;
        }

        const { player, game, reconnected } = result;

        // Update the socket-facing id so targeted emits reach the new socket
        player.id = socket.id;

        socket.join(upperRoomId);

        // Include game state directly in callback — same pattern as create_room
        callback({
          success: true,
          roomId: upperRoomId,
          reconnected: !!reconnected,
          player: { name: player.name, seatIndex: player.seatIndex, team: player.team },
          gameState: game.getStateForPlayer(playerId),
        });

        // Send personalized state to everyone
        broadcastState(game);

        if (reconnected) {
          console.log(`${playerName} reconnected to room ${upperRoomId} (seat ${player.seatIndex})`);
          io.to(upperRoomId).emit('player_reconnected', {
            playerName: player.name,
            seatIndex: player.seatIndex,
          });
        } else {
          console.log(`${playerName} joined room ${upperRoomId}`);
          io.to(upperRoomId).emit('player_joined', {
            playerName: player.name,
            seatIndex: player.seatIndex,
            team: player.team,
            playerCount: game.players.length,
          });
        }
      } catch (err) {
        callback({ success: false, error: err.message });
      }
    });

    // Silent rejoin — used after page reload / network reconnect
    // The client sends the roomId it had; we look up the player by stable playerId.
    socket.on('rejoin_room', ({ roomId }, callback) => {
      try {
        if (!roomId) { callback({ success: false, error: 'No room ID' }); return; }

        const upperRoomId = roomId.toUpperCase();
        const game = roomManager.getRoom(upperRoomId);

        if (!game) {
          callback({ success: false, error: 'Room no longer exists' });
          return;
        }

        const existing = game.players.find(p => p.playerId === playerId);
        if (!existing) {
          callback({ success: false, error: 'Player not found in room' });
          return;
        }

        // Cancel any pending removal timer
        if (roomManager.reconnectTimers && roomManager.reconnectTimers.has(playerId)) {
          clearTimeout(roomManager.reconnectTimers.get(playerId));
          roomManager.reconnectTimers.delete(playerId);
        }

        // Restore connection state
        existing.connected = true;
        existing.id = socket.id;
        roomManager.playerRooms.set(playerId, upperRoomId);

        socket.join(upperRoomId);

        callback({
          success: true,
          roomId: upperRoomId,
          reconnected: true,
          player: { name: existing.name, seatIndex: existing.seatIndex, team: existing.team },
          gameState: game.getStateForPlayer(playerId),
        });

        broadcastState(game);
        io.to(upperRoomId).emit('player_reconnected', {
          playerName: existing.name,
          seatIndex: existing.seatIndex,
        });

        console.log(`${existing.name} silently rejoined room ${upperRoomId} (seat ${existing.seatIndex})`);
      } catch (err) {
        callback({ success: false, error: err.message });
      }
    });

    // Leave a room
    socket.on('leave_room', (callback) => {
      try {
        const result = roomManager.leaveRoom(playerId);
        if (result.error) {
          callback({ success: false, error: result.error });
          return;
        }

        socket.leave(result.roomId);
        callback({ success: true });

        if (result.playersRemaining > 0) {
          broadcastState(result.game);
          io.to(result.roomId).emit('player_left', {
            playerName: result.player.name,
            seatIndex: result.player.seatIndex,
          });

          // Notify if admin role was transferred
          if (result.game.adminPlayerId && result.player) {
            const newAdmin = result.game.players.find(p => p.playerId === result.game.adminPlayerId);
            if (newAdmin) {
              io.to(result.roomId).emit('admin_changed', {
                newAdminName: newAdmin.name,
              });
            }
          }
        }
        
        console.log(`${result.player?.name} left room ${result.roomId}`);
      } catch (err) {
        callback({ success: false, error: err.message });
      }
    });

    // Choose / switch a seat in the lobby
    socket.on('choose_seat', ({ seatIndex }, callback) => {
      try {
        const game = roomManager.getRoomByPlayer(playerId);
        if (!game) { callback({ success: false, error: 'Not in a room' }); return; }
        if (game.phase !== 'waiting') { callback({ success: false, error: 'Game already started' }); return; }

        const result = game.chooseSeat(playerId, seatIndex);
        if (result.error) { callback({ success: false, error: result.error }); return; }

        callback({ success: true, seatIndex: result.player.seatIndex, team: result.player.team });

        broadcastState(game);
        io.to(game.roomId).emit('seat_changed', {
          playerName: result.player.name,
          seatIndex: result.player.seatIndex,
          team: result.player.team,
        });

        console.log(`${result.player.name} moved to seat ${seatIndex} in room ${game.roomId}`);
      } catch (err) {
        callback({ success: false, error: err.message });
      }
    });

    // Start the game (admin only, when 6 players are in)
    socket.on('start_game', (callback) => {
      try {
        const game = roomManager.getRoomByPlayer(playerId);
        if (!game) { callback({ success: false, error: 'Not in a room' }); return; }
        if (!game.isAdmin(playerId)) { callback({ success: false, error: 'Only the admin can start the game' }); return; }
        if (game.players.length < 6) { callback({ success: false, error: 'Need 6 players to start' }); return; }

        game.startRound();
        broadcastState(game);
        io.to(game.roomId).emit('round_started', {
          roundNumber: game.roundNumber,
          dealerIndex: game.dealerIndex,
        });

        callback({ success: true });
        console.log(`Game started in room ${game.roomId} (by admin)`);
      } catch (err) {
        callback({ success: false, error: err.message });
      }
    });

    // Admin kicks a player from the lobby
    socket.on('kick_player', ({ targetPlayerId }, callback) => {
      try {
        const result = roomManager.kickPlayer(playerId, targetPlayerId);
        if (result.error) { callback({ success: false, error: result.error }); return; }

        callback({ success: true });

        // Find the kicked player's socket and notify them directly
        const kicked = result.kicked;
        // Look up their socket id from the game's previous player list (already removed)
        // We need to find their socket in the io server
        const kickedSocketId = findSocketByPlayerId(io, targetPlayerId);
        if (kickedSocketId) {
          io.to(kickedSocketId).emit('you_were_kicked', {
            kickedBy: result.game.players.find(p => p.playerId === playerId)?.name || 'Admin',
          });
          // Remove them from the socket.io room
          const kickedSocket = io.sockets.sockets.get(kickedSocketId);
          if (kickedSocket) kickedSocket.leave(result.roomId);
        }

        // Broadcast to remaining players
        broadcastState(result.game);
        io.to(result.roomId).emit('player_kicked', {
          playerName: kicked.name,
          seatIndex: kicked.seatIndex,
        });

        console.log(`${kicked.name} was kicked from room ${result.roomId} by admin`);
      } catch (err) {
        callback({ success: false, error: err.message });
      }
    });

    // Place a bid
    socket.on('place_bid', ({ bidValue }, callback) => {
      try {
        const game = roomManager.getRoomByPlayer(playerId);
        if (!game) { callback({ success: false, error: 'Not in a room' }); return; }

        const player = game.players.find(p => p.playerId === playerId);
        if (!player) { callback({ success: false, error: 'Player not found' }); return; }

        const result = game.placeBid(player.seatIndex, bidValue);
        if (result.error) { callback({ success: false, error: result.error }); return; }

        callback({ success: true });
        broadcastState(game);
        io.to(game.roomId).emit('bid_placed', {
          seatIndex: player.seatIndex,
          playerName: player.name,
          bidValue,
          highestBid: game.biddingState.highestBid,
          highestBidder: game.biddingState.highestBidder,
          phase: game.phase,
        });
      } catch (err) {
        callback({ success: false, error: err.message });
      }
    });

    // Select trump suit
    socket.on('select_trump', ({ suit }, callback) => {
      try {
        const game = roomManager.getRoomByPlayer(playerId);
        if (!game) { callback({ success: false, error: 'Not in a room' }); return; }

        const player = game.players.find(p => p.playerId === playerId);
        const result = game.selectTrump(player.seatIndex, suit);
        if (result.error) { callback({ success: false, error: result.error }); return; }

        callback({ success: true });
        broadcastState(game);
        io.to(game.roomId).emit('trump_selected', { suit, selectedBy: player.name });
      } catch (err) {
        callback({ success: false, error: err.message });
      }
    });

    // Play a card
    socket.on('play_card', ({ cardId }, callback) => {
      try {
        const game = roomManager.getRoomByPlayer(playerId);
        if (!game) { callback({ success: false, error: 'Not in a room' }); return; }

        const player = game.players.find(p => p.playerId === playerId);
        const result = game.playCard(player.seatIndex, cardId);
        if (result.error) { callback({ success: false, error: result.error }); return; }

        callback({ success: true });

        io.to(game.roomId).emit('card_played', {
          seatIndex: player.seatIndex,
          playerName: player.name,
          cardId,
          card: game.currentTrick.length > 0
            ? game.currentTrick[game.currentTrick.length - 1]?.card
            : result.trickResult?.trick.find(t => t.seatIndex === player.seatIndex)?.card,
        });

        if (result.trickResult) {
          setTimeout(() => {
            io.to(game.roomId).emit('trick_resolved', result.trickResult);
            broadcastState(game);

            // After 3 more seconds, clear the last completed trick from all clients
            setTimeout(() => {
              game.lastCompletedTrick = null;
              io.to(game.roomId).emit('clear_last_trick');
              broadcastState(game);
            }, 3000);
          }, 1500);
        } else {
          broadcastState(game);
        }

        if (result.roundResult) {
          setTimeout(() => {
            io.to(game.roomId).emit('round_over', result.roundResult);
          }, 2000);
        }
      } catch (err) {
        callback({ success: false, error: err.message });
      }
    });

    // Start next round
    socket.on('next_round', (callback) => {
      try {
        const game = roomManager.getRoomByPlayer(playerId);
        if (!game) { callback({ success: false, error: 'Not in a room' }); return; }

        game.startRound();
        broadcastState(game);
        io.to(game.roomId).emit('round_started', {
          roundNumber: game.roundNumber,
          dealerIndex: game.dealerIndex,
        });

        callback({ success: true });
      } catch (err) {
        callback({ success: false, error: err.message });
      }
    });

    // Chat message
    socket.on('chat_message', ({ message }) => {
      const game = roomManager.getRoomByPlayer(playerId);
      if (!game) return;

      const chatMsg = game.addChatMessage(playerId, message);
      if (chatMsg) {
        io.to(game.roomId).emit('chat_message', chatMsg);
      }
    });

    // Get active rooms
    socket.on('get_rooms', (callback) => {
      callback(roomManager.getActiveRooms());
    });

    // Disconnect — mark inactive, start grace-period timer
    socket.on('disconnect', () => {
      console.log(`Player disconnected: socket=${socket.id} playerId=${playerId}`);
      const result = roomManager.handleDisconnect(playerId);
      if (result && result.game) {
        io.to(result.roomId).emit('player_disconnected', {
          playerName: result.player?.name,
          seatIndex: result.player?.seatIndex,
        });

        // Notify remaining connected players with updated state
        result.game.players.forEach(p => {
          if (p.connected) {
            io.to(p.id).emit('game_state', result.game.getStateForPlayer(p.playerId));
          }
        });
      }
    });
  });
}

module.exports = setupSocketHandlers;

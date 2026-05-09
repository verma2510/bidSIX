// socketHandler.js - Socket.io event handling for the card game

const roomManager = require('./game/RoomManager');
const { PHASES } = require('./game/GameEngine');

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
        socket.join(roomId);

        callback({
          success: true,
          roomId,
          player: { name: player.name, seatIndex: player.seatIndex, team: player.team },
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

        callback({
          success: true,
          roomId: upperRoomId,
          reconnected: !!reconnected,
          player: { name: player.name, seatIndex: player.seatIndex, team: player.team },
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

    // Start the game (when 6 players are in)
    socket.on('start_game', (callback) => {
      try {
        const game = roomManager.getRoomByPlayer(playerId);
        if (!game) { callback({ success: false, error: 'Not in a room' }); return; }
        if (game.players.length < 6) { callback({ success: false, error: 'Need 6 players to start' }); return; }

        game.startRound();
        broadcastState(game);
        io.to(game.roomId).emit('round_started', {
          roundNumber: game.roundNumber,
          dealerIndex: game.dealerIndex,
        });

        callback({ success: true });
        console.log(`Game started in room ${game.roomId}`);
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

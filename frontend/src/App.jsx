import { useEffect, useCallback, useRef } from 'react';
import { connectSocket, getSocket } from './socket';
import useGameStore, { clearSession } from './store/gameStore';
import Lobby from './components/Lobby';
import WaitingRoom from './components/WaitingRoom';
import GameTable from './components/GameTable';
import PlayerHand from './components/PlayerHand';
import BiddingPanel from './components/BiddingPanel';
import TrumpSelector from './components/TrumpSelector';
import Scoreboard from './components/Scoreboard';
import ChatPanel from './components/ChatPanel';
import RoundResult from './components/RoundResult';

function App() {
  const {
    connected,
    playerName,
    roomId,
    gameState,
    reconnecting,
    reconnectFailed,
    setConnected,
    setPlayerName,
    setRoomId,
    setMyPlayer,
    setGameState,
    setReconnecting,
    setReconnectFailed,
    addNotification,
    resetGame,
  } = useGameStore();

  // Track whether we already attempted a rejoin this session
  const rejoinAttempted = useRef(false);

  // ---- Rejoin helper (called on connect if a saved session exists) ----
  const attemptRejoin = useCallback((socket) => {
    const store = useGameStore.getState();
    const savedRoomId = store.roomId;
    const savedName = store.playerName;

    if (!savedRoomId) {
      setReconnecting(false);
      return;
    }

    setReconnecting(true);
    setReconnectFailed(false);

    // Try the dedicated rejoin_room event first
    socket.emit('rejoin_room', { roomId: savedRoomId }, (response) => {
      if (response && response.success) {
        setRoomId(response.roomId);
        setMyPlayer(response.player);
        if (response.gameState) setGameState(response.gameState);
        setReconnecting(false);
        addNotification('Reconnected successfully!', 'success');
      } else {
        // Rejoin failed — try join_room as fallback (covers name change, etc.)
        if (savedName) {
          socket.emit('join_room', { roomId: savedRoomId, playerName: savedName }, (resp2) => {
            if (resp2 && resp2.success) {
              setRoomId(resp2.roomId);
              setMyPlayer(resp2.player);
              if (resp2.gameState) setGameState(resp2.gameState);
              setReconnecting(false);
              addNotification(resp2.reconnected ? 'Reconnected!' : 'Rejoined room!', 'success');
            } else {
              // Both attempts failed — session is stale, clear it
              setReconnecting(false);
              setReconnectFailed(true);
              clearSession();
              resetGame();
              addNotification('Session expired. Please rejoin.', 'warning');
            }
          });
        } else {
          setReconnecting(false);
          setReconnectFailed(true);
          clearSession();
          resetGame();
          addNotification('Session expired. Please rejoin.', 'warning');
        }
      }
    });
  }, []);

  useEffect(() => {
    const socket = connectSocket();

    socket.on('connect', () => {
      setConnected(true);

      // Attempt rejoin when socket (re)connects and we have a saved session
      const store = useGameStore.getState();
      if (store.roomId && !rejoinAttempted.current) {
        rejoinAttempted.current = true;
        attemptRejoin(socket);
      } else if (store.roomId) {
        // Subsequent reconnects (network blips) — always try to rejoin
        attemptRejoin(socket);
      }
    });

    socket.on('disconnect', () => {
      setConnected(false);
      // If we had a room, mark as reconnecting so we show overlay instead of lobby
      const store = useGameStore.getState();
      if (store.roomId) {
        setReconnecting(true);
      }
    });

    socket.on('game_state', setGameState);

    socket.on('player_joined', (data) => addNotification(`${data.playerName} joined (Team ${data.team}, Seat ${data.seatIndex + 1})`, 'info'));
    socket.on('player_disconnected', (data) => addNotification(`${data.playerName} disconnected`, 'warning'));
    socket.on('bid_placed', (data) => addNotification(`${data.playerName} ${data.bidValue === 'pass' ? 'passed' : `bid ${data.bidValue}`}`, 'info'));
    socket.on('trump_selected', (data) => {
      const suitSymbol = data.suit === 'hearts' ? '♥' : data.suit === 'diamonds' ? '♦' : data.suit === 'clubs' ? '♣' : '♠';
      addNotification(`${data.selectedBy} selected ${suitSymbol} as trump!`, 'success');
    });
    socket.on('trick_resolved', (data) => addNotification(`Trick won by Team ${data.winnerTeam}`, 'success'));
    socket.on('round_started', (data) => addNotification(`Round ${data.roundNumber} started!`, 'info'));
    socket.on('player_reconnected', (data) => addNotification(`${data.playerName} reconnected!`, 'success'));
    socket.on('player_left', (data) => addNotification(`${data.playerName} left the room`, 'warning'));

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('game_state');
      socket.off('player_joined');
      socket.off('player_disconnected');
      socket.off('bid_placed');
      socket.off('trump_selected');
      socket.off('trick_resolved');
      socket.off('round_started');
      socket.off('player_reconnected');
      socket.off('player_left');
    };
  }, []);

  const handleCreateRoom = useCallback((name) => {
    getSocket().emit('create_room', { playerName: name }, (response) => {
      if (response.success) {
        setRoomId(response.roomId);
        setMyPlayer(response.player);
        // Game state arrives directly in the callback — no second round-trip
        if (response.gameState) setGameState(response.gameState);
        addNotification(`Room ${response.roomId} created!`, 'success');
      } else {
        addNotification(response.error, 'error');
      }
    });
  }, []);

  const handleJoinRoom = useCallback((code, name) => {
    getSocket().emit('join_room', { roomId: code, playerName: name }, (response) => {
      if (response.success) {
        setRoomId(response.roomId);
        setMyPlayer(response.player);
        if (response.gameState) setGameState(response.gameState);
        addNotification(`Joined room ${response.roomId}!`, 'success');
      } else {
        addNotification(response.error, 'error');
      }
    });
  }, []);

  const handleStartGame = useCallback(() => {
    getSocket().emit('start_game', (response) => {
      if (!response.success) addNotification(response.error, 'error');
    });
  }, []);

  const handleBid = useCallback((bidValue) => {
    getSocket().emit('place_bid', { bidValue }, (response) => {
      if (!response.success) addNotification(response.error, 'error');
    });
  }, []);

  const handleSelectTrump = useCallback((suit) => {
    getSocket().emit('select_trump', { suit }, (response) => {
      if (!response.success) addNotification(response.error, 'error');
    });
  }, []);

  const handlePlayCard = useCallback((cardId) => {
    getSocket().emit('play_card', { cardId }, (response) => {
      if (!response.success) addNotification(response.error, 'error');
    });
  }, []);

  const handleNextRound = useCallback(() => {
    getSocket().emit('next_round', (response) => {
      if (!response.success) addNotification(response.error, 'error');
    });
  }, []);

  const handleSendMessage = useCallback((message) => {
    getSocket().emit('chat_message', { message });
  }, []);

  const handleLeaveRoom = useCallback(() => {
    getSocket().emit('leave_room', (response) => {
      if (response.success) {
        clearSession();
        resetGame();
        addNotification('You left the room', 'info');
      } else {
        addNotification(response.error, 'error');
      }
    });
  }, [resetGame, addNotification]);

  const phase = gameState?.phase;
  const isInRoom = !!roomId;
  const isWaiting = phase === 'waiting' || !phase;
  const isBidding = phase === 'bidding';
  const isTrumpSelection = phase === 'trump_selection';
  const isPlaying = phase === 'playing';
  const isRoundOver = phase === 'round_over';

  // Inside the return statement, pass handleLeaveRoom to WaitingRoom
  // (We'll also add player_left to the useEffect above)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden flex flex-col relative selection:bg-indigo-500/30">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-slate-800/30 rounded-full blur-[120px]"></div>
      </div>

      {/* Connection indicator */}
      <div className={`fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 text-xs font-bold shadow-lg ${connected ? 'text-emerald-400 border-emerald-500/30' : 'text-rose-400 border-rose-500/30'}`}>
        <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
        {connected ? (reconnecting ? 'Reconnecting...' : 'Connected') : 'Connecting...'}
      </div>

      {/* Reconnecting overlay */}
      {reconnecting && (
        <div className="fixed inset-0 z-[300] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-white mb-1">Reconnecting...</h2>
            <p className="text-slate-400 text-sm">Restoring your session</p>
          </div>
        </div>
      )}

      {/* Notifications */}
      <div className="fixed top-20 right-4 z-[200] flex flex-col gap-2 pointer-events-none max-w-sm">
        {useGameStore.getState().notifications.map((notif) => (
          <div key={notif.id} className={`px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-md font-bold text-sm text-white animate-in slide-in-from-right-8 fade-in ${notif.type === 'error' ? 'bg-rose-900/90 border-rose-500' :
              notif.type === 'success' ? 'bg-emerald-900/90 border-emerald-500' :
                notif.type === 'warning' ? 'bg-amber-900/90 border-amber-500 text-amber-100' :
                  'bg-slate-800/90 border-slate-600'
            }`}>
            {notif.message}
          </div>
        ))}
      </div>

      {/* Main content */}
      {!isInRoom ? (
        <Lobby onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} playerName={playerName} setPlayerName={setPlayerName} />
      ) : isWaiting ? (
        <WaitingRoom gameState={gameState} roomId={roomId} onStartGame={handleStartGame} onLeaveRoom={handleLeaveRoom} />
      ) : (
        <div className="flex-1 flex flex-col relative z-10">
          {/* Top bar (Single Line Responsive) */}
          <div className="h-auto min-h-10 sm:min-h-12 landscape:min-h-10 md:h-20 py-1 md:py-0 bg-slate-900/60 backdrop-blur-xl border-b border-white/5 px-1 sm:px-2 md:px-8 flex flex-row flex-wrap md:flex-nowrap items-center justify-between gap-1 z-40 shadow-sm w-full">

            {/* 1. Room & Round */}
            <div className="flex items-center gap-1 sm:gap-2 md:gap-6 shrink-0 order-1">
              <span className="px-1.5 py-1 md:px-3 md:py-1.5 bg-slate-950/50 rounded flex items-center border border-slate-800 shadow-inner">
                <span className="hidden md:inline text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">Room</span>
                <span className="text-white font-mono text-[9px] sm:text-[10px] md:text-sm tracking-widest">{roomId}</span>
              </span>
              <span className="px-1.5 py-1 md:px-3 md:py-1.5 bg-indigo-950/50 text-indigo-300 border border-indigo-900/50 rounded text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-widest shadow-inner">
                <span className="md:hidden">R{gameState?.roundNumber || 0}</span>
                <span className="hidden md:inline">Round {gameState?.roundNumber || 0}</span>
              </span>
            </div>

            {/* 3. Turn Indicator (Order 2 on Mobile/Desktop) */}
            <div className="flex-1 flex justify-center shrink-0 min-w-0 order-2">
              <div className="hidden md:flex">
                {phase === 'playing' && gameState?.currentPlayerIndex === gameState?.mySeat && (
                  <div className="px-6 py-1.5 bg-amber-500 text-amber-950 rounded-full text-sm font-black tracking-widest uppercase animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.4)] border-2 border-amber-300">
                    🎯 Your Turn
                  </div>
                )}
                {phase === 'bidding' && gameState?.biddingState?.currentBidderIndex === gameState?.mySeat && (
                  <div className="px-6 py-1.5 bg-amber-500 text-amber-950 rounded-full text-sm font-black tracking-widest uppercase animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.4)] border-2 border-amber-300">
                    🎯 Your Turn to Bid
                  </div>
                )}
              </div>
              <div className="flex md:hidden">
                {phase === 'playing' && gameState?.currentPlayerIndex === gameState?.mySeat && (
                  <span className="text-amber-400 animate-pulse text-lg" title="Your Turn">🎯</span>
                )}
                {phase === 'bidding' && gameState?.biddingState?.currentBidderIndex === gameState?.mySeat && (
                  <span className="text-amber-400 animate-pulse text-lg" title="Your Turn to Bid">🎯</span>
                )}
              </div>
            </div>

            {/* 4. Scoreboard & Chat Icons (Order 3) */}
            <div className="flex items-center gap-1 md:gap-4 shrink-0 order-3">
              <Scoreboard />
              <ChatPanel onSendMessage={handleSendMessage} />
            </div>

            {/* 2. Bottom Row (Mobile Only): Trick, Bid, Trump, You - Wraps to new line because of w-full */}
            <div className="flex md:hidden items-center justify-center gap-1 shrink-0 w-full order-last mt-0.5 overflow-x-auto [&::-webkit-scrollbar]:hidden pb-0.5">
              {phase === 'playing' && (
                <div className="flex items-center gap-1 text-[10px] font-bold">
                  {gameState.trumpSuit && (
                    <span className="bg-slate-50 text-slate-900 px-1 py-0.5 rounded border border-slate-300 flex items-center gap-0.5 shrink-0">
                      Trump <span className={gameState.trumpSuit === 'hearts' || gameState.trumpSuit === 'diamonds' ? 'text-red-500' : 'text-slate-800'}>
                        {gameState.trumpSuit === 'hearts' ? '♥' : gameState.trumpSuit === 'diamonds' ? '♦' : gameState.trumpSuit === 'clubs' ? '♣' : '♠'}
                      </span>
                    </span>
                  )}
                  <span className="bg-white text-slate-900 px-1 py-0.5 rounded border border-slate-300 shrink-0">
                    You: {gameState.players?.find(p => p.seatIndex === gameState.mySeat)?.name || 'Empty'}
                  </span>
                  <span className="bg-slate-950/50 px-1 py-0.5 rounded border border-slate-800 text-indigo-400 flex gap-0.5 shrink-0">A:<span className="text-white">{gameState.trickCount?.A || 0}</span></span>
                  <span className="bg-slate-950/50 px-1 py-0.5 rounded border border-slate-800 text-rose-400 flex gap-0.5 shrink-0">B:<span className="text-white">{gameState.trickCount?.B || 0}</span></span>
                  {gameState.biddingState?.highestBidder !== null && (
                    <span className="text-amber-400 bg-slate-950/50 px-1 py-0.5 rounded border border-slate-800 flex gap-0.5 shrink-0">Bid:<span className="text-white">{gameState.biddingState.highestBid}</span></span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 relative overflow-hidden">
            <GameTable />

            {isBidding && <BiddingPanel onBid={handleBid} />}
            {isTrumpSelection && <TrumpSelector onSelect={handleSelectTrump} isMyTurn={gameState?.currentPlayerIndex === gameState?.mySeat} />}

            {(isPlaying || isBidding || isTrumpSelection) && (
              <PlayerHand cards={gameState?.myHand} onPlayCard={handlePlayCard} isMyTurn={isPlaying && gameState?.currentPlayerIndex === gameState?.mySeat} leadSuit={gameState?.leadSuit} trumpSuit={gameState?.trumpSuit} />
            )}

            {isRoundOver && gameState?.roundHistory?.length > 0 && (
              <RoundResult roundResult={gameState.roundHistory[gameState.roundHistory.length - 1]} onNextRound={handleNextRound} onLeaveRoom={handleLeaveRoom} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
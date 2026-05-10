export default function WaitingRoom({ gameState, roomId, onStartGame, onLeaveRoom }) {
  if (!gameState) return null;

  const { players } = gameState;
  const playerCount = players.length;
  const canStart = playerCount === 6;

  const seats = Array.from({ length: 6 }, (_, i) => {
    const player = players.find(p => p.seatIndex === i);
    return { index: i, team: i % 2 === 0 ? 'A' : 'B', player: player || null };
  });

  return (
    <div className="h-screen bg-slate-950 flex flex-col text-slate-200 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-rose-600/10 rounded-full blur-[120px]"></div>
      </div>

      {/* ── Header bar ── */}
      <div className="relative z-10 flex-shrink-0 flex flex-row items-center justify-between gap-2 px-3 py-2 md:px-8 md:py-4 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 shadow-lg">
        {/* Title */}
        <h2 className="text-base sm:text-xl md:text-2xl font-black text-white flex items-center gap-2">
          <span className="text-xl md:text-3xl">🎮</span>
          <span className="hidden sm:inline">Game Lobby</span>
        </h2>

        <div className="flex items-center gap-2">
          {/* Leave Button */}
          <button
            onClick={onLeaveRoom}
            className="px-2 py-1 sm:px-3 sm:py-1.5 bg-rose-950/50 hover:bg-rose-900/80 text-rose-400 hover:text-rose-300 border border-rose-900/50 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5"
            title="Leave Room"
          >
            <span>🚪</span>
            <span>Leave</span>
          </button>

        {/* Room code + copy */}
        <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5">
          <div>
            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-0.5">Room</div>
            <div className="text-lg sm:text-2xl font-mono tracking-widest font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent leading-none">
              {roomId}
            </div>
          </div>
          <button
            className="w-8 h-8 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all flex items-center justify-center hover:scale-105 active:scale-95"
            onClick={() => navigator.clipboard.writeText(roomId)}
            title="Copy room code"
          >
            <span className="text-sm">📋</span>
          </button>
        </div>
        </div>

        {/* Player count */}
        <div className="text-center px-3 py-1.5 bg-slate-800/50 rounded-xl border border-slate-700/50 flex-shrink-0">
          <div className="text-xl sm:text-2xl font-black text-white leading-none">
            {playerCount}<span className="text-slate-600 text-sm">/6</span>
          </div>
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Players</div>
        </div>
      </div>

      {/* ── Seat grid ── fills remaining space */}
      <div className="relative z-10 flex-1 min-h-0 p-2 sm:p-3 md:p-6">
        <div className="h-full grid grid-cols-3 landscape:grid-cols-6 md:grid-cols-3 gap-1.5 sm:gap-2 md:gap-4">
          {seats.map(seat => {
            const isTeamA = seat.team === 'A';
            return (
              <div
                key={seat.index}
                className={`relative rounded-xl sm:rounded-2xl border flex flex-col items-center justify-center overflow-hidden transition-all duration-300 ${
                  seat.player
                    ? (isTeamA ? 'bg-indigo-950/40 border-indigo-500/40' : 'bg-rose-950/40 border-rose-500/40')
                    : 'bg-slate-900/50 border-slate-800 border-dashed'
                }`}
              >
                {/* Top color bar */}
                {seat.player && (
                  <div className={`absolute top-0 left-0 right-0 h-1 ${isTeamA ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-gradient-to-r from-rose-500 to-orange-500'}`}></div>
                )}

                {/* Team / Seat badges */}
                <div className="absolute top-1.5 left-1.5 right-1.5 flex justify-between items-center">
                  <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                    isTeamA ? 'bg-indigo-900/50 text-indigo-300 border-indigo-700/50' : 'bg-rose-900/50 text-rose-300 border-rose-700/50'
                  }`}>
                    T{seat.team}
                  </span>
                  <span className="text-[8px] font-bold text-slate-500">S{seat.index + 1}</span>
                </div>

                {/* Player info */}
                {seat.player ? (
                  <div className="flex flex-col items-center gap-1 pt-4 pb-1 px-1">
                    <div className="relative">
                      <div className={`w-9 h-9 sm:w-11 sm:h-11 md:w-14 md:h-14 rounded-full flex items-center justify-center text-base sm:text-lg md:text-2xl font-black text-white shadow-lg ${
                        isTeamA ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gradient-to-br from-rose-500 to-orange-600'
                      }`}>
                        {seat.player.name.charAt(0).toUpperCase()}
                      </div>
                      {seat.player.isMe && (
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1 py-px bg-amber-500 text-amber-950 text-[7px] font-black uppercase rounded">
                          You
                        </div>
                      )}
                    </div>
                    <div className="font-bold text-white text-[10px] sm:text-xs text-center truncate w-full px-1 leading-tight mt-1">
                      {seat.player.name}
                    </div>
                    <div className="flex items-center gap-1">
                      {seat.player.connected ? (
                        <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span><span className="text-[8px] text-emerald-400 font-bold">Online</span></>
                      ) : (
                        <><span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span><span className="text-[8px] text-slate-500 font-bold">Offline</span></>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 opacity-40 pt-4 pb-1">
                    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 border-slate-700 border-dashed flex items-center justify-center text-slate-600 text-lg">?</div>
                    <div className="text-slate-500 font-medium text-[9px]">Waiting...</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Start / Waiting button ── */}
      <div className="relative z-10 flex-shrink-0 flex justify-center items-center px-4 py-2 md:py-4">
        {canStart ? (
          <button
            className="px-8 py-3 md:px-12 md:py-5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-2xl font-black text-base md:text-xl shadow-[0_10px_40px_rgba(16,185,129,0.4)] transition-all hover:-translate-y-1 active:translate-y-0 animate-bounce group"
            onClick={onStartGame}
          >
            <span className="flex items-center gap-3">
              <span className="text-xl md:text-3xl group-hover:rotate-12 transition-transform">🚀</span>
              Start Game Now
            </span>
          </button>
        ) : (
          <div className="flex items-center gap-3 text-slate-300 bg-slate-900/80 backdrop-blur border border-slate-700/50 px-5 py-3 rounded-2xl shadow-lg text-sm md:text-base">
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
            <span className="font-medium">Waiting for <strong className="text-indigo-400">{6 - playerCount}</strong> more player{6 - playerCount !== 1 ? 's' : ''}...</span>
          </div>
        )}
      </div>
    </div>
  );
}

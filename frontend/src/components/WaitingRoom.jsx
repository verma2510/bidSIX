import { useState, useEffect, useCallback } from 'react';

export default function WaitingRoom({ gameState, roomId, onStartGame, onLeaveRoom, onChooseSeat, onKickPlayer }) {
  const [pendingSeat, setPendingSeat] = useState(null);
  const [copied, setCopied]           = useState(false);

  // Auto-clear the pending indicator after 4 s (safety net)
  useEffect(() => {
    if (pendingSeat === null) return;
    const t = setTimeout(() => setPendingSeat(null), 4000);
    return () => clearTimeout(t);
  }, [pendingSeat]);

  // Called when the player clicks a seat card or its CTA button
  const handleSeatClick = useCallback((targetSeat, currentMySeat) => {
    if (targetSeat === currentMySeat) return;
    if (pendingSeat !== null) return;

    setPendingSeat(targetSeat);

    onChooseSeat(targetSeat, (success) => {
      if (success) {
        setPendingSeat(null);
      } else {
        setTimeout(() => setPendingSeat(null), 1000);
      }
    });
  }, [pendingSeat, onChooseSeat]);

  // ─── All hooks are above this line ───

  if (!gameState) return null;

  const { players } = gameState;
  const playerCount = players.length;
  const canStart    = playerCount === 6;

  const mySeat   = gameState.mySeat;
  const myPlayer = players.find(p => p.isMe);
  const imAdmin  = !!gameState.imAdmin;

  // Build the 6-seat grid
  const seats = gameState.seats
    ? gameState.seats
    : Array.from({ length: 6 }, (_, i) => {
        const p = players.find(pl => pl.seatIndex === i);
        return { seatIndex: i, team: i % 2 === 0 ? 'A' : 'B', player: p || null, locked: false, lockedByMe: false };
      });

  const handleCopy = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  // ─── styling helpers ──────────────────────────────────────────────────────
  const teamGradient = (t) => t === 'A' ? 'from-indigo-500 to-purple-600' : 'from-rose-500 to-orange-600';
  const teamBorder   = (t) => t === 'A' ? 'border-indigo-500/40'          : 'border-rose-500/40';
  const teamBg       = (t) => t === 'A' ? 'bg-indigo-950/40'              : 'bg-rose-950/40';
  const teamBarGrad  = (t) => t === 'A' ? 'from-indigo-500 to-purple-500' : 'from-rose-500 to-orange-500';
  const teamBadge    = (t) => t === 'A'
    ? 'bg-indigo-900/50 text-indigo-300 border-indigo-700/50'
    : 'bg-rose-900/50 text-rose-300 border-rose-700/50';

  return (
    <div className="h-screen bg-slate-950 flex flex-col text-slate-200 relative overflow-hidden">

      {/* ── Ambient glow ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%]  w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-rose-600/10   rounded-full blur-[120px]" />
      </div>

      {/* ── Header ── */}
      <div className="relative z-10 flex-shrink-0 flex flex-row items-center justify-between gap-2 px-3 py-2 md:px-8 md:py-4 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 shadow-lg">

        <h2 className="text-base sm:text-xl md:text-2xl font-black text-white flex items-center gap-2">
          <span className="text-xl md:text-3xl">🎮</span>
          <span className="hidden sm:inline">Game Lobby</span>
          {imAdmin && (
            <span className="ml-1 px-1.5 py-0.5 bg-amber-500/20 border border-amber-500/40 rounded text-[9px] text-amber-300 font-bold uppercase tracking-wider">
              👑 Admin
            </span>
          )}
        </h2>

        <div className="flex items-center gap-2">
          {/* Leave */}
          <button
            onClick={onLeaveRoom}
            className="px-2 py-1 sm:px-3 sm:py-1.5 bg-rose-950/50 hover:bg-rose-900/80 text-rose-400 hover:text-rose-300 border border-rose-900/50 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5"
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
              className={`w-8 h-8 border rounded-lg transition-all flex items-center justify-center hover:scale-105 active:scale-95 text-sm ${copied ? 'bg-emerald-700 border-emerald-500 text-white' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'}`}
              onClick={handleCopy}
              title={copied ? 'Copied!' : 'Copy room code'}
            >
              {copied ? '✓' : '📋'}
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

      {/* ── Team legend / your seat indicator ── */}
      <div className="relative z-10 flex-shrink-0 flex flex-wrap items-center justify-center gap-3 py-1.5 bg-slate-900/40 border-b border-slate-800/60 text-[10px] font-bold">
        <span className="flex items-center gap-1.5 text-indigo-300">
          <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-br from-indigo-500 to-purple-600 inline-block" />
          Team A – Seats 1, 3, 5
        </span>
        <span className="w-px h-3 bg-slate-700" />
        <span className="flex items-center gap-1.5 text-rose-300">
          <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-br from-rose-500 to-orange-600 inline-block" />
          Team B – Seats 2, 4, 6
        </span>
        {mySeat !== null && mySeat !== undefined && (
          <>
            <span className="w-px h-3 bg-slate-700" />
            <span className="flex items-center gap-1.5 text-amber-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block animate-pulse" />
              You: Seat {mySeat + 1} · {myPlayer?.team === 'A' ? 'Team A' : 'Team B'}
              <span className="text-slate-500 font-normal">(click any open seat to move)</span>
            </span>
          </>
        )}
      </div>

      {/* ── Seat grid ── */}
      <div className="relative z-10 flex-1 min-h-0 p-2 sm:p-3 md:p-6">
        <div className="h-full grid grid-cols-3 landscape:grid-cols-6 md:grid-cols-3 gap-1.5 sm:gap-2 md:gap-4">
          {seats.map(seat => {
            const isMyCurrentSeat = seat.seatIndex === mySeat;
            const occupied        = !!seat.player && !isMyCurrentSeat;
            const isPending       = pendingSeat === seat.seatIndex;
            const isLockedByOther = seat.locked && !isMyCurrentSeat && !isPending;
            const canClick        = !isMyCurrentSeat && !occupied && !isLockedByOther && !isPending && pendingSeat === null;

            // Admin-related: determine if this seat's occupant is the admin
            const seatPlayerIsAdmin = seat.player?.isAdmin;
            // Admin can kick any non-admin occupied seat
            const canKick = imAdmin && occupied && !seatPlayerIsAdmin;

            return (
              <div
                key={seat.seatIndex}
                className={`relative rounded-xl sm:rounded-2xl border flex flex-col items-center justify-center overflow-hidden transition-all duration-300 select-none
                  ${isMyCurrentSeat
                    ? 'bg-amber-950/30 border-amber-500/50 ring-2 ring-amber-500/30'
                    : occupied
                      ? `${teamBg(seat.team)} ${teamBorder(seat.team)}`
                      : isPending || isLockedByOther
                        ? 'bg-slate-900/50 border-slate-700 border-dashed opacity-60'
                        : 'bg-slate-900/50 border-slate-800 border-dashed hover:border-slate-600 hover:bg-slate-900/80 group'
                  } ${canClick ? 'cursor-pointer' : 'cursor-default'}`}
                onClick={() => canClick && handleSeatClick(seat.seatIndex, mySeat)}
              >
                {/* Top accent bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${teamBarGrad(seat.team)} ${isMyCurrentSeat || (occupied && seat.player) ? 'opacity-100' : 'opacity-0'}`} />

                {/* Lock / claiming shimmer */}
                {(isPending || isLockedByOther) && (
                  <div className="absolute inset-0 bg-slate-800/40 backdrop-blur-[1px] flex items-center justify-center z-10">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-4 h-4 border-2 border-slate-500 border-t-slate-200 rounded-full animate-spin" />
                      <span className="text-[8px] text-slate-300 font-bold uppercase tracking-wider">
                        {isPending ? 'Moving…' : 'Reserved'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Team / Seat badges */}
                <div className="absolute top-1.5 left-1.5 right-1.5 flex justify-between items-center z-20">
                  <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${teamBadge(seat.team)}`}>
                    T{seat.team}
                  </span>
                  <div className="flex items-center gap-1">
                    {seatPlayerIsAdmin && <span className="text-[10px]" title="Room Admin">👑</span>}
                    <span className="text-[8px] font-bold text-slate-500">S{seat.seatIndex + 1}</span>
                  </div>
                </div>

                {/* ── My current seat ── */}
                {isMyCurrentSeat && myPlayer && (
                  <div className="flex flex-col items-center gap-1 pt-5 pb-1 px-1 z-20">
                    <div className="relative">
                      <div className={`w-9 h-9 sm:w-11 sm:h-11 md:w-14 md:h-14 rounded-full flex items-center justify-center text-base sm:text-lg md:text-2xl font-black text-white shadow-lg bg-gradient-to-br ${teamGradient(myPlayer.team || seat.team)}`}>
                        {myPlayer.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1 py-px bg-amber-500 text-amber-950 text-[7px] font-black uppercase rounded whitespace-nowrap">
                        You{imAdmin ? ' · Admin' : ''}
                      </div>
                    </div>
                    <div className="font-bold text-white text-[10px] sm:text-xs text-center truncate w-full px-1 leading-tight mt-2">
                      {myPlayer.name}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[8px] text-emerald-400 font-bold">Online</span>
                    </div>
                    <div className="mt-0.5 px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 rounded text-[8px] text-amber-300 font-bold uppercase tracking-wider">
                      {imAdmin ? '👑 Your Seat' : 'Your Seat'}
                    </div>
                  </div>
                )}

                {/* ── Another player's seat ── */}
                {occupied && seat.player && (
                  <div className="flex flex-col items-center gap-1 pt-5 pb-1 px-1 z-20">
                    <div className="relative">
                      <div className={`w-9 h-9 sm:w-11 sm:h-11 md:w-14 md:h-14 rounded-full flex items-center justify-center text-base sm:text-lg md:text-2xl font-black text-white shadow-lg bg-gradient-to-br ${teamGradient(seat.team)}`}>
                        {seat.player.name.charAt(0).toUpperCase()}
                      </div>
                      {seatPlayerIsAdmin && (
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1 py-px bg-amber-500 text-amber-950 text-[7px] font-black uppercase rounded whitespace-nowrap">
                          Admin
                        </div>
                      )}
                    </div>
                    <div className="font-bold text-white text-[10px] sm:text-xs text-center truncate w-full px-1 leading-tight mt-1">
                      {seat.player.name}
                    </div>
                    <div className="flex items-center gap-1">
                      {seat.player.connected !== false ? (
                        <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /><span className="text-[8px] text-emerald-400 font-bold">Online</span></>
                      ) : (
                        <><span className="w-1.5 h-1.5 rounded-full bg-slate-600" /><span className="text-[8px] text-slate-500 font-bold">Offline</span></>
                      )}
                    </div>
                    {/* Kick button — admin only, non-admin players */}
                    {canKick && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onKickPlayer(seat.player.playerId); }}
                        className="mt-0.5 px-2 py-0.5 bg-rose-900/60 hover:bg-rose-800/80 border border-rose-700/50 rounded text-[8px] text-rose-300 hover:text-rose-200 font-bold uppercase tracking-wider transition-colors"
                        title={`Kick ${seat.player.name}`}
                      >
                        ✕ Kick
                      </button>
                    )}
                  </div>
                )}

                {/* ── Empty seat ── */}
                {!isMyCurrentSeat && !occupied && (
                  <div className="flex flex-col items-center gap-1.5 pt-5 pb-2 px-2 w-full z-20">
                    <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 border-dashed flex items-center justify-center text-lg transition-colors ${canClick ? 'border-slate-600 text-slate-500 group-hover:border-slate-400 group-hover:text-slate-300' : 'border-slate-700 text-slate-700'}`}>
                      +
                    </div>
                    <div className={`font-medium text-[9px] transition-colors ${canClick ? 'text-slate-500 group-hover:text-slate-300' : 'text-slate-600'}`}>
                      Open
                    </div>
                    {canClick && (
                      <button
                        className={`mt-0.5 w-full px-1 py-1 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-white shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0 bg-gradient-to-r ${teamGradient(seat.team)} opacity-0 group-hover:opacity-100`}
                        onClick={(e) => { e.stopPropagation(); handleSeatClick(seat.seatIndex, mySeat); }}
                      >
                        {mySeat !== null && mySeat !== undefined ? 'Move Here' : 'Take Seat'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Footer: Start / Waiting ── */}
      <div className="relative z-10 flex-shrink-0 flex justify-center items-center px-4 py-2 md:py-4">
        {canStart && imAdmin ? (
          <button
            className="px-8 py-3 md:px-12 md:py-5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-2xl font-black text-base md:text-xl shadow-[0_10px_40px_rgba(16,185,129,0.4)] transition-all hover:-translate-y-1 active:translate-y-0 animate-bounce group"
            onClick={onStartGame}
          >
            <span className="flex items-center gap-3">
              <span className="text-xl md:text-3xl group-hover:rotate-12 transition-transform">🚀</span>
              Start Game Now
            </span>
          </button>
        ) : canStart && !imAdmin ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3 text-amber-300 bg-amber-950/40 backdrop-blur border border-amber-700/50 px-5 py-3 rounded-2xl shadow-lg text-sm md:text-base">
              <span className="text-lg">👑</span>
              <span className="font-medium">Waiting for the admin to start the game…</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3 text-slate-300 bg-slate-900/80 backdrop-blur border border-slate-700/50 px-5 py-3 rounded-2xl shadow-lg text-sm md:text-base">
              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <span className="font-medium">
                Waiting for <strong className="text-indigo-400">{6 - playerCount}</strong> more player{6 - playerCount !== 1 ? 's' : ''}…
              </span>
            </div>
            {(mySeat === null || mySeat === undefined) && (
              <p className="text-[10px] text-amber-400 font-bold animate-pulse">👆 Click any seat above to join!</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

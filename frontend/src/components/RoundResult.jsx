export default function RoundResult({ roundResult, onNextRound, onLeaveRoom }) {
  if (!roundResult) return null;

  const {
    bidderName, biddingTeam, bidValue, isForcedBid, tricksWon,
    biddingTeamWon, pointsThisRound, raisedOn, raisedPoints, shufflerFlipped,
  } = roundResult;

  const isTeamA = biddingTeam === 'A';
  const losingTeam = raisedOn;
  const losingPoints = raisedPoints ?? 0;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-3 landscape:p-2 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl sm:rounded-3xl w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] landscape:max-h-[92vh]">

        {/* Header */}
        <div className={`px-4 py-3 landscape:py-2 sm:p-8 text-center relative overflow-hidden flex-shrink-0 ${biddingTeamWon ? 'bg-gradient-to-br from-emerald-600/20 to-emerald-900/40 border-b border-emerald-500/30' : 'bg-gradient-to-br from-red-600/20 to-red-900/40 border-b border-red-500/30'}`}>
          <div className={`absolute top-0 left-0 right-0 h-1.5 ${biddingTeamWon ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
          <div className="text-3xl landscape:text-2xl sm:text-6xl mb-1 landscape:mb-0.5 sm:mb-4 drop-shadow-lg animate-bounce">{biddingTeamWon ? '🎉' : '💀'}</div>
          <h2 className={`text-lg landscape:text-base sm:text-3xl font-black mb-0.5 ${biddingTeamWon ? 'text-emerald-400' : 'text-red-400'}`}>
            {biddingTeamWon ? 'Bid Won!' : 'Bid Failed!'}
          </h2>
          <p className="text-slate-300 text-xs">
            <strong className="text-white bg-slate-800/50 px-1.5 py-0.5 rounded">{bidderName}</strong>{' '}
            {biddingTeamWon ? 'successfully made' : 'failed to make'} the bid for Team {biddingTeam}.
          </p>
        </div>

        {/* Stats */}
        <div className="px-4 py-2 landscape:py-1.5 sm:p-6 overflow-y-auto flex-1">
          <div className="bg-slate-950/80 rounded-xl sm:rounded-2xl p-3 landscape:p-2 sm:p-5 border border-slate-800 mb-3 landscape:mb-2 sm:mb-6 shadow-inner">
            <div className="flex justify-between items-center mb-2.5 pb-2.5 border-b border-slate-800/80">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] sm:text-xs">Bid Target</span>
              <span className="text-white font-black text-base sm:text-xl flex items-center gap-2">
                {bidValue}
                {isForcedBid && <span className="bg-amber-500/20 text-amber-500 text-[9px] sm:text-[10px] uppercase px-1.5 py-0.5 rounded border border-amber-500/30">Forced</span>}
              </span>
            </div>
            <div className="flex justify-between items-center mb-2.5 pb-2.5 border-b border-slate-800/80">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] sm:text-xs">Tricks Won</span>
              <div className="flex items-center gap-2 sm:gap-3">
                <span className={`font-black text-base sm:text-xl ${isTeamA ? 'text-indigo-400' : 'text-slate-500'}`}>{tricksWon.A}</span>
                <span className="text-slate-700 font-black">-</span>
                <span className={`font-black text-base sm:text-xl ${!isTeamA ? 'text-rose-400' : 'text-slate-500'}`}>{tricksWon.B}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] sm:text-xs">Points This Round</span>
              <span className="font-black text-2xl sm:text-3xl text-amber-400">+{pointsThisRound}</span>
            </div>
          </div>

          {/* Raised points display */}
          <div className="mb-3 landscape:mb-2 sm:mb-6 bg-slate-800/30 py-2.5 landscape:py-1.5 sm:py-4 px-4 rounded-xl sm:rounded-2xl border border-slate-700/50">
            <div className="text-center mb-2">
              <span className="text-slate-400 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">Points Raised On</span>
            </div>
            {losingTeam ? (
              <div className="flex items-center justify-center gap-3">
                <span className={`font-black text-lg sm:text-2xl ${losingTeam === 'A' ? 'text-indigo-400' : 'text-rose-400'}`}>
                  Team {losingTeam}
                </span>
                <span className="text-slate-500 font-bold">→</span>
                <span className="text-4xl sm:text-5xl font-black text-white">{losingPoints}</span>
              </div>
            ) : (
              <div className="text-center text-slate-500 font-bold text-sm">No points yet</div>
            )}
            {shufflerFlipped && (
              <div className="mt-2 text-center text-yellow-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest animate-pulse">
                🔀 Shuffler switched sides!
              </div>
            )}
          </div>

          <div className="flex flex-row gap-2 sm:gap-3">
            <button
              className="flex-1 py-2.5 landscape:py-2 sm:py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-black text-sm sm:text-lg shadow-[0_5px_20px_rgba(79,70,229,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] flex justify-center items-center gap-2"
              onClick={onNextRound}
            >
              Next Round <span>▶</span>
            </button>
            <button
              className="py-2.5 landscape:py-2 px-4 sm:py-4 sm:px-6 bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-900/50 rounded-xl font-black text-sm sm:text-lg transition-all flex justify-center items-center gap-2"
              onClick={onLeaveRoom}
              title="Leave Room"
            >
              <span>🚪</span>
              <span className="hidden sm:inline">Exit</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

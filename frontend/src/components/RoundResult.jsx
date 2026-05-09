export default function RoundResult({ roundResult, onNextRound }) {
  if (!roundResult) return null;

  const { bidderName, biddingTeam, bidValue, isForcedBid, tricksWon, scoreChange, totalScores, biddingTeamWon } = roundResult;
  const isTeamA = biddingTeam === 'A';
  const scoreDiff = scoreChange[biddingTeam];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl sm:rounded-3xl w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className={`px-4 py-4 sm:p-8 text-center relative overflow-hidden flex-shrink-0 ${biddingTeamWon ? 'bg-gradient-to-br from-emerald-600/20 to-emerald-900/40 border-b border-emerald-500/30' : 'bg-gradient-to-br from-red-600/20 to-red-900/40 border-b border-red-500/30'}`}>
          <div className={`absolute top-0 left-0 right-0 h-1.5 ${biddingTeamWon ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
          <div className="text-4xl sm:text-6xl mb-2 sm:mb-4 drop-shadow-lg animate-bounce">{biddingTeamWon ? '🎉' : '💀'}</div>
          <h2 className={`text-xl sm:text-3xl font-black mb-1 ${biddingTeamWon ? 'text-emerald-400' : 'text-red-400'}`}>
            {biddingTeamWon ? 'Bid Won!' : 'Bid Failed!'}
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm">
            <strong className="text-white bg-slate-800/50 px-1.5 py-0.5 rounded">{bidderName}</strong>{' '}
            {biddingTeamWon ? 'successfully made' : 'failed to make'} the bid for Team {biddingTeam}.
          </p>
        </div>
        
        {/* Stats */}
        <div className="px-4 py-3 sm:p-6 overflow-y-auto flex-1">
          <div className="bg-slate-950/80 rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-slate-800 mb-3 sm:mb-6 shadow-inner">
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
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] sm:text-xs">Score Change</span>
              <span className={`font-black text-2xl sm:text-3xl flex items-center gap-1 ${scoreDiff > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {scoreDiff > 0 ? <span className="text-lg sm:text-xl">+</span> : ''}{scoreDiff}
              </span>
            </div>
          </div>

          {/* Scores */}
          <div className="flex items-center justify-around mb-3 sm:mb-6 bg-slate-800/30 py-3 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-700/50">
            <div className="text-center">
              <div className="text-indigo-400 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mb-0.5">Team A</div>
              <div className="text-3xl sm:text-4xl font-black text-white">{totalScores.A}</div>
            </div>
            <div className="text-slate-600 font-black text-xl italic">VS</div>
            <div className="text-center">
              <div className="text-rose-400 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mb-0.5">Team B</div>
              <div className="text-3xl sm:text-4xl font-black text-white">{totalScores.B}</div>
            </div>
          </div>

          <button
            className="w-full py-3 sm:py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-black text-base sm:text-lg shadow-[0_5px_20px_rgba(79,70,229,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] flex justify-center items-center gap-2"
            onClick={onNextRound}
          >
            Start Next Round <span>▶</span>
          </button>
        </div>
      </div>
    </div>
  );
}

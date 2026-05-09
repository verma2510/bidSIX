import useGameStore from '../store/gameStore';
import { createPortal } from 'react-dom';

export default function Scoreboard() {
  const { gameState, showScoreboard, toggleScoreboard } = useGameStore();
  if (!gameState) return null;

  const { scores, trickCount, roundHistory, players, phase } = gameState;

  return (
    <>
      <button 
        className="px-2 py-1 md:px-4 md:py-2 bg-slate-800/80 hover:bg-slate-700 border border-white/10 rounded-lg text-white font-bold flex items-center gap-1 md:gap-2 backdrop-blur-sm transition-colors shadow-lg text-[10px] sm:text-xs md:text-base"
        onClick={toggleScoreboard}
      >
        <span className="text-xs md:text-base">📊</span>
        <span className="text-indigo-300">{scores.A}</span>
        <span className="text-slate-500">-</span>
        <span className="text-rose-300">{scores.B}</span>
      </button>

      {showScoreboard && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-2 sm:p-4" onClick={toggleScoreboard}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">📊 Match Scoreboard</h2>
              <button className="text-slate-400 hover:text-white p-2 rounded-md hover:bg-slate-800 transition-colors" onClick={toggleScoreboard}>✕</button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full">
              <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-800/50 rounded-2xl p-4 sm:p-6 border border-slate-700 mb-6 sm:mb-8 shadow-inner gap-4">
                {/* Team A */}
                <div className="flex-1 text-center w-full">
                  <div className="text-indigo-400 font-bold text-xs sm:text-sm tracking-widest uppercase mb-1 sm:mb-2">Team A</div>
                  <div className="text-5xl sm:text-6xl font-black text-white mb-2 sm:mb-3 drop-shadow-lg">{scores.A}</div>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {players.filter(p => p.team === 'A').map(p => (
                      <span key={p.seatIndex} className="px-2 py-0.5 bg-indigo-900/50 text-indigo-200 text-xs rounded border border-indigo-700/30">{p.name}</span>
                    ))}
                  </div>
                </div>
                
                <div className="px-4 sm:px-8 text-slate-500 font-black italic text-lg sm:text-xl py-2 sm:py-0">VS</div>
                
                {/* Team B */}
                <div className="flex-1 text-center w-full">
                  <div className="text-rose-400 font-bold text-xs sm:text-sm tracking-widest uppercase mb-1 sm:mb-2">Team B</div>
                  <div className="text-5xl sm:text-6xl font-black text-white mb-2 sm:mb-3 drop-shadow-lg">{scores.B}</div>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {players.filter(p => p.team === 'B').map(p => (
                      <span key={p.seatIndex} className="px-2 py-0.5 bg-rose-900/50 text-rose-200 text-xs rounded border border-rose-700/30">{p.name}</span>
                    ))}
                  </div>
                </div>
              </div>

              {phase === 'playing' && (
                <div className="mb-6 sm:mb-8">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 sm:mb-3">Current Round Tricks</h3>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="flex-1 bg-indigo-950/30 border border-indigo-900/50 rounded-xl p-3 sm:p-4 flex items-center justify-between shadow-sm">
                      <span className="text-indigo-300 font-medium">Team A</span>
                      <span className="text-2xl font-bold text-indigo-400">{trickCount.A}</span>
                    </div>
                    <div className="flex-1 bg-rose-950/30 border border-rose-900/50 rounded-xl p-3 sm:p-4 flex items-center justify-between shadow-sm">
                      <span className="text-rose-300 font-medium">Team B</span>
                      <span className="text-2xl font-bold text-rose-400">{trickCount.B}</span>
                    </div>
                  </div>
                </div>
              )}

              {roundHistory.length > 0 && (
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 sm:mb-3">Round History</h3>
                  <div className="bg-slate-800/30 rounded-xl border border-slate-700 overflow-hidden shadow-inner">
                    <div className="grid grid-cols-4 sm:grid-cols-5 bg-slate-800/80 p-2 sm:p-3 text-[9px] sm:text-xs font-bold text-slate-400 uppercase border-b border-slate-700">
                      <div className="hidden sm:block">Rnd</div>
                      <div className="col-span-2">Bidder & Bid</div>
                      <div>Tricks</div>
                      <div className="text-right">Result</div>
                    </div>
                    <div className="divide-y divide-slate-700/50">
                      {roundHistory.map((round, i) => (
                        <div key={i} className={`grid grid-cols-4 sm:grid-cols-5 p-2 sm:p-3 text-xs sm:text-sm items-center ${round.biddingTeamWon ? 'bg-emerald-900/10' : 'bg-red-900/10'}`}>
                          <div className="hidden sm:block text-slate-500 font-bold">#{round.roundNumber}</div>
                          <div className="col-span-2 flex flex-col">
                            <span className="text-white font-medium">{round.bidderName} <span className="text-slate-500 text-xs">(Team {round.biddingTeam})</span></span>
                            <span className="text-amber-400 text-xs font-bold">Bid: {round.bidValue}{round.isForcedBid ? ' (Forced)' : ''}</span>
                          </div>
                          <div className="text-slate-300">{round.tricksWon.A} / {round.tricksWon.B}</div>
                          <div className={`text-right font-bold ${round.biddingTeamWon ? 'text-emerald-400' : 'text-red-400'}`}>
                            {round.biddingTeamWon ? '+' : ''}{round.scoreChange[round.biddingTeam]}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

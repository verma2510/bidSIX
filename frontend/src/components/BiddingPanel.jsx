import useGameStore from '../store/gameStore';

export default function BiddingPanel({ onBid }) {
  const { gameState } = useGameStore();
  if (!gameState || gameState.phase !== 'bidding') return null;

  const { biddingState, mySeat, players } = gameState;
  const isMyTurn = biddingState.currentBidderIndex === mySeat;
  const currentBidder = players.find(p => p.seatIndex === biddingState.currentBidderIndex);

  // Forced bid 5 ONLY when all 5 others passed AND nobody bid yet
  const passCount = biddingState.passCount ?? biddingState.bids.filter(b => b.pass).length;
  const isForcedScenario = passCount === 5 && biddingState.highestBid === null;

  // Compute available bids
  const availableBids = [];
  if (isForcedScenario) {
    // Forced: can bid 5, 6, 7, or 8 (player might want to bid higher than 5)
    for (let i = 5; i <= 8; i++) availableBids.push(i);
  } else {
    // Normal: must beat current highest bid, minimum 6
    const minBid = biddingState.highestBid ? biddingState.highestBid + 1 : 6;
    for (let i = minBid; i <= 8; i++) availableBids.push(i);
  }

  // Can the player pass?
  const canPass = !isForcedScenario;

  // Status text
  let statusText;
  if (!isMyTurn) {
    statusText = `Waiting for ${currentBidder?.name || 'player'}...`;
  } else if (isForcedScenario) {
    statusText = "Everyone passed — you must bid! (min 5)";
  } else {
    statusText = "It's your turn to bid!";
  }

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-800/95 backdrop-blur-xl border border-white/10 p-3 landscape:p-2 sm:p-6 rounded-xl sm:rounded-2xl shadow-2xl shadow-black/50 w-[min(90vw,340px)] text-center z-40 max-h-[90vh] landscape:max-h-[85vh] overflow-y-auto">
      <div className="mb-2 landscape:mb-1 sm:mb-5">
        <h2 className="text-base landscape:text-sm sm:text-2xl font-bold bg-gradient-to-r from-amber-200 to-yellow-500 bg-clip-text text-transparent mb-0.5">🎯 Bidding Phase</h2>
        <p className="text-slate-300 text-xs font-medium">
          {statusText}
        </p>
      </div>

      {biddingState.highestBid && (
        <div className="bg-slate-900/50 rounded-lg sm:rounded-xl p-2 sm:p-3 mb-2 landscape:mb-1 border border-slate-700/50 flex items-center justify-between gap-2">
          <span className="text-slate-400 text-xs uppercase tracking-wider">Highest</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl landscape:text-lg sm:text-3xl font-black text-amber-400">{biddingState.highestBid}</span>
            <span className="text-slate-300 text-xs font-medium">by {players.find(p => p.seatIndex === biddingState.highestBidder)?.name}</span>
          </div>
        </div>
      )}

      {/* Previous bids — scrollable, compact */}
      {biddingState.bids.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1 mb-2 landscape:mb-1 max-h-[48px] landscape:max-h-[36px] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full">
          {biddingState.bids.map((bid, i) => (
            <div key={i} className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${bid.pass ? 'bg-slate-700/50 border-slate-600 text-slate-400' : 'bg-indigo-900/50 border-indigo-500/30 text-indigo-200'}`}>
              {players.find(p => p.seatIndex === bid.seatIndex)?.name}: {bid.pass ? 'Pass' : bid.bid}
            </div>
          ))}
        </div>
      )}

      {isMyTurn && (
        <div className="flex flex-wrap justify-center gap-1.5 landscape:gap-1">
          {availableBids.map(bid => (
            <button
              key={bid}
              className={`flex-1 min-w-[48px] py-1.5 landscape:py-1 sm:py-2 text-white rounded-lg sm:rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95 shadow-lg ${
                isForcedScenario && bid === 5
                  ? 'bg-red-600 hover:bg-red-500'
                  : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
              onClick={() => onBid(bid)}
            >
              {bid}{isForcedScenario && bid === 5 ? ' (min)' : ''}
            </button>
          ))}
          {canPass && (
            <button
              className="flex-1 min-w-[48px] py-1.5 landscape:py-1 sm:py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg sm:rounded-xl font-bold text-sm transition-colors shadow-lg"
              onClick={() => onBid('pass')}
            >
              Pass
            </button>
          )}
        </div>
      )}
    </div>
  );
}

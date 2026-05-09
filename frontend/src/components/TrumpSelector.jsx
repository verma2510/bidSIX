const SUITS = [
  { name: 'spades', symbol: '♠', color: 'text-slate-800', bg: 'bg-slate-100', hover: 'hover:bg-white', border: 'border-slate-300' },
  { name: 'hearts', symbol: '♥', color: 'text-red-500', bg: 'bg-red-50', hover: 'hover:bg-red-100', border: 'border-red-200' },
  { name: 'clubs', symbol: '♣', color: 'text-slate-800', bg: 'bg-slate-100', hover: 'hover:bg-white', border: 'border-slate-300' },
  { name: 'diamonds', symbol: '♦', color: 'text-red-500', bg: 'bg-red-50', hover: 'hover:bg-red-100', border: 'border-red-200' },
];

export default function TrumpSelector({ onSelect, isMyTurn }) {
  if (!isMyTurn) {
    return (
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-800/95 backdrop-blur-xl border border-white/10 p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-2xl z-40 text-center w-[min(90vw,320px)]">
        <h2 className="text-lg sm:text-2xl font-bold text-white mb-1">👑 Trump Selection</h2>
        <p className="text-slate-300 text-xs sm:text-sm">Waiting for the bid winner to select trump...</p>
      </div>
    );
  }

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-800/95 backdrop-blur-xl border border-white/10 p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-2xl shadow-black/50 z-40 text-center w-[min(90vw,340px)]">
      <div className="mb-3 sm:mb-5">
        <h2 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-amber-200 to-yellow-500 bg-clip-text text-transparent mb-0.5">👑 Select Trump</h2>
        <p className="text-slate-300 text-xs sm:text-sm">You won the bid! Choose your court piece.</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        {SUITS.map(suit => (
          <button
            key={suit.name}
            className={`flex flex-col items-center justify-center p-2.5 sm:p-4 rounded-lg sm:rounded-xl border ${suit.bg} ${suit.border} ${suit.hover} transition-all duration-200 hover:scale-105 active:scale-95 shadow-md group`}
            onClick={() => onSelect(suit.name)}
          >
            <span className={`text-3xl sm:text-4xl mb-0.5 ${suit.color} group-hover:scale-110 transition-transform`}>{suit.symbol}</span>
            <span className="text-slate-800 font-bold capitalize text-xs sm:text-sm">{suit.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

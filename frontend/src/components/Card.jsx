import { useState } from 'react';

const SUIT_SYMBOLS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const SUIT_COLORS = { hearts: 'text-red-500', diamonds: 'text-red-500', clubs: 'text-slate-800', spades: 'text-slate-800' };

export default function Card({ card, onClick, disabled, selected, faceDown, small, highlight }) {
  const [hovering, setHovering] = useState(false);

  if (faceDown) {
    return (
      <div
        className={`relative rounded-xl border border-slate-700 shadow-md overflow-hidden flex items-center justify-center bg-gradient-to-br from-indigo-900 via-slate-800 to-indigo-900 
          ${small ? 'w-10 h-14 md:w-12 md:h-16' : 'w-16 h-24 sm:w-20 sm:h-32 md:w-24 md:h-36'} 
          ${selected ? '-translate-y-4 shadow-indigo-500/50 shadow-xl' : ''}`}
      >
        <div className="text-indigo-400/30 text-2xl md:text-4xl opacity-50 select-none">🂠</div>
      </div>
    );
  }

  if (!card) return null;

  const suitSymbol = SUIT_SYMBOLS[card.suit];
  const suitColorClass = SUIT_COLORS[card.suit];
  
  return (
    <div
      onClick={() => !disabled && onClick?.(card)}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={`relative rounded-xl border overflow-hidden flex flex-col bg-slate-50 transition-all duration-200 select-none
        ${small ? 'w-10 h-14 md:w-12 md:h-16 border-slate-300 text-[10px] md:text-xs' : 'w-12 h-16 sm:w-16 sm:h-24 md:w-24 md:h-36 border-slate-200 text-[10px] sm:text-xs md:text-base'}
        ${selected ? '-translate-y-4 shadow-2xl shadow-indigo-500/50 ring-2 ring-indigo-500' : 'shadow-md'}
        ${disabled ? 'cursor-default' : 'cursor-pointer'}
        ${hovering && !disabled && !selected ? '-translate-y-2 shadow-xl' : ''}
        ${highlight ? 'ring-2 ring-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)]' : ''}`}
    >
      <div className={`absolute top-1 left-1 flex flex-col items-center leading-none ${suitColorClass}`}>
        <span className="font-bold">{card.rank}</span>
        <span className={small ? 'text-[8px]' : 'text-[10px] md:text-sm'}>{suitSymbol}</span>
      </div>
      
      <div className={`flex-1 flex items-center justify-center ${suitColorClass}`}>
        <span className={small ? 'text-lg md:text-xl' : 'text-2xl md:text-4xl'}>{suitSymbol}</span>
      </div>
      
      <div className={`absolute bottom-1 right-1 flex flex-col items-center leading-none rotate-180 ${suitColorClass}`}>
        <span className="font-bold">{card.rank}</span>
        <span className={small ? 'text-[8px]' : 'text-[10px] md:text-sm'}>{suitSymbol}</span>
      </div>
      
      {disabled && <div className="absolute inset-0 bg-black/5"></div>}
    </div>
  );
}

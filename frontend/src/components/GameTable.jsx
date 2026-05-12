import Card from './Card';
import useGameStore from '../store/gameStore';

const SUIT_SYMBOLS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };

const POSITIONS = [
  { top: '68%', left: '50%', transform: 'translate(-50%, -50%)', rotate: '0deg' }, // Bottom (Me) - Moved up to avoid overlapping cards
  { top: '80%', left: '90%', transform: 'translate(-50%, -50%)', rotate: '-30deg' },  // Bottom Right
  { top: '20%', left: '90%', transform: 'translate(-50%, -50%)', rotate: '-60deg' },  // Top Right
  { top: '0%', left: '50%', transform: 'translate(-50%, -50%)', rotate: '0deg' },   // Top
  { top: '20%', left: '10%', transform: 'translate(-50%, -50%)', rotate: '60deg' },  // Top Left
  { top: '80%', left: '10%', transform: 'translate(-50%, -50%)', rotate: '30deg' },  // Bottom Left
];

const TRICK_CARD_POS = [
  { top: '65%', left: '50%', transform: 'translate(-50%, -50%)', rotate: '0deg' },
  { top: '55%', left: '62%', transform: 'translate(-50%, -50%)', rotate: '-25deg' },
  { top: '40%', left: '60%', transform: 'translate(-50%, -50%)', rotate: '-50deg' },
  { top: '35%', left: '50%', transform: 'translate(-50%, -50%)', rotate: '0deg' },
  { top: '40%', left: '40%', transform: 'translate(-50%, -50%)', rotate: '50deg' },
  { top: '55%', left: '38%', transform: 'translate(-50%, -50%)', rotate: '25deg' },
];

export default function GameTable() {
  const { gameState } = useGameStore();
  if (!gameState) return null;

  const { players, currentTrick, lastCompletedTrick, currentPlayerIndex, trumpSuit, trickCount, mySeat, dealerIndex, biddingState, phase } = gameState;

  // Show the completed trick cards when no new trick is in progress
  const displayTrick = currentTrick.length > 0 ? currentTrick : (lastCompletedTrick?.trick || []);
  const isCompletedTrickDisplay = currentTrick.length === 0 && lastCompletedTrick?.trick?.length > 0;

  const reorderSeats = () => {
    const ordered = [];
    for (let i = 0; i < 6; i++) {
      const seatIdx = (mySeat + i) % 6;
      ordered.push({ ...players.find(p => p.seatIndex === seatIdx), posIndex: i, actualSeat: seatIdx });
    }
    return ordered;
  };

  const orderedPlayers = reorderSeats();

  const getTrickCardPosition = (seatIndex) => {
    return (seatIndex - mySeat + 6) % 6;
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center p-1 landscape:p-2 md:p-12 pb-20 landscape:pb-4 md:pb-12 overflow-hidden z-0">
      
      {/* "You" Nameplate & Trump Indicator (Moved to Navbar on Mobile) */}
      
      {/* Trick count and Bid Info (Top Right - Desktop Only) */}
      <div className="hidden md:flex absolute top-4 right-4 md:top-6 md:right-6 flex-col gap-3 z-50">
        {/* Bid Target Indicator */}
        {biddingState?.highestBidder !== null && phase === 'playing' && (
          <div className={`bg-slate-900/95 backdrop-blur-xl border-2 px-4 py-2.5 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex items-center justify-between gap-4 min-w-[130px] ${players.find(p => p.seatIndex === biddingState.highestBidder)?.team === 'A' ? 'border-indigo-500/50 text-indigo-100' : 'border-rose-500/50 text-rose-100'}`}>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bid By</span>
              <span className="text-xs font-bold leading-none mt-0.5 text-white">Team {players.find(p => p.seatIndex === biddingState.highestBidder)?.team}</span>
            </div>
            <span className={`text-2xl font-black drop-shadow-md ${players.find(p => p.seatIndex === biddingState.highestBidder)?.team === 'A' ? 'text-indigo-400' : 'text-rose-400'}`}>{biddingState.highestBid}</span>
          </div>
        )}
        <div className="bg-indigo-950/90 border border-indigo-500/50 text-indigo-100 px-4 py-2 rounded-xl text-sm font-bold shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex items-center justify-between gap-4 min-w-[130px]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></span>
            Team A
          </div>
          <span className="text-xl text-indigo-400">{trickCount.A}</span>
        </div>
        <div className="bg-rose-950/90 border border-rose-500/50 text-rose-100 px-4 py-2 rounded-xl text-sm font-bold shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex items-center justify-between gap-4 min-w-[130px]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>
            Team B
          </div>
          <span className="text-xl text-rose-400">{trickCount.B}</span>
        </div>
      </div>

      {/* The Table Felt */}
      <div className="relative w-full max-w-[900px] aspect-[4/3] max-h-[55vh] landscape:max-h-[75vh] md:max-h-[80vh] bg-gradient-to-b from-teal-800 to-teal-950 rounded-[120px] sm:rounded-[200px] md:rounded-[300px] border-[12px] md:border-[24px] border-slate-800 shadow-[0_30px_60px_rgba(0,0,0,0.6),inset_0_0_100px_rgba(0,0,0,0.8)] before:absolute before:inset-0 before:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] before:opacity-30 before:rounded-[120px] sm:before:rounded-[200px] md:before:rounded-[300px]">
        
        {/* Center Logo/Decor */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <div className="w-48 h-48 md:w-64 md:h-64 border-4 border-teal-500 border-dashed rounded-full flex items-center justify-center animate-[spin_60s_linear_infinite]">
            <div className="w-32 h-32 md:w-48 md:h-48 border-2 border-teal-400 rounded-full flex items-center justify-center">
            </div>
          </div>
          <span className="absolute text-7xl md:text-9xl text-teal-300 opacity-50">🃏</span>
        </div>





        {/* Cards in middle (Current Trick) */}
        <div className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-700 ${isCompletedTrickDisplay ? 'opacity-40' : 'opacity-100'}`}>
          {displayTrick.map((play, i) => {
            const pos = getTrickCardPosition(play.seatIndex);
            const style = TRICK_CARD_POS[pos];
            return (
              <div key={i} className="absolute drop-shadow-2xl transition-all duration-300 animate-in zoom-in-50" style={{ top: style.top, left: style.left, transform: `${style.transform} rotate(${style.rotate})` }}>
                <Card card={play.card} small />
              </div>
            );
          })}
        </div>

        {/* Seats arrayed around */}
        {orderedPlayers.map((player) => {
          if (!player) return null;
          const posStyle = POSITIONS[player.posIndex];
          const isCurrentTurn = player.actualSeat === currentPlayerIndex;
          const isDealer = player.actualSeat === dealerIndex;
          const isBidWinner = player.actualSeat === biddingState?.highestBidder;
          const isTeamA = player.team === 'A';
          
          return (
            <div key={player.posIndex} className="absolute z-30" style={{ top: posStyle.top, left: posStyle.left, transform: posStyle.transform }}>
              <div className={`relative flex flex-col items-center group transition-all duration-300 ${isCurrentTurn && phase === 'playing' ? 'scale-110 -translate-y-2' : ''}`}>
                
                {/* Active turn indicator rings */}
                {isCurrentTurn && !player.isMe && (phase === 'playing' || phase === 'bidding' || phase === 'trump_selection') && (
                  <>
                    <div className="absolute inset-0 w-[56px] h-[56px] sm:w-[72px] sm:h-[72px] md:w-[92px] md:h-[92px] -top-1 -left-1 md:-top-1 md:-left-1 rounded-full border-4 border-amber-400/50 animate-ping"></div>
                    <div className="absolute inset-0 w-[56px] h-[56px] sm:w-[72px] sm:h-[72px] md:w-[92px] md:h-[92px] -top-1 -left-1 md:-top-1 md:-left-1 rounded-full border-4 border-amber-400 border-t-transparent animate-spin"></div>
                  </>
                )}

                {/* Avatar circle */}
                {!player.isMe && (
                  <div className={`w-[48px] h-[48px] sm:w-[64px] sm:h-[64px] md:w-[84px] md:h-[84px] rounded-full border-4 flex items-center justify-center text-xl sm:text-2xl md:text-4xl font-black text-white shadow-[0_10px_20px_rgba(0,0,0,0.5)] bg-gradient-to-br z-10 ${
                    isTeamA ? 'from-indigo-500 to-purple-800 border-indigo-400' : 'from-rose-500 to-orange-800 border-rose-400'
                  } ${!player.connected && 'grayscale opacity-70 border-slate-600'}`}>
                    {player.name ? player.name.charAt(0).toUpperCase() : '?'}
                  </div>
                )}

                {/* Name plate and Trump (for Me - Desktop Only) */}
                {player.isMe ? (
                  <div className="hidden md:flex mt-16 z-20 items-center justify-between w-[360px] pointer-events-none">
                    {/* Name plate */}
                    <div className={`pointer-events-auto px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 whitespace-nowrap border-2 ${
                      isTeamA ? 'bg-indigo-950 border-indigo-800' : 'bg-rose-950 border-rose-800'
                    }`}>
                      <span className="text-white text-sm font-bold max-w-[100px] truncate">{player.name || 'Empty'}</span>
                      <span className="text-[10px] bg-amber-500 text-amber-950 px-1.5 py-0.5 rounded shadow-sm uppercase font-black">You</span>
                    </div>

                    {/* Trump Indicator */}
                    {trumpSuit && (
                      <div className="pointer-events-auto bg-slate-900/80 backdrop-blur-md rounded-full px-5 py-1.5 flex items-center gap-2 border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                        <span className="text-xs text-slate-400 font-black uppercase tracking-widest">Trump</span>
                        <span className={`text-2xl drop-shadow-md ${trumpSuit === 'hearts' || trumpSuit === 'diamonds' ? 'text-red-500' : 'text-slate-200'}`}>
                          {SUIT_SYMBOLS[trumpSuit]}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`mt-[-8px] sm:mt-[-10px] md:mt-[-12px] z-20 px-2 sm:px-3 md:px-4 py-0.5 sm:py-1 md:py-1.5 rounded-full shadow-lg flex items-center gap-1.5 whitespace-nowrap border-2 ${
                    isTeamA ? 'bg-indigo-950 border-indigo-800' : 'bg-rose-950 border-rose-800'
                  }`}>
                    <span className="text-white text-[10px] sm:text-xs md:text-sm font-bold max-w-[60px] sm:max-w-[80px] md:max-w-[100px] truncate">{player.name || 'Empty'}</span>
                  </div>
                )}

                {/* Badges */}
                <div className="absolute top-0 right-0 flex flex-col gap-1.5 -translate-y-2 translate-x-3 z-30">
                  {isDealer && <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-white text-slate-900 text-[10px] md:text-xs font-black flex items-center justify-center border-2 border-slate-800 shadow-lg" title="Dealer">D</div>}
                  {isBidWinner && <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-amber-400 text-amber-950 text-[10px] md:text-xs font-black flex items-center justify-center border-2 border-amber-600 shadow-lg" title="Bid Winner">B</div>}
                </div>

                {/* Opponent Cards display (mini) */}
                {!player.isMe && player.cardCount > 0 && (
                  <div className="absolute -bottom-8 md:-bottom-10 flex justify-center -space-x-3 md:-space-x-4 pointer-events-none">
                    {Array.from({ length: Math.min(player.cardCount, 5) }).map((_, i) => (
                      <div key={i} className="w-6 h-8 md:w-8 md:h-11 bg-slate-200 rounded border border-slate-400 shadow-sm shadow-black/50 transform origin-bottom" style={{ transform: `rotate(${(i - 2) * 12}deg) translateY(${Math.abs(i-2)*3}px)` }}>
                        <div className="w-full h-full rounded-[2px] bg-indigo-900 m-[1px] border border-white/20" style={{ width: 'calc(100% - 2px)', height: 'calc(100% - 2px)' }}></div>
                      </div>
                    ))}
                    {player.cardCount > 5 && <div className="absolute -right-5 md:-right-6 top-1 bg-black/90 text-white text-[10px] md:text-xs font-bold rounded-full w-5 h-5 md:w-6 md:h-6 flex items-center justify-center border border-slate-700">+{player.cardCount - 5}</div>}
                  </div>
                )}
                
                {!player.connected && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/90 backdrop-blur-sm text-red-400 border border-red-500/50 text-[10px] md:text-xs uppercase font-black px-3 py-1 rounded shadow-lg whitespace-nowrap z-40">Offline</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import Card from './Card';
import useGameStore from '../store/gameStore';

const SUIT_SYMBOLS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };

// Desktop / tablet positions (md and above — unchanged)
const POSITIONS = [
  { top: '68%', left: '50%', transform: 'translate(-50%, -50%)', rotate: '0deg' }, // Bottom (Me)
  { top: '80%', left: '90%', transform: 'translate(-50%, -50%)', rotate: '-30deg' },  // Bottom Right
  { top: '20%', left: '90%', transform: 'translate(-50%, -50%)', rotate: '-60deg' },  // Top Right
  { top: '0%',  left: '50%', transform: 'translate(-50%, -50%)', rotate: '0deg' },   // Top
  { top: '20%', left: '10%', transform: 'translate(-50%, -50%)', rotate: '60deg' },  // Top Left
  { top: '80%', left: '10%', transform: 'translate(-50%, -50%)', rotate: '30deg' },  // Bottom Left
];

// Mobile-only positions — pushed further from table to maximise the central playing area.
// Values go beyond 0-100% so the circles sit at the very screen edges (parent overflow:hidden clips safely).
const MOBILE_POSITIONS = [
  { top: '82%',  left: '50%',  transform: 'translate(-50%, -50%)', rotate: '0deg' },   // Bottom (Me)
  { top: '88%',  left: '97%',  transform: 'translate(-50%, -50%)', rotate: '-30deg' }, // Bottom Right
  { top: '10%',  left: '97%',  transform: 'translate(-50%, -50%)', rotate: '-60deg' }, // Top Right
  { top: '-6%',  left: '50%',  transform: 'translate(-50%, -50%)', rotate: '0deg' },   // Top
  { top: '10%',  left: '3%',   transform: 'translate(-50%, -50%)', rotate: '60deg' },  // Top Left
  { top: '88%',  left: '3%',   transform: 'translate(-50%, -50%)', rotate: '30deg' },  // Bottom Left
];

const TRICK_CARD_POS = [
  { top: '65%', left: '50%', transform: 'translate(-50%, -50%)', rotate: '0deg' },
  { top: '55%', left: '62%', transform: 'translate(-50%, -50%)', rotate: '-25deg' },
  { top: '40%', left: '60%', transform: 'translate(-50%, -50%)', rotate: '-50deg' },
  { top: '35%', left: '50%', transform: 'translate(-50%, -50%)', rotate: '0deg' },
  { top: '40%', left: '40%', transform: 'translate(-50%, -50%)', rotate: '50deg' },
  { top: '55%', left: '38%', transform: 'translate(-50%, -50%)', rotate: '25deg' },
];

// Mobile: compute trick-card positions dynamically so cards in the same zone spread
// without overlapping.
//
// Layout zones (by posIndex):
//   VERTICAL axis   — posIndex 0 (bottom/me) and posIndex 3 (top): vary top%, fixed left 50%
//   HORIZONTAL axis — posIndex 1,2 (right side) and posIndex 4,5 (left side): vary left%, fixed top%
//
// Zone anchor points (centre of each zone):
const MOBILE_TRICK_ZONE = {
  // posIndex → { axis: 'v'|'h', anchorTop, anchorLeft }
  0: { axis: 'v', anchorTop: 68, anchorLeft: 50 }, // bottom-me  → vertical, lower half
  3: { axis: 'v', anchorTop: 32, anchorLeft: 50 }, // top        → vertical, upper half
  1: { axis: 'h', anchorTop: 62, anchorLeft: 68 }, // bottom-right → horizontal, right
  2: { axis: 'h', anchorTop: 38, anchorLeft: 68 }, // top-right    → horizontal, right
  4: { axis: 'h', anchorTop: 38, anchorLeft: 32 }, // top-left     → horizontal, left
  5: { axis: 'h', anchorTop: 62, anchorLeft: 32 }, // bottom-left  → horizontal, left
};

// Card size on mobile (small prop): ~56px wide × 80px tall → as % of a ~300px wide table
// Use ~20% wide, ~27% tall spacing unit to guarantee no overlap.
const MOBILE_CARD_STEP_H = 20; // % left-offset per card slot (horizontal zone)
const MOBILE_CARD_STEP_V = 27; // % top-offset per card slot (vertical zone)

function getMobileTrickCardStyles(trick, mySeat) {
  // Group plays by their display-posIndex zone
  const zoneCards = {}; // posIndex → [{ play, slotIndex }]
  trick.forEach((play) => {
    const pos = (play.seatIndex - mySeat + 6) % 6;
    if (!zoneCards[pos]) zoneCards[pos] = [];
    zoneCards[pos].push(play);
  });

  const styles = {};
  trick.forEach((play) => {
    const pos = (play.seatIndex - mySeat + 6) % 6;
    const zone = MOBILE_TRICK_ZONE[pos];
    const group = zoneCards[pos];
    const slotIndex = group.indexOf(play); // 0-based index within zone
    const count = group.length;

    // Centre the group around the anchor: offset = (slotIndex - (count-1)/2) * step
    const offset = (slotIndex - (count - 1) / 2);

    let top, left;
    if (zone.axis === 'v') {
      top  = zone.anchorTop  + offset * MOBILE_CARD_STEP_V;
      left = zone.anchorLeft;
    } else {
      top  = zone.anchorTop;
      left = zone.anchorLeft + offset * MOBILE_CARD_STEP_H;
    }

    styles[play.seatIndex] = {
      top:       `${top}%`,
      left:      `${left}%`,
      transform: 'translate(-50%, -50%)',
      rotate:    '0deg',
    };
  });

  return styles;
}

export default function GameTable() {
  const { gameState } = useGameStore();

  // Detect mobile (<768 px) so we can use a wider player layout
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const activePositions = isMobile ? MOBILE_POSITIONS : POSITIONS;

  if (!gameState) return null;

  const { players, currentTrick, lastCompletedTrick, currentPlayerIndex, trumpSuit, trickCount, mySeat, shufflerIndex, dealerIndex, biddingState, phase } = gameState;
  const effectiveShufflerIndex = shufflerIndex ?? dealerIndex;

  // Show the completed trick cards when no new trick is in progress
  const displayTrick = currentTrick.length > 0 ? currentTrick : (lastCompletedTrick?.trick || []);
  const isCompletedTrickDisplay = currentTrick.length === 0 && lastCompletedTrick?.trick?.length > 0;

  // Pre-compute mobile trick card positions (keyed by seatIndex) so each card
  // is spread cleanly within its zone with no overlap.
  const mobileTrickStyles = isMobile ? getMobileTrickCardStyles(displayTrick, mySeat) : null;

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
            const style = isMobile ? mobileTrickStyles[play.seatIndex] : TRICK_CARD_POS[pos];
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
          const posStyle = activePositions[player.posIndex];
          const isCurrentTurn = player.actualSeat === currentPlayerIndex;
          const isShuffler = player.actualSeat === effectiveShufflerIndex;
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
                  {isShuffler && <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-yellow-300 text-slate-900 text-[10px] md:text-xs font-black flex items-center justify-center border-2 border-yellow-500 shadow-lg" title="Shuffler">S</div>}
                  {isBidWinner && <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-amber-400 text-amber-950 text-[10px] md:text-xs font-black flex items-center justify-center border-2 border-amber-600 shadow-lg" title="Bid Winner">B</div>}
                </div>


                
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

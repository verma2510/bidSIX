import Card from './Card';
import useGameStore from '../store/gameStore';

export default function PlayerHand({ cards, onPlayCard, isMyTurn, trumpSuit }) {
  const { selectedCard, setSelectedCard } = useGameStore();

  const handleCardClick = (card) => {
    if (!isMyTurn) return;
    if (selectedCard?.id === card.id) {
      onPlayCard(card.id);
      setSelectedCard(null);
    } else {
      setSelectedCard(card);
    }
  };

  const handlePlaySelected = () => {
    if (selectedCard) {
      onPlayCard(selectedCard.id);
      setSelectedCard(null);
    }
  };

  const suitOrder = ['spades', 'hearts', 'diamonds', 'clubs'];
  const sortedCards = [...(cards || [])].sort((a, b) => {
    const suitDiff = suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
    if (suitDiff !== 0) return suitDiff;
    return b.value - a.value;
  });

  const suitSymbol = (suit) =>
    suit === 'hearts' ? '♥' : suit === 'diamonds' ? '♦' : suit === 'clubs' ? '♣' : '♠';

  return (
    // Single flex-column anchored to the bottom — badge → play button → cards, no overlaps
    <div className="absolute bottom-16 landscape:bottom-3 md:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 landscape:gap-0.5 z-50">

      {/* "Your Turn" badge — only when it's the player's turn */}
      {isMyTurn && (
        <div className="relative flex items-center gap-1.5 px-4 py-1.5 landscape:px-3 landscape:py-1 rounded-2xl bg-amber-500 text-amber-950 font-black text-xs sm:text-sm tracking-widest uppercase border-2 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.5)]">
          <span className="absolute -inset-1 rounded-2xl border-2 border-amber-400 animate-ping opacity-50 pointer-events-none" />
          <span>🎯</span>
          <span>Your Turn!</span>
        </div>
      )}

      {/* Play button — only when a card is selected */}
      {isMyTurn && selectedCard && (
        <button
          className="px-5 py-1.5 landscape:py-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-full font-bold text-sm shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95"
          onClick={handlePlaySelected}
        >
          Play {selectedCard.rank} {suitSymbol(selectedCard.suit)}
        </button>
      )}

      {/* Card fan */}
      <div
        className="relative flex justify-center overflow-visible"
        style={{
          height: 'clamp(92px, 23vw, 139px)',
          width: `calc(${Math.max(sortedCards.length - 1, 0)} * min(12vw, 52px) + clamp(64px, 16vw, 96px))`,
        }}
      >
        {sortedCards.map((card, index) => (
          <div
            key={card.id}
            className="absolute top-0 transition-transform duration-300 hover:z-[60]"
            style={{
              transform: `translateX(calc(${(index - (sortedCards.length - 1) / 2)} * min(10vw, 44px)))`,
              zIndex: selectedCard?.id === card.id ? 50 : index,
            }}
          >
            <Card
              card={card}
              onClick={handleCardClick}
              disabled={!isMyTurn}
              selected={selectedCard?.id === card.id}
              highlight={card.suit === trumpSuit}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

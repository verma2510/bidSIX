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

  return (
    <div className="absolute bottom-24 landscape:bottom-1 md:bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center z-50">
      
      {/* Card width: 48px mobile / 64px sm / 96px md → height = width × (244/169) */}
      <div className="relative flex justify-center overflow-visible" style={{
        height: 'clamp(92px, 23vw, 139px)',
        width: `calc(${Math.max(sortedCards.length - 1, 0)} * min(12vw, 52px) + clamp(64px, 16vw, 96px))`,
      }}>
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
      
      {isMyTurn && selectedCard && (
        <button 
          className="absolute -top-14 px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-full font-bold shadow-lg shadow-indigo-500/30 transition-all transform hover:scale-105 active:scale-95 z-50"
          onClick={handlePlaySelected}
        >
          Play {selectedCard.rank} of {selectedCard.suit === 'hearts' ? '♥' : selectedCard.suit === 'diamonds' ? '♦' : selectedCard.suit === 'clubs' ? '♣' : '♠'}
        </button>
      )}
    </div>
  );
}

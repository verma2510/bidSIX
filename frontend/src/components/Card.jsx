import { useState } from 'react';

const RANK_TO_FILE = {
  A: '1', '2': '2', '3': '3', '4': '4', '5': '5',
  '6': '6', '7': '7', '8': '8', '9': '9', '10': '10',
  J: 'jack', Q: 'queen', K: 'king',
};

const SUIT_TO_FILE = { hearts: 'heart', diamonds: 'diamond', clubs: 'club', spades: 'spade' };

function cardImageUrl(suit, rank) {
  return `/cards/${SUIT_TO_FILE[suit]}_${RANK_TO_FILE[rank]}.png`;
}

const SIZE = {
  small:  'w-14 sm:w-16 md:w-16',
  normal: 'w-16 sm:w-20 md:w-24',
};

export default function Card({ card, onClick, disabled, selected, faceDown, small, highlight }) {
  const [hovering, setHovering] = useState(false);

  const widthCls = small ? SIZE.small : SIZE.normal;

  if (faceDown) {
    return (
      <img
        src="/cards/back.png"
        alt="card back"
        draggable={false}
        className={`${widthCls} select-none`}
        style={{ aspectRatio: '169 / 244' }}
      />
    );
  }

  if (!card) return null;

  return (
    <img
      src={cardImageUrl(card.suit, card.rank)}
      alt={`${card.rank} of ${card.suit}`}
      draggable={false}
      onClick={() => !disabled && onClick?.(card)}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={`${widthCls} select-none transition-all duration-200
        ${disabled ? 'cursor-default' : 'cursor-pointer'}
        ${selected ? '-translate-y-4 drop-shadow-[0_0_8px_rgba(99,102,241,0.9)] ring-2 ring-indigo-500 rounded-lg' : ''}
        ${hovering && !disabled && !selected ? '-translate-y-2 drop-shadow-xl' : ''}
        ${highlight ? 'ring-2 ring-amber-400 rounded-lg drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]' : ''}`}
      style={{ aspectRatio: '169 / 244' }}
    />
  );
}

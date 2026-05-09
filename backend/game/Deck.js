// Deck.js - Manages the 48-card deck (standard 52 minus all 2s)

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Rank values for comparison (higher = stronger)
const RANK_VALUES = {
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 11,
  'Q': 12,
  'K': 13,
  'A': 14,
};

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        suit,
        rank,
        value: RANK_VALUES[rank],
        id: `${rank}_${suit}`,
      });
    }
  }
  return deck; // 48 cards
}

function shuffleDeck(deck) {
  const shuffled = [...deck];
  // Fisher-Yates shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function dealCards(deck, numPlayers = 6, cardsPerPlayer = 8) {
  const hands = {};
  for (let i = 0; i < numPlayers; i++) {
    hands[i] = deck.slice(i * cardsPerPlayer, (i + 1) * cardsPerPlayer);
  }
  return hands;
}

module.exports = {
  SUITS,
  RANKS,
  RANK_VALUES,
  createDeck,
  shuffleDeck,
  dealCards,
};

// GameEngine.js - Core game logic for the 6-player trick-taking card game

const { createDeck, shuffleDeck, dealCards, SUITS } = require('./Deck');

const PHASES = {
  WAITING: 'waiting',
  BIDDING: 'bidding',
  TRUMP_SELECTION: 'trump_selection',
  PLAYING: 'playing',
  ROUND_OVER: 'round_over',
  GAME_OVER: 'game_over',
};

class GameEngine {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = []; // Array of { id, name, seatIndex, team }
    this.phase = PHASES.WAITING;
    this.hands = {}; // seatIndex -> cards[]
    this.currentTrick = []; // { seatIndex, card }
    this.trickCount = { A: 0, B: 0 }; // tricks won this round
    this.scores = { A: 0, B: 0 }; // cumulative scores
    this.roundHistory = []; // Array of round results
    this.trumpSuit = null;
    this.leadSuit = null;
    this.currentPlayerIndex = 0; // index into players array (seat)
    this.dealerIndex = 0;
    this.biddingState = {
      currentBidderIndex: 0,
      bids: [], // { seatIndex, bid } or { seatIndex, pass: true }
      highestBid: null,
      highestBidder: null,
      passCount: 0,
      forcedBid: false,
    };
    this.trickHistory = []; // All tricks this round
    this.roundNumber = 0;
    this.chatMessages = [];
  }

  // Add a player to the game
  addPlayer(playerId, playerName) {
    if (this.players.length >= 6) return null;

    const seatIndex = this.players.length;
    const team = seatIndex % 2 === 0 ? 'A' : 'B'; // Alternating teams

    const player = {
      playerId,      // stable persistent ID (from localStorage)
      id: playerId,  // kept for backward-compat with socket emits that use p.id
      name: playerName,
      seatIndex,
      team,
      connected: true,
    };

    this.players.push(player);
    return player;
  }

  // Mark a player as disconnected (by stable playerId)
  removePlayer(playerId) {
    const player = this.players.find(p => p.playerId === playerId);
    if (player) {
      player.connected = false;
    }
    return player;
  }

  // Reconnect a player — update socket-facing id, mark connected
  reconnectPlayer(playerId, newSocketId) {
    const player = this.players.find(p => p.playerId === playerId);
    if (player) {
      player.connected = true;
      player.id = newSocketId; // update current socket id for targeted emits
    }
    return player;
  }

  // Check if all players are connected
  allPlayersConnected() {
    return this.players.length === 6 && this.players.every(p => p.connected);
  }

  // Start a new round
  startRound() {
    this.roundNumber++;
    this.phase = PHASES.BIDDING;
    this.trumpSuit = null;
    this.leadSuit = null;
    this.currentTrick = [];
    this.trickCount = { A: 0, B: 0 };
    this.trickHistory = [];

    // Create and deal cards
    const deck = shuffleDeck(createDeck());
    this.hands = dealCards(deck, 6, 8);

    // Bidding starts with the player after dealer
    this.biddingState = {
      currentBidderIndex: (this.dealerIndex + 1) % 6,
      bids: [],
      highestBid: null,
      highestBidder: null,
      passCount: 0,
      forcedBid: false,
    };

    return this.getState();
  }

  // Handle a bid
  placeBid(seatIndex, bidValue) {
    if (this.phase !== PHASES.BIDDING) return { error: 'Not in bidding phase' };
    if (seatIndex !== this.biddingState.currentBidderIndex) return { error: 'Not your turn to bid' };

    // "Forced bid 5" ONLY applies when all 5 others passed AND nobody bid yet.
    const allOthersPassed = this.biddingState.passCount === 5;
    const isForcedScenario = allOthersPassed && this.biddingState.highestBid === null;

    if (bidValue === 'pass') {
      // Can't pass if you're the forced bidder (nobody bid, you're the last one)
      if (isForcedScenario) {
        return { error: 'You must bid — everyone else passed and no one has bid yet.' };
      }

      this.biddingState.bids.push({ seatIndex, pass: true });
      this.biddingState.passCount++;

      // After this pass, check if only one active bidder remains
      const activeBidders = this._getActiveBidders();
      if (activeBidders.length === 1 && this.biddingState.highestBid !== null) {
        // Last active bidder already has the highest bid — bidding ends
        return this._endBidding();
      }

      // Move to next player
      this._moveToNextBidder(seatIndex);
      return { success: true, phase: this.phase };
    }

    // Validate bid value
    const bid = parseInt(bidValue);
    if (isNaN(bid) || bid > 8) {
      return { error: 'Invalid bid value' };
    }

    // Bid of 5 is ONLY allowed in the forced scenario
    if (bid === 5 && !isForcedScenario) {
      return { error: 'Bid of 5 is only allowed when everyone else passed and no one bid.' };
    }

    // Minimum bid is 5 (forced) or 6 (normal)
    const minBid = isForcedScenario ? 5 : 6;
    if (bid < minBid) {
      return { error: `Minimum bid is ${minBid}` };
    }

    // Must beat current highest bid
    if (this.biddingState.highestBid !== null && bid <= this.biddingState.highestBid) {
      return { error: `Bid must be higher than current highest bid of ${this.biddingState.highestBid}` };
    }

    this.biddingState.bids.push({ seatIndex, bid });
    this.biddingState.highestBid = bid;
    this.biddingState.highestBidder = seatIndex;
    if (isForcedScenario && bid === 5) {
      this.biddingState.forcedBid = true;
    }

    // If bid is 8, bidding ends immediately
    if (bid === 8) {
      return this._endBidding();
    }

    // Move to next player (skip those who passed)
    this._moveToNextBidder(seatIndex);

    // Check if only one active bidder remains
    const activeBidders = this._getActiveBidders();
    if (activeBidders.length === 1 && this.biddingState.highestBid !== null) {
      return this._endBidding();
    }

    return { success: true, phase: this.phase };
  }

  _moveToNextBidder(currentSeat) {
    let next = (currentSeat + 1) % 6;
    const passedSeats = new Set(
      this.biddingState.bids.filter(b => b.pass).map(b => b.seatIndex)
    );

    while (passedSeats.has(next)) {
      next = (next + 1) % 6;
    }
    this.biddingState.currentBidderIndex = next;
  }

  _getActiveBidders() {
    const passedSeats = new Set(
      this.biddingState.bids.filter(b => b.pass).map(b => b.seatIndex)
    );
    return [0, 1, 2, 3, 4, 5].filter(i => !passedSeats.has(i));
  }

  _forceBid(seatIndex) {
    this.biddingState.highestBid = 5;
    this.biddingState.highestBidder = seatIndex;
    this.biddingState.forcedBid = true;
    this.biddingState.bids.push({ seatIndex, bid: 5, forced: true });
    return this._endBidding();
  }

  _endBidding() {
    this.phase = PHASES.TRUMP_SELECTION;
    this.currentPlayerIndex = this.biddingState.highestBidder;
    return { success: true, phase: this.phase, bidWinner: this.biddingState.highestBidder };
  }

  // Handle trump suit selection
  selectTrump(seatIndex, suit) {
    if (this.phase !== PHASES.TRUMP_SELECTION) return { error: 'Not in trump selection phase' };
    if (seatIndex !== this.biddingState.highestBidder) return { error: 'Only the bid winner can select trump' };
    if (!SUITS.includes(suit)) return { error: 'Invalid suit' };

    this.trumpSuit = suit;
    this.phase = PHASES.PLAYING;
    this.currentPlayerIndex = this.biddingState.highestBidder; // Bid winner leads first
    this.currentTrick = [];
    this.leadSuit = null;

    return { success: true, phase: this.phase, trumpSuit: this.trumpSuit };
  }

  // Handle playing a card
  playCard(seatIndex, cardId) {
    if (this.phase !== PHASES.PLAYING) return { error: 'Not in playing phase' };
    if (seatIndex !== this.currentPlayerIndex) return { error: 'Not your turn' };

    const hand = this.hands[seatIndex];
    const cardIndex = hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return { error: 'Card not in your hand' };

    const card = hand[cardIndex];

    // Validate the play (must follow suit if possible)
    if (this.currentTrick.length > 0 && this.leadSuit) {
      const hasLeadSuit = hand.some(c => c.suit === this.leadSuit);
      if (hasLeadSuit && card.suit !== this.leadSuit) {
        return { error: `You must follow the lead suit (${this.leadSuit})` };
      }
    }

    // Remove card from hand
    hand.splice(cardIndex, 1);

    // If first card in trick, set lead suit
    if (this.currentTrick.length === 0) {
      this.leadSuit = card.suit;
    }

    this.currentTrick.push({ seatIndex, card });

    // Check if trick is complete (6 cards played)
    if (this.currentTrick.length === 6) {
      return this._resolveTrick();
    }

    // Move to next player
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % 6;
    return { success: true, phase: this.phase };
  }

  // Determine the winner of a trick
  _resolveTrick() {
    let winningPlay = this.currentTrick[0];

    for (let i = 1; i < this.currentTrick.length; i++) {
      const play = this.currentTrick[i];
      if (this._cardBeats(play.card, winningPlay.card)) {
        winningPlay = play;
      }
    }

    const winnerSeat = winningPlay.seatIndex;
    const winnerTeam = this.players[winnerSeat].team;
    this.trickCount[winnerTeam]++;

    const trickResult = {
      trick: [...this.currentTrick],
      winner: winnerSeat,
      winnerTeam,
      leadSuit: this.leadSuit,
      trickNumber: this.trickHistory.length + 1,
    };
    this.trickHistory.push(trickResult);

    // Reset for next trick
    this.currentTrick = [];
    this.leadSuit = null;
    this.currentPlayerIndex = winnerSeat; // Winner leads next

    // Check if round is over (8 tricks played)
    if (this.trickHistory.length === 8) {
      return this._endRound();
    }

    return {
      success: true,
      trickResult,
      phase: this.phase,
    };
  }

  // Compare two cards to see if challenger beats current winner
  _cardBeats(challenger, currentWinner) {
    // Trump beats non-trump
    if (challenger.suit === this.trumpSuit && currentWinner.suit !== this.trumpSuit) {
      return true;
    }
    // Non-trump can't beat trump
    if (challenger.suit !== this.trumpSuit && currentWinner.suit === this.trumpSuit) {
      return false;
    }
    // Same suit - higher value wins
    if (challenger.suit === currentWinner.suit) {
      return challenger.value > currentWinner.value;
    }
    // Different non-trump suit - can't beat (first played of lead suit wins by default)
    return false;
  }

  // End the round and calculate scores
  _endRound() {
    this.phase = PHASES.ROUND_OVER;

    const biddingTeam = this.players[this.biddingState.highestBidder].team;
    const bidValue = this.biddingState.highestBid;
    const biddingTeamTricks = this.trickCount[biddingTeam];
    const isForcedBid = this.biddingState.forcedBid;

    let scoreChange = { A: 0, B: 0 };

    if (biddingTeamTricks >= bidValue) {
      // Bidding team wins
      scoreChange[biddingTeam] = bidValue;
    } else {
      // Bidding team loses
      if (isForcedBid) {
        scoreChange[biddingTeam] = -5;
      } else {
        scoreChange[biddingTeam] = -2 * bidValue;
      }
    }

    this.scores.A += scoreChange.A;
    this.scores.B += scoreChange.B;

    const roundResult = {
      roundNumber: this.roundNumber,
      bidder: this.biddingState.highestBidder,
      bidderName: this.players[this.biddingState.highestBidder].name,
      biddingTeam,
      bidValue,
      isForcedBid,
      tricksWon: { ...this.trickCount },
      scoreChange,
      totalScores: { ...this.scores },
      biddingTeamWon: biddingTeamTricks >= bidValue,
    };

    this.roundHistory.push(roundResult);

    // Advance dealer
    this.dealerIndex = (this.dealerIndex + 1) % 6;

    return {
      success: true,
      phase: this.phase,
      roundResult,
    };
  }

  // Add chat message
  addChatMessage(playerId, message) {
    // Support lookup by either playerId or socket id
    const player = this.players.find(p => p.playerId === playerId || p.id === playerId);
    if (!player) return null;

    const chatMsg = {
      id: Date.now().toString(),
      playerName: player.name,
      team: player.team,
      message,
      timestamp: new Date().toISOString(),
    };
    this.chatMessages.push(chatMsg);
    // Keep last 100 messages
    if (this.chatMessages.length > 100) {
      this.chatMessages = this.chatMessages.slice(-100);
    }
    return chatMsg;
  }

  // Get full game state (sanitized for a specific player)
  getStateForPlayer(playerId) {
    // Support lookup by either stable playerId or current socket id
    const player = this.players.find(p => p.playerId === playerId || p.id === playerId);
    if (!player) return null;

    return {
      roomId: this.roomId,
      phase: this.phase,
      players: this.players.map(p => ({
        name: p.name,
        seatIndex: p.seatIndex,
        team: p.team,
        connected: p.connected,
        cardCount: this.hands[p.seatIndex] ? this.hands[p.seatIndex].length : 0,
        isMe: p.playerId === player.playerId,
      })),
      myHand: this.hands[player.seatIndex] || [],
      mySeat: player.seatIndex,
      myTeam: player.team,
      currentTrick: this.currentTrick,
      trickCount: this.trickCount,
      scores: this.scores,
      trumpSuit: this.trumpSuit,
      leadSuit: this.leadSuit,
      currentPlayerIndex: this.currentPlayerIndex,
      dealerIndex: this.dealerIndex,
      biddingState: {
        currentBidderIndex: this.biddingState.currentBidderIndex,
        highestBid: this.biddingState.highestBid,
        highestBidder: this.biddingState.highestBidder,
        bids: this.biddingState.bids,
        passCount: this.biddingState.passCount,
        forcedBid: this.biddingState.forcedBid,
      },
      trickHistory: this.trickHistory,
      roundHistory: this.roundHistory,
      roundNumber: this.roundNumber,
      chatMessages: this.chatMessages.slice(-50),
    };
  }

  // Get raw state (for server-side use)
  getState() {
    return {
      roomId: this.roomId,
      phase: this.phase,
      players: this.players,
      trickCount: this.trickCount,
      scores: this.scores,
      trumpSuit: this.trumpSuit,
      currentPlayerIndex: this.currentPlayerIndex,
      biddingState: this.biddingState,
      roundNumber: this.roundNumber,
    };
  }
}

module.exports = { GameEngine, PHASES };

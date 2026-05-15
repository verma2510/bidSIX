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
    this.dealerIndex = 0; // kept for bidding-start offset only (seat after shuffler bids first)
    this.biddingState = {
      currentBidderIndex: 0,
      bids: [], // { seatIndex, bid } or { seatIndex, pass: true }
      highestBid: null,
      highestBidder: null,
      passCount: 0,
      forcedBid: false,
    };
    this.trickHistory = []; // All tricks this round
    this.lastCompletedTrick = null; // Most recently completed trick (shown briefly before clearing)
    this.roundNumber = 0;
    this.chatMessages = [];

    // Bid Six scoring: points are raised on the LOSING team only.
    // raisedOn tracks which team currently has points raised against them.
    // When a team's raisedPoints drop to 0 and they start winning, raisedOn flips.
    this.raisedOn = null; // 'A' or 'B' — the team currently losing (points accumulated against them)
    this.raisedPoints = 0; // how many points are raised on raisedOn team

    // Shuffler always sits on the losing team's side; starts at seat 0.
    // When point-control flips, shuffler moves to the opposite team's adjacent seat.
    this.shufflerIndex = 0;

    // Admin: the player who created the room
    this.adminPlayerId = null;

    // Seat-selection: locks prevent two players choosing the same seat simultaneously
    // Map<seatIndex, { playerId, expiresAt }>  (lock auto-expires after SEAT_LOCK_MS)
    this.seatLocks = new Map();
  }

  // ----- Seat lock helpers -----
  static get SEAT_LOCK_MS() { return 3000; }

  _acquireSeatLock(seatIndex, playerId) {
    const now = Date.now();
    const existing = this.seatLocks.get(seatIndex);
    if (existing && existing.expiresAt > now && existing.playerId !== playerId) {
      return false; // seat is locked by someone else
    }
    this.seatLocks.set(seatIndex, { playerId, expiresAt: now + GameEngine.SEAT_LOCK_MS });
    return true;
  }

  _releaseSeatLock(seatIndex, playerId) {
    const lock = this.seatLocks.get(seatIndex);
    if (lock && lock.playerId === playerId) {
      this.seatLocks.delete(seatIndex);
    }
  }

  // Returns a cleaned-up seats array for broadcasting
  getSeatsSnapshot() {
    const now = Date.now();
    const snapshot = Array.from({ length: 6 }, (_, i) => {
      const player = this.players.find(p => p.seatIndex === i);
      const lock = this.seatLocks.get(i);
      const isLocked = lock && lock.expiresAt > now && !player; // only show lock if seat is empty
      return {
        seatIndex: i,
        team: i % 2 === 0 ? 'A' : 'B',
        player: player ? { name: player.name, playerId: player.playerId, connected: player.connected, isAdmin: player.playerId === this.adminPlayerId } : null,
        locked: !!isLocked,
        lockedByMe: isLocked ? lock.playerId : null,
      };
    });
    return snapshot;
  }

  // Add a player to the game (optionally at a chosen seat)
  // If targetSeat is provided and available, the player takes it; otherwise the first free seat is used.
  addPlayer(playerId, playerName, targetSeat = null) {
    if (this.players.length >= 6) return null;

    // Determine which seat to occupy
    let seatIndex;
    if (targetSeat !== null && targetSeat >= 0 && targetSeat < 6) {
      const occupied = this.players.some(p => p.seatIndex === targetSeat);
      seatIndex = occupied ? null : targetSeat;
    }
    if (seatIndex === null || seatIndex === undefined) {
      // Fall back: first free slot
      const taken = new Set(this.players.map(p => p.seatIndex));
      seatIndex = [0,1,2,3,4,5].find(i => !taken.has(i));
      if (seatIndex === undefined) return null;
    }

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
    this._releaseSeatLock(seatIndex, playerId); // release lock now that seat is taken

    // First player added is the admin (room creator)
    if (this.adminPlayerId === null) {
      this.adminPlayerId = playerId;
    }

    return player;
  }

  // Check if a playerId is the admin
  isAdmin(playerId) {
    return this.adminPlayerId === playerId;
  }

  // Admin kicks a player (only during waiting phase)
  kickPlayer(adminId, targetPlayerId) {
    if (this.adminPlayerId !== adminId) return { error: 'Only the admin can kick players' };
    if (adminId === targetPlayerId) return { error: 'Cannot kick yourself' };
    if (this.phase !== PHASES.WAITING) return { error: 'Cannot kick during a game' };

    const target = this.players.find(p => p.playerId === targetPlayerId);
    if (!target) return { error: 'Player not found' };

    const kickedInfo = { name: target.name, seatIndex: target.seatIndex, team: target.team, playerId: target.playerId };
    const idx = this.players.findIndex(p => p.playerId === targetPlayerId);
    if (idx !== -1) this.players.splice(idx, 1);

    return { success: true, kicked: kickedInfo };
  }

  // Move an existing player to a different empty seat
  chooseSeat(playerId, targetSeat) {
    if (this.phase !== PHASES.WAITING) return { error: 'Cannot switch seats after game starts' };
    if (targetSeat < 0 || targetSeat > 5) return { error: 'Invalid seat index' };

    const player = this.players.find(p => p.playerId === playerId);
    if (!player) return { error: 'Player not found' };

    // Check target seat is not occupied
    const occupant = this.players.find(p => p.seatIndex === targetSeat);
    if (occupant && occupant.playerId !== playerId) return { error: 'Seat is already taken' };

    // Try to acquire lock
    if (!this._acquireSeatLock(targetSeat, playerId)) {
      return { error: 'Seat is temporarily locked. Try again in a moment.' };
    }

    const oldSeat = player.seatIndex;
    player.seatIndex = targetSeat;
    player.team = targetSeat % 2 === 0 ? 'A' : 'B';

    // Release lock on old seat if we held it
    this._releaseSeatLock(oldSeat, playerId);
    // The new seat lock is released immediately since player now occupies it
    this._releaseSeatLock(targetSeat, playerId);

    return { success: true, player };
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
    this.lastCompletedTrick = null;
    this.trickCount = { A: 0, B: 0 };
    this.trickHistory = [];

    // Create and deal cards
    const deck = shuffleDeck(createDeck());
    this.hands = dealCards(deck, 6, 8);

    // Bidding starts with the player after the shuffler
    this.biddingState = {
      currentBidderIndex: (this.shufflerIndex + 1) % 6,
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
    const winnerPlayer = this.players.find(p => p.seatIndex === winnerSeat);
    const winnerTeam = winnerPlayer ? winnerPlayer.team : (winnerSeat % 2 === 0 ? 'A' : 'B');
    this.trickCount[winnerTeam]++;

    const trickResult = {
      trick: [...this.currentTrick],
      winner: winnerSeat,
      winnerTeam,
      leadSuit: this.leadSuit,
      trickNumber: this.trickHistory.length + 1,
    };
    this.trickHistory.push(trickResult);

    // Store the completed trick so the frontend can display it briefly
    this.lastCompletedTrick = trickResult;

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

  // End the round and calculate scores (Bid Six rules).
  // Points are raised only on the losing team. raisedOn / raisedPoints track state.
  // When point-control flips (loser reaches 0 and becomes winner), the shuffler
  // moves to the adjacent seat on the newly-losing team's side.
  _endRound() {
    this.phase = PHASES.ROUND_OVER;

    const highestBidderPlayer = this.players.find(p => p.seatIndex === this.biddingState.highestBidder);
    const biddingTeam = highestBidderPlayer ? highestBidderPlayer.team : (this.biddingState.highestBidder % 2 === 0 ? 'A' : 'B');
    const opposingTeam = biddingTeam === 'A' ? 'B' : 'A';
    const bidValue = this.biddingState.highestBid;
    const biddingTeamTricks = this.trickCount[biddingTeam];
    const isForcedBid = this.biddingState.forcedBid;
    const biddingTeamWon = biddingTeamTricks >= bidValue;

    // Determine how many points shift this round
    let pointsThisRound;
    if (biddingTeamWon) {
      pointsThisRound = bidValue;
    } else {
      pointsThisRound = isForcedBid ? 5 : 2 * bidValue;
    }

    // Winning team = team that should have points raised against them reduced (or opponent raised).
    // If bidding team won → opposing team is "penalised" (raisedOn = opposing team or points go up on them).
    // If bidding team lost → bidding team is penalised.
    const penalisedTeam = biddingTeamWon ? opposingTeam : biddingTeam;

    // --- Apply Bid Six point-raising logic ---
    const shufflerFlipped = this._applyRaisedPoints(penalisedTeam, pointsThisRound);

    const roundResult = {
      roundNumber: this.roundNumber,
      bidder: this.biddingState.highestBidder,
      bidderName: highestBidderPlayer ? highestBidderPlayer.name : 'Unknown',
      biddingTeam,
      bidValue,
      isForcedBid,
      tricksWon: { ...this.trickCount },
      biddingTeamWon,
      pointsThisRound,
      penalisedTeam,
      raisedOn: this.raisedOn,
      raisedPoints: this.raisedPoints,
      shufflerFlipped,
      shufflerIndex: this.shufflerIndex,
      // Legacy fields kept for Scoreboard/RoundResult display compat
      scoreChange: { A: 0, B: 0 }, // unused now but kept to avoid UI crashes
      totalScores: { A: this.raisedOn === 'A' ? this.raisedPoints : 0, B: this.raisedOn === 'B' ? this.raisedPoints : 0 },
    };

    this.roundHistory.push(roundResult);

    // Advance shuffler one seat within the same team (unless already flipped by _applyRaisedPoints)
    if (!shufflerFlipped) {
      this.dealerIndex = (this.shufflerIndex + 2) % 6; // next same-team seat (+2 skips the other team's seat)
      this.shufflerIndex = (this.shufflerIndex + 2) % 6;
    }

    return {
      success: true,
      phase: this.phase,
      roundResult,
    };
  }

  // Apply raised-points logic. Returns true if point-control flipped (shuffler was reassigned).
  _applyRaisedPoints(penalisedTeam, points) {
    // First round ever — set initial loser
    if (this.raisedOn === null) {
      this.raisedOn = penalisedTeam;
      this.raisedPoints = points;
      // Shuffler starts on penalisedTeam — find the first seat belonging to that team
      this.shufflerIndex = this._firstSeatOfTeam(penalisedTeam);
      this.dealerIndex = this.shufflerIndex;
      return false;
    }

    if (penalisedTeam === this.raisedOn) {
      // Same team gets penalised again — just add points
      this.raisedPoints += points;
      return false;
    }

    // Opposing team is now penalised — subtract from raisedPoints
    if (points < this.raisedPoints) {
      // Partial reduction — current losing team still losing, just fewer points
      this.raisedPoints -= points;
      return false;
    }

    // Points >= raisedPoints: current loser cancelled their debt; surplus raises on penalisedTeam
    const surplus = points - this.raisedPoints;
    this.raisedOn = penalisedTeam;
    this.raisedPoints = surplus;

    // Shuffler flips to the opposite team's adjacent seat (seat + 1 mod 6)
    this.shufflerIndex = (this.shufflerIndex + 1) % 6;
    this.dealerIndex = this.shufflerIndex;
    return true;
  }

  // Returns the lowest seat index belonging to a team (A = even seats, B = odd seats)
  _firstSeatOfTeam(team) {
    return team === 'A' ? 0 : 1;
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
        isAdmin: p.playerId === this.adminPlayerId,
      })),
      imAdmin: player.playerId === this.adminPlayerId,
      seats: this.getSeatsSnapshot().map(s => ({
        ...s,
        lockedByMe: s.lockedByMe === player.playerId,
      })),
      myHand: this.hands[player.seatIndex] || [],
      mySeat: player.seatIndex,
      myTeam: player.team,
      currentTrick: this.currentTrick,
      lastCompletedTrick: this.lastCompletedTrick,
      trickCount: this.trickCount,
      scores: this.scores,
      raisedOn: this.raisedOn,
      raisedPoints: this.raisedPoints,
      trumpSuit: this.trumpSuit,
      leadSuit: this.leadSuit,
      currentPlayerIndex: this.currentPlayerIndex,
      shufflerIndex: this.shufflerIndex,
      dealerIndex: this.shufflerIndex,
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
      raisedOn: this.raisedOn,
      raisedPoints: this.raisedPoints,
      shufflerIndex: this.shufflerIndex,
      trumpSuit: this.trumpSuit,
      currentPlayerIndex: this.currentPlayerIndex,
      biddingState: this.biddingState,
      roundNumber: this.roundNumber,
    };
  }
}

module.exports = { GameEngine, PHASES };

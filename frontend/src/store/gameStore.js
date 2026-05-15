// Zustand store for game state management
import { create } from 'zustand';

// ---------- localStorage helpers ----------
const SESSION_KEY = 'bid6_session';

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveSession(partial) {
  try {
    const current = loadSession();
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...current, ...partial }));
  } catch { /* quota / incognito – ignore */ }
}

export function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

// ---------- Restored state from previous session ----------
const restored = loadSession();

const useGameStore = create((set, get) => ({
  // Connection state
  connected: false,
  playerName: restored.playerName || '',
  roomId: restored.roomId || null,
  myPlayer: restored.myPlayer || null,

  // Reconnection state
  reconnecting: !!(restored.roomId), // true if we have a saved session to rejoin
  reconnectFailed: false,

  // Game state (from server)
  gameState: null,

  // Chat state — maintained independently so messages appear instantly
  chatMessages: [],
  chatToasts: [],   // transient overlay bubbles that auto-dismiss

  // UI state
  selectedCard: null,
  showChat: false,
  showScoreboard: false,
  notifications: [],
  trickAnimation: null,

  // Actions
  setConnected: (connected) => set({ connected }),

  setPlayerName: (playerName) => {
    saveSession({ playerName });
    set({ playerName });
  },

  setRoomId: (roomId) => {
    saveSession({ roomId });
    set({ roomId });
  },

  setMyPlayer: (myPlayer) => {
    saveSession({ myPlayer });
    set({ myPlayer });
  },

  setGameState: (gameState) => set((state) => {
    // Restore chat history from server state on reconnect (when server has more messages)
    const serverMsgs = gameState?.chatMessages || [];
    const chatMessages = serverMsgs.length > state.chatMessages.length ? serverMsgs : state.chatMessages;
    return { gameState, chatMessages };
  }),
  setSelectedCard: (selectedCard) => set({ selectedCard }),

  addChatMessage: (msg) => {
    const toastId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    set((state) => ({
      chatMessages: [...state.chatMessages, msg],
      chatToasts: [...state.chatToasts, { ...msg, toastId }],
    }));
    setTimeout(() => {
      set((state) => ({ chatToasts: state.chatToasts.filter(t => t.toastId !== toastId) }));
    }, 4000);
  },

  toggleChat: () => set((state) => ({ showChat: !state.showChat })),
  toggleScoreboard: () => set((state) => ({ showScoreboard: !state.showScoreboard })),
  setTrickAnimation: (trickAnimation) => set({ trickAnimation }),

  setReconnecting: (reconnecting) => set({ reconnecting }),
  setReconnectFailed: (reconnectFailed) => set({ reconnectFailed }),
  
  addNotification: (message, type = 'info') => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    set((state) => ({
      notifications: [...state.notifications, { id, message, type }],
    }));
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    }, 3000);
  },

  // Reset state (e.g. when leaving a room or session expires)
  resetGame: () => {
    clearSession();
    set({
      roomId: null,
      myPlayer: null,
      gameState: null,
      selectedCard: null,
      showChat: false,
      showScoreboard: false,
      trickAnimation: null,
      reconnecting: false,
      reconnectFailed: false,
      chatMessages: [],
      chatToasts: [],
    });
  },
}));

export default useGameStore;

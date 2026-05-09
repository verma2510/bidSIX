// Zustand store for game state management
import { create } from 'zustand';

const useGameStore = create((set, get) => ({
  // Connection state
  connected: false,
  playerName: '',
  roomId: null,
  myPlayer: null,

  // Game state (from server)
  gameState: null,
  
  // UI state
  selectedCard: null,
  showChat: false,
  showScoreboard: false,
  notifications: [],
  trickAnimation: null,

  // Actions
  setConnected: (connected) => set({ connected }),
  setPlayerName: (playerName) => set({ playerName }),
  setRoomId: (roomId) => set({ roomId }),
  setMyPlayer: (myPlayer) => set({ myPlayer }),
  setGameState: (gameState) => set({ gameState }),
  setSelectedCard: (selectedCard) => set({ selectedCard }),
  toggleChat: () => set((state) => ({ showChat: !state.showChat })),
  toggleScoreboard: () => set((state) => ({ showScoreboard: !state.showScoreboard })),
  setTrickAnimation: (trickAnimation) => set({ trickAnimation }),
  
  addNotification: (message, type = 'info') => {
    const id = Date.now();
    set((state) => ({
      notifications: [...state.notifications, { id, message, type }],
    }));
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    }, 3000);
  },

  // Reset state
  resetGame: () => set({
    roomId: null,
    myPlayer: null,
    gameState: null,
    selectedCard: null,
    showChat: false,
    showScoreboard: false,
    trickAnimation: null,
  }),
}));

export default useGameStore;

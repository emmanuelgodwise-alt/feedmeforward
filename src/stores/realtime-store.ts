import { create } from 'zustand';

interface RealtimeState {
  // Connection status
  isConnected: boolean;

  // Pending notification count from real-time events
  pendingNotifications: number;

  // Pending messages per conversation (keyed by other user ID)
  pendingMessages: Record<string, number>;

  // Timestamp of the last real-time event received
  lastEventAt: number | null;

  // Actions
  setConnected: (connected: boolean) => void;
  addPendingNotification: () => void;
  clearPendingNotifications: () => void;
  addPendingMessage: (conversationId: string) => void;
  clearPendingMessages: (conversationId: string) => void;
  setLastEventAt: (timestamp: number) => void;
  reset: () => void;
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  isConnected: false,
  pendingNotifications: 0,
  pendingMessages: {},
  lastEventAt: null,

  setConnected: (connected) => set({ isConnected: connected }),

  addPendingNotification: () =>
    set((state) => ({
      pendingNotifications: state.pendingNotifications + 1,
      lastEventAt: Date.now(),
    })),

  clearPendingNotifications: () =>
    set({ pendingNotifications: 0 }),

  addPendingMessage: (conversationId) =>
    set((state) => ({
      pendingMessages: {
        ...state.pendingMessages,
        [conversationId]: (state.pendingMessages[conversationId] || 0) + 1,
      },
      lastEventAt: Date.now(),
    })),

  clearPendingMessages: (conversationId) =>
    set((state) => {
      const next = { ...state.pendingMessages };
      delete next[conversationId];
      return { pendingMessages: next };
    }),

  setLastEventAt: (timestamp) => set({ lastEventAt: timestamp }),

  reset: () =>
    set({
      isConnected: false,
      pendingNotifications: 0,
      pendingMessages: {},
      lastEventAt: null,
    }),
}));

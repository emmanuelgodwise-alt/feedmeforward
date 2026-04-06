import { create } from 'zustand';

// ─── Types ─────────────────────────────────────────────────────────

export interface ConversationUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  role?: string;
}

export interface ConversationItem {
  id: string;
  type: string;
  name: string | null;
  avatarUrl: string | null;
  lastMessage: string | null;
  lastActivityAt: string;
  memberCount: number;
  otherUser: ConversationUser | null;
  unreadCount: number;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  type: string;
  content: string | null;
  mediaUrl: string | null;
  replyToId: string | null;
  isRead: boolean;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  replyTo?: {
    id: string;
    content: string | null;
    senderId: string;
    sender: { id: string; username: string; displayName: string | null };
  } | null;
}

export interface ActiveCall {
  type: 'voice' | 'video';
  callId: string;
  conversationId: string;
  status: string;
  isMuted: boolean;
  isCameraOff: boolean;
  isIncoming: boolean;
  callerInfo?: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export interface ConversationDetail {
  id: string;
  type: string;
  name: string | null;
  avatarUrl: string | null;
  lastMessage: string | null;
  lastActivityAt: string;
  members: ConversationUser[];
  messages: MessageItem[];
}

// ─── Store ─────────────────────────────────────────────────────────

interface ChatState {
  // Conversations list
  conversations: ConversationItem[];
  isLoading: boolean;

  // Current conversation
  currentConversation: ConversationDetail | null;
  isMessagesLoading: boolean;

  // Active call
  activeCall: ActiveCall | null;

  // Incoming call
  incomingCall: ActiveCall | null;

  // Actions
  fetchConversations: (userId: string) => Promise<void>;
  fetchConversation: (id: string, userId: string) => Promise<void>;
  fetchMessages: (conversationId: string, before?: string) => Promise<MessageItem[] | null>;
  sendMessage: (conversationId: string, message: { type?: string; content?: string; mediaUrl?: string; replyToId?: string }, userId: string) => Promise<MessageItem | null>;
  createConversation: (participantIds: string[], type?: string, name?: string) => Promise<ConversationItem | null>;
  markAsRead: (conversationId: string, userId: string) => Promise<void>;
  clearCurrentConversation: () => void;

  // Call actions
  startCall: (conversationId: string, type: 'voice' | 'video', userId: string) => Promise<ActiveCall | null>;
  answerCall: (callId: string, type: 'voice' | 'video', userId: string) => Promise<boolean>;
  endCall: (callId: string, type: 'voice' | 'video', userId: string) => Promise<void>;
  setActiveCall: (call: ActiveCall | null) => void;
  setIncomingCall: (call: ActiveCall | null) => void;

  // Signal actions
  sendSignal: (signal: { callId: string; callType: 'voice' | 'video'; signalType: string; content: string }) => Promise<void>;
  pollSignals: (callId: string, callType: 'voice' | 'video', userId: string, after?: string) => Promise<unknown[]>;

  // Optimistic updates
  addMessageLocally: (message: MessageItem) => void;
  updateConversationInList: (conversationId: string, updates: Partial<ConversationItem>) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  isLoading: false,
  currentConversation: null,
  isMessagesLoading: false,
  activeCall: null,
  incomingCall: null,

  fetchConversations: async (userId: string) => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/conversations', {
        headers: { 'X-User-Id': userId },
      });
      if (res.ok) {
        const data = await res.json();
        set({ conversations: data.conversations || [] });
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchConversation: async (id: string, userId: string) => {
    set({ isMessagesLoading: true });
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        headers: { 'X-User-Id': userId },
      });
      if (res.ok) {
        const data = await res.json();
        set({ currentConversation: data.conversation });
      }
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  fetchMessages: async (conversationId: string, before?: string) => {
    try {
      const userId = get().conversations.length > 0 ? '' : '';
      const params = new URLSearchParams();
      if (before) params.set('before', before);
      const res = await fetch(`/api/conversations/${conversationId}/messages?${params}`, {
        headers: { 'X-User-Id': userId || 'unknown' },
      });
      if (res.ok) {
        const data = await res.json();
        return data.messages || [];
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
    return null;
  },

  sendMessage: async (conversationId, message, userId) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
        body: JSON.stringify(message),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.message) {
          return data.message as MessageItem;
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
    return null;
  },

  createConversation: async (participantIds, type = 'direct', name) => {
    try {
      const userId = getAuthUserId();
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
        body: JSON.stringify({ participantIds, type, name }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.conversation) {
          return data.conversation as unknown as ConversationItem;
        }
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
    return null;
  },

  markAsRead: async (conversationId, userId) => {
    try {
      await fetch(`/api/conversations/${conversationId}/read`, {
        method: 'POST',
        headers: { 'X-User-Id': userId },
      });
      // Update local state
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c
        ),
      }));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  },

  clearCurrentConversation: () => {
    set({ currentConversation: null });
  },

  // Call actions
  startCall: async (conversationId, type, userId) => {
    try {
      const res = await fetch(`/api/calls/${type}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
        body: JSON.stringify({ conversationId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.call) {
          const call: ActiveCall = {
            type,
            callId: data.call.id,
            conversationId,
            status: data.call.status,
            isMuted: false,
            isCameraOff: type === 'video',
            isIncoming: false,
          };
          set({ activeCall: call });
          return call;
        }
      }
    } catch (error) {
      console.error('Failed to start call:', error);
    }
    return null;
  },

  answerCall: async (callId, type, userId) => {
    try {
      const res = await fetch(`/api/calls/${type}/${callId}/answer`, {
        method: 'POST',
        headers: { 'X-User-Id': userId },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          set((state) => ({
            activeCall: state.activeCall
              ? { ...state.activeCall, status: 'ongoing' }
              : null,
            incomingCall: null,
          }));
          return true;
        }
      }
    } catch (error) {
      console.error('Failed to answer call:', error);
    }
    return false;
  },

  endCall: async (callId, type, userId) => {
    try {
      await fetch(`/api/calls/${type}/${callId}/end`, {
        method: 'POST',
        headers: { 'X-User-Id': userId },
      });
      set({ activeCall: null, incomingCall: null });
    } catch (error) {
      console.error('Failed to end call:', error);
    }
  },

  setActiveCall: (call) => {
    set({ activeCall: call });
  },

  setIncomingCall: (call) => {
    set({ incomingCall: call });
  },

  sendSignal: async (signal) => {
    try {
      await fetch('/api/calls/signal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': getAuthUserId(),
        },
        body: JSON.stringify(signal),
      });
    } catch (error) {
      console.error('Failed to send signal:', error);
    }
  },

  pollSignals: async (callId, callType, userId, after) => {
    try {
      const params = new URLSearchParams({ callId, callType });
      if (after) params.set('after', after);
      const res = await fetch(`/api/calls/signal?${params}`, {
        headers: { 'X-User-Id': userId },
      });
      if (res.ok) {
        const data = await res.json();
        return data.signals || [];
      }
    } catch (error) {
      console.error('Failed to poll signals:', error);
    }
    return [];
  },

  addMessageLocally: (message) => {
    set((state) => {
      if (!state.currentConversation) return state;
      return {
        currentConversation: {
          ...state.currentConversation,
          messages: [...state.currentConversation.messages, message],
        },
      };
    });
  },

  updateConversationInList: (conversationId, updates) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, ...updates } : c
      ),
    }));
  },
}));

// Helper to get user ID from auth store
function getAuthUserId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.state?.currentUser?.id || '';
    }
  } catch {
    // ignore
  }
  return '';
}

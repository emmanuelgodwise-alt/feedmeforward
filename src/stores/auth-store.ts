import { create } from 'zustand';

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  memberScore: number;
  walletBalance: number;
  isVerified: boolean;
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUserScore: (score: number, isVerified: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  isAuthenticated: false,
  login: (user: User) =>
    set({
      currentUser: user,
      isAuthenticated: true,
    }),
  logout: () =>
    set({
      currentUser: null,
      isAuthenticated: false,
    }),
  refreshUser: async () => {
    const { currentUser } = get();
    if (!currentUser) return;

    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'X-User-Id': currentUser.id },
      });
      const json = await res.json();
      if (json.success && json.user) {
        set({ currentUser: json.user });
      }
    } catch {
      // Silently fail — user data remains unchanged
    }
  },
  updateUserScore: (score: number, isVerified: boolean) => {
    const current = get().currentUser;
    if (current) {
      set({ currentUser: { ...current, memberScore: score, isVerified } });
    }
  },
}));

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
}

export const useAuthStore = create<AuthState>((set) => ({
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
}));

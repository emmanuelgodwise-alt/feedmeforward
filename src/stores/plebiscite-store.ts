import { create } from 'zustand';
import { useAuthStore } from '@/stores/auth-store';

// ─── Types ──────────────────────────────────────────────────────────

export interface Plebiscite {
  id: string;
  creatorId: string;
  title: string;
  description: string | null;
  optionALabel: string;
  optionAVideoUrl: string | null;
  optionAThumbnail: string | null;
  optionBLabel: string;
  optionBVideoUrl: string | null;
  optionBThumbnail: string | null;
  optionAVotes: number;
  optionBVotes: number;
  totalVotes: number;
  verifiedOnly: boolean;
  status: string;
  opensAt: string;
  closesAt: string | null;
  winnerLabel: string | null;
  createdAt: string;
  creator?: { username: string; displayName: string | null; avatarUrl: string | null };
  userVoted?: boolean;
  userChoice?: string;
}

interface CreatePlebisciteData {
  title: string;
  description?: string | null;
  optionALabel: string;
  optionAVideoUrl?: string | null;
  optionAThumbnail?: string | null;
  optionBLabel: string;
  optionBVideoUrl?: string | null;
  optionBThumbnail?: string | null;
  verifiedOnly?: boolean;
  opensAt?: string;
  closesAt?: string | null;
}

// ─── Store Interface ──────────────────────────────────────────────

interface PlebisciteState {
  plebiscites: Plebiscite[];
  currentPlebiscite: Plebiscite | null;
  isLoading: boolean;
  error: string | null;
  fetchPlebiscites: () => Promise<void>;
  fetchPlebiscite: (id: string) => Promise<void>;
  createPlebiscite: (data: CreatePlebisciteData) => Promise<Plebiscite | null>;
  vote: (plebisciteId: string, choice: string) => Promise<void>;
  closePlebiscite: (id: string) => Promise<boolean>;
  clearCurrentPlebiscite: () => void;
}

// ─── Store ──────────────────────────────────────────────────────────

export const usePlebisciteStore = create<PlebisciteState>((set, get) => ({
  plebiscites: [],
  currentPlebiscite: null,
  isLoading: false,
  error: null,

  fetchPlebiscites: async () => {
    set({ isLoading: true, error: null });
    try {
      const userId = useAuthStore.getState().currentUser?.id;
      const res = await fetch('/api/plebiscites', {
        headers: userId ? { 'X-User-Id': userId } : {},
      });
      const json = await res.json();

      if (json.success) {
        set({ plebiscites: json.data, isLoading: false });
      } else {
        set({ error: json.error || 'Failed to fetch plebiscites', isLoading: false });
      }
    } catch {
      set({ error: 'Network error', isLoading: false });
    }
  },

  fetchPlebiscite: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const userId = useAuthStore.getState().currentUser?.id;
      const res = await fetch(`/api/plebiscites/${id}`, {
        headers: userId ? { 'X-User-Id': userId } : {},
      });
      const json = await res.json();

      if (json.success) {
        set({ currentPlebiscite: json.data, isLoading: false });
      } else {
        set({ error: json.error || 'Failed to fetch plebiscite', isLoading: false });
      }
    } catch {
      set({ error: 'Network error', isLoading: false });
    }
  },

  createPlebiscite: async (data: CreatePlebisciteData) => {
    const userId = useAuthStore.getState().currentUser?.id;
    if (!userId) return null;

    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/plebiscites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (json.success) {
        const existing = get().plebiscites;
        set({
          plebiscites: [json.data, ...existing],
          isLoading: false,
        });
        return json.data as Plebiscite;
      } else {
        set({ error: json.error || 'Failed to create plebiscite', isLoading: false });
        return null;
      }
    } catch {
      set({ error: 'Network error', isLoading: false });
      return null;
    }
  },

  vote: async (plebisciteId: string, choice: string) => {
    const userId = useAuthStore.getState().currentUser?.id;
    if (!userId) return;

    // Optimistic update
    set((state) => {
      const updateVoteCounts = (p: Plebiscite) => ({
        ...p,
        userVoted: true,
        userChoice: choice,
        optionAVotes: choice === 'A' ? p.optionAVotes + 1 : p.optionAVotes,
        optionBVotes: choice === 'B' ? p.optionBVotes + 1 : p.optionBVotes,
        totalVotes: p.totalVotes + 1,
      });

      const updatedList = state.plebiscites.map((p) =>
        p.id === plebisciteId ? updateVoteCounts(p) : p
      );

      const updatedCurrent =
        state.currentPlebiscite?.id === plebisciteId
          ? updateVoteCounts(state.currentPlebiscite)
          : state.currentPlebiscite;

      return { plebiscites: updatedList, currentPlebiscite: updatedCurrent };
    });

    try {
      await fetch(`/api/plebiscites/${plebisciteId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify({ choice }),
      });
    } catch {
      // Silently fail — optimistic update already applied
    }
  },

  closePlebiscite: async (id: string) => {
    const userId = useAuthStore.getState().currentUser?.id;
    if (!userId) return false;

    try {
      const res = await fetch(`/api/plebiscites/${id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
      });
      const json = await res.json();

      if (json.success) {
        set((state) => {
          const updatedList = state.plebiscites.map((p) =>
            p.id === id ? { ...p, status: 'closed', winnerLabel: json.data?.winnerLabel ?? p.winnerLabel } : p
          );
          const updatedCurrent =
            state.currentPlebiscite?.id === id
              ? { ...state.currentPlebiscite, status: 'closed', winnerLabel: json.data?.winnerLabel ?? state.currentPlebiscite.winnerLabel }
              : state.currentPlebiscite;
          return { plebiscites: updatedList, currentPlebiscite: updatedCurrent };
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  clearCurrentPlebiscite: () => {
    set({ currentPlebiscite: null });
  },
}));

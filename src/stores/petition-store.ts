import { create } from 'zustand';
import { useAuthStore } from '@/stores/auth-store';

// ─── Types ──────────────────────────────────────────────────────────

export interface PetitionSignature {
  id: string;
  userId: string;
  videoUrl: string | null;
  comment: string | null;
  createdAt: string;
  user?: { username: string; displayName: string | null; avatarUrl: string | null };
}

export interface Petition {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  targetName: string | null;
  targetTitle: string | null;
  goalSignatures: number | null;
  currentSignatures: number;
  status: string;
  opensAt: string;
  closesAt: string | null;
  deliveredAt: string | null;
  responseText: string | null;
  tags: string | null;
  createdAt: string;
  creator?: { username: string; displayName: string | null; avatarUrl: string | null };
  userSigned?: boolean;
  signatures?: PetitionSignature[];
}

interface CreatePetitionData {
  title: string;
  description: string;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  targetName?: string | null;
  targetTitle?: string | null;
  goalSignatures?: number | null;
  opensAt?: string;
  closesAt?: string | null;
  tags?: string | null;
}

interface SignPetitionData {
  videoUrl?: string | null;
  comment?: string | null;
}

// ─── Store Interface ──────────────────────────────────────────────

interface PetitionState {
  petitions: Petition[];
  currentPetition: Petition | null;
  isLoading: boolean;
  error: string | null;
  fetchPetitions: () => Promise<void>;
  fetchPetition: (id: string) => Promise<void>;
  createPetition: (data: CreatePetitionData) => Promise<Petition | null>;
  signPetition: (id: string, data?: SignPetitionData) => Promise<void>;
  deliverPetition: (id: string) => Promise<boolean>;
  respondPetition: (id: string, responseText: string) => Promise<boolean>;
  resolvePetition: (id: string) => Promise<boolean>;
  clearCurrentPetition: () => void;
}

// ─── Store ──────────────────────────────────────────────────────────

export const usePetitionStore = create<PetitionState>((set, get) => ({
  petitions: [],
  currentPetition: null,
  isLoading: false,
  error: null,

  fetchPetitions: async () => {
    set({ isLoading: true, error: null });
    try {
      const userId = useAuthStore.getState().currentUser?.id;
      const res = await fetch('/api/petitions', {
        headers: userId ? { 'X-User-Id': userId } : {},
      });
      const json = await res.json();

      if (json.success) {
        set({ petitions: json.data, isLoading: false });
      } else {
        set({ error: json.error || 'Failed to fetch petitions', isLoading: false });
      }
    } catch {
      set({ error: 'Network error', isLoading: false });
    }
  },

  fetchPetition: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const userId = useAuthStore.getState().currentUser?.id;
      const res = await fetch(`/api/petitions/${id}`, {
        headers: userId ? { 'X-User-Id': userId } : {},
      });
      const json = await res.json();

      if (json.success) {
        set({ currentPetition: json.data, isLoading: false });
      } else {
        set({ error: json.error || 'Failed to fetch petition', isLoading: false });
      }
    } catch {
      set({ error: 'Network error', isLoading: false });
    }
  },

  createPetition: async (data: CreatePetitionData) => {
    const userId = useAuthStore.getState().currentUser?.id;
    if (!userId) return null;

    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/petitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (json.success) {
        const existing = get().petitions;
        set({
          petitions: [json.data, ...existing],
          isLoading: false,
        });
        return json.data as Petition;
      } else {
        set({ error: json.error || 'Failed to create petition', isLoading: false });
        return null;
      }
    } catch {
      set({ error: 'Network error', isLoading: false });
      return null;
    }
  },

  signPetition: async (id: string, data?: SignPetitionData) => {
    const userId = useAuthStore.getState().currentUser?.id;
    if (!userId) return;

    // Optimistic update
    set((state) => {
      const updateSignCounts = (p: Petition) => ({
        ...p,
        userSigned: true,
        currentSignatures: p.currentSignatures + 1,
        signatures: p.signatures
          ? [
              ...p.signatures,
              {
                id: `optimistic-${Date.now()}`,
                userId,
                videoUrl: data?.videoUrl ?? null,
                comment: data?.comment ?? null,
                createdAt: new Date().toISOString(),
              },
            ]
          : p.signatures,
      });

      const updatedList = state.petitions.map((p) =>
        p.id === id ? updateSignCounts(p) : p
      );

      const updatedCurrent =
        state.currentPetition?.id === id
          ? updateSignCounts(state.currentPetition)
          : state.currentPetition;

      return { petitions: updatedList, currentPetition: updatedCurrent };
    });

    try {
      await fetch(`/api/petitions/${id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify(data ?? {}),
      });
    } catch {
      // Silently fail — optimistic update already applied
    }
  },

  deliverPetition: async (id: string) => {
    const userId = useAuthStore.getState().currentUser?.id;
    if (!userId) return false;

    try {
      const res = await fetch(`/api/petitions/${id}/deliver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
      });
      const json = await res.json();

      if (json.success) {
        set((state) => {
          const updatedList = state.petitions.map((p) =>
            p.id === id ? { ...p, status: 'delivered', deliveredAt: json.data?.deliveredAt ?? new Date().toISOString() } : p
          );
          const updatedCurrent =
            state.currentPetition?.id === id
              ? { ...state.currentPetition, status: 'delivered', deliveredAt: json.data?.deliveredAt ?? new Date().toISOString() }
              : state.currentPetition;
          return { petitions: updatedList, currentPetition: updatedCurrent };
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  respondPetition: async (id: string, responseText: string) => {
    const userId = useAuthStore.getState().currentUser?.id;
    if (!userId) return false;

    try {
      const res = await fetch(`/api/petitions/${id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify({ responseText }),
      });
      const json = await res.json();

      if (json.success) {
        set((state) => {
          const updatedList = state.petitions.map((p) =>
            p.id === id ? { ...p, status: 'responded', responseText } : p
          );
          const updatedCurrent =
            state.currentPetition?.id === id
              ? { ...state.currentPetition, status: 'responded', responseText }
              : state.currentPetition;
          return { petitions: updatedList, currentPetition: updatedCurrent };
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  resolvePetition: async (id: string) => {
    const userId = useAuthStore.getState().currentUser?.id;
    if (!userId) return false;

    try {
      const res = await fetch(`/api/petitions/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
      });
      const json = await res.json();

      if (json.success) {
        set((state) => {
          const updatedList = state.petitions.map((p) =>
            p.id === id ? { ...p, status: 'resolved' } : p
          );
          const updatedCurrent =
            state.currentPetition?.id === id
              ? { ...state.currentPetition, status: 'resolved' }
              : state.currentPetition;
          return { petitions: updatedList, currentPetition: updatedCurrent };
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  clearCurrentPetition: () => {
    set({ currentPetition: null });
  },
}));

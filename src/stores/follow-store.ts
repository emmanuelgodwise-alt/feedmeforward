import { create } from 'zustand';
import { useAuthStore } from '@/stores/auth-store';

// ─── Types ──────────────────────────────────────────────────────────

interface FollowStatus {
  isFollowing: boolean;
  isFollowedBy: boolean;
}

interface FollowState {
  followStatus: Record<string, FollowStatus>;
  fetchFollowStatus: (userId: string) => Promise<FollowStatus | null>;
  toggleFollow: (userId: string, username?: string) => Promise<boolean | null>;
  isUserFollowing: (userId: string) => boolean | undefined;
  isUserFollowedBy: (userId: string) => boolean | undefined;
  clearCache: () => void;
  setFollowStatus: (userId: string, status: FollowStatus) => void;
}

// ─── Store ──────────────────────────────────────────────────────────

export const useFollowStore = create<FollowState>((set, get) => ({
  followStatus: {},

  fetchFollowStatus: async (userId: string): Promise<FollowStatus | null> => {
    const currentUser = useAuthStore.getState().currentUser;
    if (!currentUser || currentUser.id === userId) return null;

    // Check cache first
    const cached = get().followStatus[userId];
    if (cached) return cached;

    try {
      const res = await fetch(`/api/users/${userId}/follow-status`, {
        headers: { 'X-User-Id': currentUser.id },
      });
      const data = await res.json();
      if (data.success === false) return null;

      const status: FollowStatus = {
        isFollowing: !!data.isFollowing,
        isFollowedBy: !!data.isFollowedBy,
      };

      set((state) => ({
        followStatus: { ...state.followStatus, [userId]: status },
      }));

      return status;
    } catch {
      return null;
    }
  },

  toggleFollow: async (userId: string, _username?: string): Promise<boolean | null> => {
    const currentUser = useAuthStore.getState().currentUser;
    if (!currentUser || currentUser.id === userId) return null;

    const currentStatus = get().followStatus[userId];
    const isCurrentlyFollowing = currentStatus?.isFollowing ?? false;

    try {
      const res = await fetch(`/api/users/${userId}/follow`, {
        method: isCurrentlyFollowing ? 'DELETE' : 'POST',
        headers: { 'X-User-Id': currentUser.id },
      });
      const json = await res.json();

      if (json.success) {
        const newStatus: FollowStatus = {
          isFollowing: !isCurrentlyFollowing,
          isFollowedBy: currentStatus?.isFollowedBy ?? false,
        };

        set((state) => ({
          followStatus: { ...state.followStatus, [userId]: newStatus },
        }));

        return newStatus.isFollowing;
      }

      return null;
    } catch {
      return null;
    }
  },

  isUserFollowing: (userId: string): boolean | undefined => {
    return get().followStatus[userId]?.isFollowing;
  },

  isUserFollowedBy: (userId: string): boolean | undefined => {
    return get().followStatus[userId]?.isFollowedBy;
  },

  clearCache: () => set({ followStatus: {} }),

  setFollowStatus: (userId: string, status: FollowStatus) => {
    set((state) => ({
      followStatus: { ...state.followStatus, [userId]: status },
    }));
  },
}));

import { create } from 'zustand';
import type { Video, VideoDetail, VideoFilters } from '@/types';
import { useAuthStore } from './auth-store';

interface VideoStore {
  videos: Video[];
  currentVideo: VideoDetail | null;
  isLoading: boolean;
  error: string | null;
  filters: VideoFilters;
  setFilters: (filters: Partial<VideoFilters>) => void;
  fetchVideos: () => Promise<void>;
  fetchVideo: (id: string) => Promise<void>;
  clearCurrentVideo: () => void;
  likeVideo: (videoId: string) => Promise<void>;
  unlikeVideo: (videoId: string) => Promise<void>;
  votePoll: (pollId: string, optionId: string) => Promise<void>;
  createVideo: (data: {
    title: string;
    description?: string;
    videoUrl: string;
    thumbnailUrl?: string;
    category?: string;
    tags?: string[];
    type?: string;
    parentVideoId?: string;
  }) => Promise<Video | null>;
  createPoll: (data: {
    videoId: string;
    question: string;
    options: { id: string; text: string }[];
    isPaid: boolean;
    rewardPerResponse?: number;
    totalRewardPool?: number;
    maxResponses?: number;
    closesAt?: string;
  }) => Promise<boolean>;
  createComment: (videoId: string, content: string, parentCommentId?: string) => Promise<boolean>;
}

export const useVideoStore = create<VideoStore>((set, get) => ({
  videos: [],
  currentVideo: null,
  isLoading: false,
  error: null,
  filters: {
    type: '',
    status: '',
    category: '',
    search: '',
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  fetchVideos: async () => {
    set({ isLoading: true, error: null });
    try {
      const { filters } = get();
      const params = new URLSearchParams();
      if (filters.type) params.set('type', filters.type);
      if (filters.status) params.set('status', filters.status);
      if (filters.category) params.set('category', filters.category);
      if (filters.search) params.set('search', filters.search);
      params.set('limit', '50');

      const res = await fetch(`/api/videos?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        set({ videos: json.data, isLoading: false });
      } else {
        set({ error: json.error || 'Failed to fetch videos', isLoading: false });
      }
    } catch {
      set({ error: 'Network error', isLoading: false });
    }
  },

  fetchVideo: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const userId = useAuthStore.getState().currentUser?.id;
      const res = await fetch(`/api/videos/${id}`, {
        headers: userId ? { 'X-User-Id': userId } : {},
      });
      const json = await res.json();

      if (json.success) {
        set({ currentVideo: json.data, isLoading: false });
      } else {
        set({ error: json.error || 'Failed to fetch video', isLoading: false });
      }
    } catch {
      set({ error: 'Network error', isLoading: false });
    }
  },

  clearCurrentVideo: () => {
    set({ currentVideo: null });
  },

  likeVideo: async (videoId: string) => {
    const userId = useAuthStore.getState().currentUser?.id;
    if (!userId) return;

    try {
      await fetch(`/api/videos/${videoId}/like`, {
        method: 'POST',
        headers: { 'X-User-Id': userId },
      });
      // Update local state
      set((state) => {
        if (state.currentVideo && state.currentVideo.id === videoId) {
          return {
            currentVideo: {
              ...state.currentVideo,
              isLiked: true,
              likeCount: state.currentVideo.likeCount + 1,
            },
          };
        }
        return state;
      });
    } catch {
      // Silently fail
    }
  },

  unlikeVideo: async (videoId: string) => {
    const userId = useAuthStore.getState().currentUser?.id;
    if (!userId) return;

    try {
      await fetch(`/api/videos/${videoId}/like`, {
        method: 'DELETE',
        headers: { 'X-User-Id': userId },
      });
      set((state) => {
        if (state.currentVideo && state.currentVideo.id === videoId) {
          return {
            currentVideo: {
              ...state.currentVideo,
              isLiked: false,
              likeCount: Math.max(0, state.currentVideo.likeCount - 1),
            },
          };
        }
        return state;
      });
    } catch {
      // Silently fail
    }
  },

  votePoll: async (pollId: string, optionId: string) => {
    const userId = useAuthStore.getState().currentUser?.id;
    if (!userId) return;

    try {
      const res = await fetch(`/api/polls/${pollId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify({ optionId }),
      });
      const json = await res.json();

      if (json.success) {
        // Update local state with new poll data
        set((state) => {
          if (!state.currentVideo) return state;
          const updatedPolls = state.currentVideo.polls.map((poll) =>
            poll.id === pollId
              ? {
                  ...poll,
                  options: json.data.options,
                  responseCount: json.data.responseCount,
                  userVoted: true,
                  userVoteOptionId: optionId,
                }
              : poll
          );
          return { currentVideo: { ...state.currentVideo, polls: updatedPolls } };
        });
      }
    } catch {
      // Silently fail
    }
  },

  createVideo: async (data) => {
    const userId = useAuthStore.getState().currentUser?.id;
    if (!userId) return null;

    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (json.success) {
        set({ isLoading: false });
        return json.data as Video;
      } else {
        set({ error: json.error || 'Failed to create video', isLoading: false });
        return null;
      }
    } catch {
      set({ error: 'Network error', isLoading: false });
      return null;
    }
  },

  createPoll: async (data) => {
    const userId = useAuthStore.getState().currentUser?.id;
    if (!userId) return false;

    try {
      const res = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      return json.success;
    } catch {
      return false;
    }
  },

  createComment: async (videoId: string, content: string, parentCommentId?: string) => {
    const userId = useAuthStore.getState().currentUser?.id;
    if (!userId) return false;

    try {
      const res = await fetch(`/api/videos/${videoId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify({ content, parentCommentId }),
      });
      const json = await res.json();
      return json.success;
    } catch {
      return false;
    }
  },
}));

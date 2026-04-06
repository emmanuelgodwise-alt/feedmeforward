import { create } from 'zustand';

// ─── Ad Types ──────────────────────────────────────────────────────

export type AdType = 'banner' | 'preroll' | 'post_vote' | 'native';
export type AdStatus = 'draft' | 'active' | 'paused' | 'completed' | 'rejected';
export type BiddingModel = 'cpm' | 'cpc';

export interface AdCampaign {
  id: string;
  advertiserId: string;
  title: string;
  description: string;
  adType: AdType;
  targetUrl: string;
  imageUrl: string | null;
  status: AdStatus;
  totalBudget: number;
  dailyBudget: number | null;
  spent: number;
  cpmBid: number | null;
  cpcBid: number | null;
  impressions: number;
  clicks: number;
  conversions: number;
  targetingCriteria: string | null; // JSON string
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  advertiser?: {
    username: string;
    id: string;
    displayName?: string | null;
  };
}

export interface ServedAd {
  id: string;
  campaignId: string;
  placementId: string;
  headline: string;
  description: string;
  imageUrl: string | null;
  targetUrl: string;
  advertiserName: string;
  ctaText: string;
  adType: AdType;
}

export interface WorthyStatus {
  isWorthy: boolean;
  score: number;
  minScore: number;
  reasons: string[];
}

export interface AdRevenue {
  totalRevenue: number;
  totalImpressions: number;
  totalClicks: number;
  avgCPM: number;
  avgCPC: number;
  pendingPayout: number;
  paidOut: number;
}

export interface CreateCampaignData {
  title: string;
  description: string;
  adType: AdType;
  targetUrl: string;
  imageUrl?: string;
  totalBudget: number;
  dailyBudget?: number;
  cpmBid?: number;
  cpcBid?: number;
  targetingCriteria?: {
    ageMin?: number;
    ageMax?: number;
    location?: string;
    gender?: string;
    interests?: string;
    categories?: string;
    minScore?: number;
  };
  startDate?: string;
  endDate?: string;
}

// ─── Store Interface ──────────────────────────────────────────────

interface AdState {
  // Campaign state
  campaigns: AdCampaign[];
  isWorthy: boolean | null;
  worthyStatus: WorthyStatus | null;
  currentAd: ServedAd | null;
  revenue: AdRevenue | null;
  // Loading states
  isLoading: boolean;
  isServing: boolean;
  error: string | null;

  // Methods
  fetchCampaigns: (userId: string) => Promise<void>;
  createCampaign: (data: CreateCampaignData) => Promise<boolean>;
  checkWorthy: (videoId: string) => Promise<void>;
  serveAd: (videoId: string, placementType: string, userId?: string) => Promise<ServedAd | null>;
  trackClick: (campaignId: string, placementId?: string, videoId?: string, userId?: string) => Promise<void>;
  fetchRevenue: (userId: string) => Promise<AdRevenue | null>;
  clearCurrentAd: () => void;
  clearCache: () => void;
}

export const useAdStore = create<AdState>((set, get) => ({
  campaigns: [],
  isWorthy: null,
  worthyStatus: null,
  currentAd: null,
  revenue: null,
  isLoading: false,
  isServing: false,
  error: null,

  fetchCampaigns: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/ads/campaigns', {
        headers: { 'X-User-Id': userId },
      });
      if (!res.ok) throw new Error('Failed to fetch campaigns');
      const json = await res.json();
      if (json.success) {
        set({ campaigns: json.data, isLoading: false });
      } else {
        set({ error: json.error || 'Failed to fetch campaigns', isLoading: false });
      }
    } catch {
      set({ error: 'Network error', isLoading: false });
    }
  },

  createCampaign: async (data: CreateCampaignData) => {
    set({ isLoading: true, error: null });
    try {
      const userId = (await import('./auth-store')).useAuthStore.getState().currentUser?.id;
      if (!userId) throw new Error('Not authenticated');

      const res = await fetch('/api/ads/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify({
          ...data,
          targetingCriteria: data.targetingCriteria
            ? JSON.stringify(data.targetingCriteria)
            : null,
        }),
      });
      const json = await res.json();

      if (json.success) {
        const existing = get().campaigns;
        set({
          campaigns: [json.data, ...existing],
          isLoading: false,
        });
        return true;
      } else {
        set({ error: json.error || 'Failed to create campaign', isLoading: false });
        return false;
      }
    } catch {
      set({ error: 'Network error', isLoading: false });
      return false;
    }
  },

  checkWorthy: async (videoId: string) => {
    set({ isWorthy: null, worthyStatus: null });
    try {
      const res = await fetch(`/api/ads/worthy?videoId=${videoId}`);
      if (!res.ok) throw new Error('Failed to check worthy status');
      const json = await res.json();
      if (json.success) {
        set({
          isWorthy: json.data.isWorthy,
          worthyStatus: json.data,
        });
      }
    } catch {
      set({ isWorthy: false });
    }
  },

  serveAd: async (videoId: string, placementType: string, userId?: string) => {
    set({ isServing: true });
    try {
      const params = new URLSearchParams({ videoId, placement: placementType });
      const res = await fetch(`/api/ads/serve?${params.toString()}`, {
        headers: userId ? { 'X-User-Id': userId } : {},
      });
      if (!res.ok) {
        set({ currentAd: null, isServing: false });
        return null;
      }
      const json = await res.json();
      if (json.success && json.data) {
        set({ currentAd: json.data, isServing: false });
        return json.data as ServedAd;
      }
      set({ currentAd: null, isServing: false });
      return null;
    } catch {
      set({ currentAd: null, isServing: false });
      return null;
    }
  },

  trackClick: async (campaignId: string, placementId?: string, videoId?: string, userId?: string) => {
    try {
      const body: Record<string, string> = { campaignId };
      if (placementId) body.placementId = placementId;
      if (videoId) body.videoId = videoId;
      if (userId) body.userId = userId;

      await fetch('/api/ads/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      // Silently fail — tracking is non-critical
    }
  },

  fetchRevenue: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/ads/revenue', {
        headers: { 'X-User-Id': userId },
      });
      if (!res.ok) throw new Error('Failed to fetch ad revenue');
      const json = await res.json();
      if (json.success) {
        set({ revenue: json.data, isLoading: false });
      } else {
        set({ error: json.error || 'Failed to fetch revenue', isLoading: false });
      }
    } catch {
      set({ error: 'Network error', isLoading: false });
    }
    return get().revenue;
  },

  clearCurrentAd: () => {
    set({ currentAd: null });
  },

  clearCache: () => {
    set({
      campaigns: [],
      isWorthy: null,
      worthyStatus: null,
      currentAd: null,
      revenue: null,
      error: null,
    });
  },
}));

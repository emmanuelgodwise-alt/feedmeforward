import { create } from 'zustand';
import { useAuthStore } from '@/stores/auth-store';

// ─── Survey Type ───────────────────────────────────────────────────

export type SurveyType =
  | 'market_research'
  | 'product_feedback'
  | 'ux_testing'
  | 'academic'
  | 'health'
  | 'social'
  | 'political'
  | 'consumer';

// ─── Qualification Criteria ────────────────────────────────────────

export interface SurveyQualificationCriteria {
  minScore?: number | null;
  verifiedOnly?: boolean | null;
  minSurveyCompletions?: number | null;
  location?: string | null;
  ageRange?: string | null;   // '18-25' | '25-40' | '40-55' | '55+'
  gender?: string | null;     // 'All' | 'Male' | 'Female'
  interests?: string[] | null;
}

// ─── Listing Status ────────────────────────────────────────────────

export type SurveyStatus = 'open' | 'paused' | 'closed' | 'completed';

// ─── Application Status ────────────────────────────────────────────

export type SurveyApplicationStatus = 'pending' | 'accepted' | 'declined' | 'completed';

// ─── Survey Listing ────────────────────────────────────────────────

export interface SurveyListing {
  id: string;
  creatorId: string;
  creatorUsername?: string;
  creatorAvatarUrl?: string;
  creatorDisplayName?: string;
  title: string;
  description: string;
  rewardPerResponse: number;
  totalSlots: number;
  filledSlots: number;
  totalBudget: number;
  qualificationCriteria: SurveyQualificationCriteria;
  status: SurveyStatus;
  closesAt: string | null;
  applicationsCount: number;
  createdAt: string;
  updatedAt: string;
  // Survey-specific fields
  surveyType: SurveyType;
  estimatedMinutes: number;
  questionsCount: number;
  organizationName: string;
  sector: string;
}

// ─── Survey Application ───────────────────────────────────────────

export interface SurveyApplication {
  id: string;
  listingId: string;
  listingTitle?: string;
  listingRewardPerResponse?: number;
  listingStatus?: SurveyStatus;
  applicantId: string;
  applicantUsername?: string;
  applicantAvatarUrl?: string;
  applicantDisplayName?: string;
  applicantScore?: number;
  applicantVerified?: boolean;
  applicantSurveyCompletions?: number;
  applicantFollowers?: number;
  coverMessage: string;
  status: SurveyApplicationStatus;
  reviewedAt: string | null;
  createdAt: string;
}

// ─── Qualification Check Result ────────────────────────────────────

export interface SurveyQualificationCheck {
  qualified: boolean;
  reasons: string[];
}

// ─── Store State ───────────────────────────────────────────────────

interface SurveyMarketplaceState {
  // Listings
  listings: SurveyListing[];
  listingsLoading: boolean;
  listingsTotal: number;

  // Single listing
  currentListing: SurveyListing | null;
  currentListingLoading: boolean;

  // My listings
  myListings: SurveyListing[];
  myListingsLoading: boolean;

  // Applications for a listing
  listingApplications: SurveyApplication[];
  listingApplicationsLoading: boolean;

  // My applications
  myApplications: SurveyApplication[];
  myApplicationsLoading: boolean;

  // Qualification checks (map: listingId -> result)
  qualificationChecks: Record<string, SurveyQualificationCheck>;

  // Creating
  creatingListing: boolean;

  // Applying
  applyingToListing: boolean;

  // Reviewing
  reviewingApplication: boolean;

  // Actions
  fetchListings: () => Promise<void>;
  fetchListing: (id: string) => Promise<void>;
  fetchMyListings: (creatorId: string) => Promise<void>;
  createListing: (data: CreateSurveyInput) => Promise<SurveyListing | null>;
  applyToListing: (listingId: string, coverMessage: string) => Promise<boolean>;
  fetchApplications: (listingId: string) => Promise<void>;
  fetchMyApplications: (applicantId: string) => Promise<void>;
  reviewApplication: (applicationId: string, action: 'accept' | 'decline') => Promise<boolean>;
  checkQualification: (listingId: string, criteria: SurveyQualificationCriteria) => void;
}

// ─── Create Survey Input ──────────────────────────────────────────

export interface CreateSurveyInput {
  title: string;
  description: string;
  rewardPerResponse: number;
  totalSlots: number;
  qualificationCriteria: SurveyQualificationCriteria;
  closesAt?: string | null;
  // Survey-specific fields
  surveyType: SurveyType;
  estimatedMinutes: number;
  questionsCount: number;
  organizationName: string;
  sector: string;
}

export const useSurveyMarketplaceStore = create<SurveyMarketplaceState>((set, get) => ({
  listings: [],
  listingsLoading: false,
  listingsTotal: 0,

  currentListing: null,
  currentListingLoading: false,

  myListings: [],
  myListingsLoading: false,

  listingApplications: [],
  listingApplicationsLoading: false,

  myApplications: [],
  myApplicationsLoading: false,

  qualificationChecks: {},

  creatingListing: false,
  applyingToListing: false,
  reviewingApplication: false,

  fetchListings: async () => {
    set({ listingsLoading: true });
    try {
      const res = await fetch('/api/survey-marketplace');
      const json = await res.json();
      if (json.success) {
        set({
          listings: json.listings ?? [],
          listingsTotal: json.total ?? 0,
        });
      }
    } catch {
      // Silently fail
    } finally {
      set({ listingsLoading: false });
    }
  },

  fetchListing: async (id: string) => {
    set({ currentListingLoading: true });
    try {
      const res = await fetch(`/api/survey-marketplace/${id}`);
      const json = await res.json();
      if (json.success) {
        set({ currentListing: json.listing ?? null });
      }
    } catch {
      // Silently fail
    } finally {
      set({ currentListingLoading: false });
    }
  },

  fetchMyListings: async (creatorId: string) => {
    set({ myListingsLoading: true });
    try {
      const res = await fetch(`/api/survey-marketplace?creator=${creatorId}`);
      const json = await res.json();
      if (json.success) {
        set({ myListings: json.listings ?? [] });
      }
    } catch {
      // Silently fail
    } finally {
      set({ myListingsLoading: false });
    }
  },

  createListing: async (data: CreateSurveyInput) => {
    set({ creatingListing: true });
    try {
      const { qualificationCriteria, totalSlots, ...rest } = data;
      const payload = {
        ...rest,
        slots: totalSlots,
        ...qualificationCriteria,
      };
      const res = await fetch('/api/survey-marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success && json.listing) {
        // Refresh listings
        await get().fetchListings();
        return json.listing as SurveyListing;
      }
      return null;
    } catch {
      return null;
    } finally {
      set({ creatingListing: false });
    }
  },

  applyToListing: async (listingId: string, coverMessage: string) => {
    set({ applyingToListing: true });
    try {
      const res = await fetch(`/api/survey-marketplace/${listingId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverMessage }),
      });
      const json = await res.json();
      return !!json.success;
    } catch {
      return false;
    } finally {
      set({ applyingToListing: false });
    }
  },

  fetchApplications: async (listingId: string) => {
    set({ listingApplicationsLoading: true });
    try {
      const res = await fetch(`/api/survey-marketplace/${listingId}/applications`);
      const json = await res.json();
      if (json.success) {
        set({ listingApplications: json.applications ?? [] });
      }
    } catch {
      // Silently fail
    } finally {
      set({ listingApplicationsLoading: false });
    }
  },

  fetchMyApplications: async (applicantId: string) => {
    set({ myApplicationsLoading: true });
    try {
      const res = await fetch('/api/survey-marketplace/my-applications');
      const json = await res.json();
      if (json.success) {
        set({ myApplications: json.applications ?? [] });
      }
    } catch {
      // Silently fail
    } finally {
      set({ myApplicationsLoading: false });
    }
  },

  reviewApplication: async (applicationId: string, action: 'accept' | 'decline') => {
    set({ reviewingApplication: true });
    try {
      const { listingApplications } = get();
      const listingId = listingApplications.find(a => a.id === applicationId)?.listingId;
      if (!listingId) {
        set({ reviewingApplication: false });
        return false;
      }
      const res = await fetch(`/api/survey-marketplace/${listingId}/applications/${applicationId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (json.success) {
        // Refresh applications for the listing
        await get().fetchApplications(listingId);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      set({ reviewingApplication: false });
    }
  },

  checkQualification: (listingId: string, criteria: SurveyQualificationCriteria) => {
    const { currentUser } = useAuthStore.getState();
    if (!currentUser) {
      set({
        qualificationChecks: {
          ...get().qualificationChecks,
          [listingId]: { qualified: false, reasons: ['Not signed in'] },
        },
      });
      return;
    }

    const reasons: string[] = [];
    let qualified = true;

    if (criteria.minScore && currentUser.memberScore < criteria.minScore) {
      qualified = false;
      reasons.push(`Score must be ${criteria.minScore}+ (you have ${currentUser.memberScore})`);
    }

    if (criteria.verifiedOnly && !currentUser.isVerified) {
      qualified = false;
      reasons.push('Verified account required');
    }

    set({
      qualificationChecks: {
        ...get().qualificationChecks,
        [listingId]: { qualified, reasons },
      },
    });
  },
}));

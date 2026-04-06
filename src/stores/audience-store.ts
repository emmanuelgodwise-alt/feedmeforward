import { create } from 'zustand';
import type { SegmentCriteria } from '@/lib/build-where-clause';

interface AudienceStore {
  selectedSegmentCriteria: SegmentCriteria | null;
  setSelectedSegmentCriteria: (criteria: SegmentCriteria | null) => void;
  clearSelectedSegmentCriteria: () => void;
}

export const useAudienceStore = create<AudienceStore>((set) => ({
  selectedSegmentCriteria: null,
  setSelectedSegmentCriteria: (criteria) => set({ selectedSegmentCriteria: criteria }),
  clearSelectedSegmentCriteria: () => set({ selectedSegmentCriteria: null }),
}));

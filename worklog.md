---
Task ID: 1
Agent: Main Agent
Task: Fix infinite loop in marketplace-store.ts and polls-marketplace-view.tsx + serve app

Work Log:
- Added loading guards (`if (get().listingsLoading) return;`) to all fetch functions in marketplace-store.ts: fetchListings, fetchListing, fetchMyListings, fetchMyApplications, fetchApplications
- Added `batchCheckQualifications()` method to store to batch all qualification checks into a single `set()` call (prevents 12 individual re-renders for 12 listings)
- Updated polls-marketplace-view.tsx to use `batchCheckQualifications(listings)` instead of looping through individual `checkQualification()` calls
- Built the project successfully with `npm run build`
- Served with `next dev` and verified HTTP 200 with full HTML content

Stage Summary:
- Infinite loop bug fixed via loading guards in store + batched qualification checks
- App builds and serves correctly
- Preview link: https://preview-48456d7d-3f89-493d-944c-2f51255dd204.space.chatglm.site/

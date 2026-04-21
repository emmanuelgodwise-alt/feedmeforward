# FeedMeForward — Focus Groups & Survey Marketplace API Worklog

## Date: 2026-01-22

## Summary
Added Focus Groups and Survey Marketplace as new marketplace features to the FeedMeForward platform. This includes 4 new Prisma models (FocusGroupListing, FocusGroupApplication, SurveyListing, SurveyApplication), 14 new API route files, and 2 seed endpoints.

---

## 1. Prisma Schema Changes (`prisma/schema.prisma`)

### New Models Added (after PaidPollApplication):

- **FocusGroupListing** — Marketplace listings for paid focus group sessions
  - Fields: id, creatorId, creatorUsername, creatorAvatarUrl, creatorDisplayName, title, description, companyName, industry, sessionFormat, sessionDuration, scheduledAt, rewardPerParticipant, totalSlots, filledSlots, totalBudget, minScore, verifiedOnly, minPollResponses, location, ageRange, gender, interests, status, closesAt, applicationsCount, createdAt, updatedAt
  - sessionFormat: live, async_video, async_text, hybrid
  - status: open, paused, closed, completed
  - Indexes: [status, createdAt], [creatorId], [rewardPerParticipant]

- **FocusGroupApplication** — Applications to focus group listings
  - Fields: id, listingId, applicantId, applicantUsername, applicantAvatarUrl, applicantScore, applicantVerified, coverMessage, status, reviewedAt, createdAt
  - Unique constraint: [listingId, applicantId]
  - Indexes: [applicantId, status], [listingId, status]
  - Cascade delete on listing

- **SurveyListing** — Marketplace listings for paid survey participation
  - Fields: id, creatorId, creatorUsername, creatorAvatarUrl, creatorDisplayName, title, description, organizationName, sector, surveyType, estimatedMinutes, questionsCount, rewardPerResponse, totalSlots, filledSlots, totalBudget, minScore, verifiedOnly, minPollResponses, location, ageRange, gender, interests, status, closesAt, applicationsCount, createdAt, updatedAt
  - surveyType: market_research, product_feedback, ux_testing, academic, health, social, political, consumer
  - status: open, paused, closed, completed
  - Indexes: [status, createdAt], [creatorId], [rewardPerResponse]

- **SurveyApplication** — Applications to survey listings
  - Fields: id, listingId, applicantId, applicantUsername, applicantAvatarUrl, applicantScore, applicantVerified, coverMessage, status, reviewedAt, createdAt
  - Unique constraint: [listingId, applicantId]
  - Indexes: [applicantId, status], [listingId, status]
  - Cascade delete on listing

### User Model Updates
Added 4 new relation fields:
- `focusGroupListings FocusGroupListing[]`
- `focusGroupApplications FocusGroupApplication[]`
- `surveyListings SurveyListing[]`
- `surveyApplications SurveyApplication[]`

### Database Migration
- Ran `npx prisma db push --accept-data-loss` — successful, all 4 tables created

---

## 2. Focus Groups API Routes (7 files)

### `src/app/api/focus-groups/route.ts`
- **GET**: List all focus group listings (filterable by `?creator=userId`, `?status=open|paused|closed|completed|all`, defaults to "open")
- **POST**: Create a new focus group listing (requires x-user-id header)
- Transform helper maps DB fields to API response format with qualificationCriteria

### `src/app/api/focus-groups/[id]/route.ts`
- **GET**: Get single listing by ID with full details, application counts per status, and current user's application status

### `src/app/api/focus-groups/[id]/apply/route.ts`
- **POST**: Apply to a focus group (with coverMessage in body)
- Validates listing is open, not expired, user hasn't already applied
- Auto-attaches user credentials (score, verified status, username, avatar)

### `src/app/api/focus-groups/[id]/applications/route.ts`
- **GET**: List applications for a listing (creator only)
- Filterable by `?status=pending|accepted|declined|completed|all`

### `src/app/api/focus-groups/[id]/applications/[appId]/review/route.ts`
- **POST**: Review (accept/decline) an application (creator only)
- Accept increments filledSlots in a transaction; checks slot availability

### `src/app/api/focus-groups/my-applications/route.ts`
- **GET**: Get current user's applications (uses `userId` query param)
- Includes listing details (title, companyName, industry, sessionFormat, reward, status)

### `src/app/api/focus-groups/seed/route.ts`
- **POST**: Seeds 10 realistic focus group listings
- Companies: Nielsen, McKinsey, P&G, Google UX Lab, Stanford Research, Ford, Mayo Clinic, Goldman Sachs, Spotify, Tesla
- Industries: Consumer Goods, Finance, Healthcare, Tech, Education, Automotive
- Formats: live, async_video, async_text, hybrid
- Rewards: $20-$75 per participant
- Deletes existing seed data before creating new entries

---

## 3. Survey Marketplace API Routes (7 files)

### `src/app/api/survey-marketplace/route.ts`
- **GET**: List all survey listings (filterable by `?creator=userId`, `?status=open|paused|closed|completed|all`, defaults to "open")
- **POST**: Create a new survey listing (requires x-user-id header)

### `src/app/api/survey-marketplace/[id]/route.ts`
- **GET**: Get single listing by ID with full details, application counts per status, and current user's application status

### `src/app/api/survey-marketplace/[id]/apply/route.ts`
- **POST**: Apply to a survey listing (with coverMessage in body)
- Same validation pattern as focus groups

### `src/app/api/survey-marketplace/[id]/applications/route.ts`
- **GET**: List applications for a listing (creator only)

### `src/app/api/survey-marketplace/[id]/applications/[appId]/review/route.ts`
- **POST**: Review (accept/decline) an application (creator only)

### `src/app/api/survey-marketplace/my-applications/route.ts`
- **GET**: Get current user's applications (uses `userId` query param)
- Includes listing details (title, organizationName, sector, surveyType, reward, status)

### `src/app/api/survey-marketplace/seed/route.ts`
- **POST**: Seeds 10 realistic survey listings
- Organizations: Pew Research, Forrester, Deloitte Digital, WHO, Harvard Business School, Gallup, IDC Analytics, Nature Research, Urban Institute, Consumer Reports
- Survey types: political, market_research, health, academic, social, consumer
- Estimated minutes: 5-45 min
- Rewards: $2-$15 per response
- Deletes existing seed data before creating new entries

---

## 4. Key Design Decisions

1. **Denormalized creator fields** — Both FocusGroupListing and SurveyListing store creatorUsername, creatorAvatarUrl, creatorDisplayName directly on the listing for fast reads without joins.

2. **Denormalized applicant fields** — Both application models store applicantUsername and applicantAvatarUrl for the same reason.

3. **Compound unique constraint** — `@@unique([listingId, applicantId])` prevents duplicate applications (matching the existing PaidPollApplication pattern).

4. **Cascade delete** — Applications are deleted when their parent listing is deleted.

5. **my-applications uses query param** — Per requirements, uses `?userId=` instead of header-based auth (unlike the existing polls-marketplace which uses headers).

6. **JSON interests field** — Stored as JSON string in SQLite, parsed in transform helpers.

7. **Consistent response format** — All endpoints return `{ success: true, ... }` or `{ success: false, error: "..." }` matching existing patterns.

## 5. Lint Results
- `bun run lint`: 0 errors, 1 warning (pre-existing in ad-campaign-dialog.tsx, unrelated)

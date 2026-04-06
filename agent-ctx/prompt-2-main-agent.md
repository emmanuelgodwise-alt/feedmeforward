---
## Task ID: prompt-2 - main-agent
### Work Task
Implement Text Chat, Voice Chat, and Video Calls for the FeedMeForward platform: conversation-based messaging system, WebRTC voice/video calls with DB signaling, and full UI integration.

### Work Summary

#### 1. Prisma Schema Changes
- **Replaced** old `Message` model (senderId/receiverId) with new conversation-based `Message` model (conversationId/senderId/type/content/mediaUrl/replyToId/readBy)
- **Added 6 new models:**
  - `Conversation` — id, type (direct/group), name, avatarUrl, lastMessage, lastActivityAt, timestamps
  - `ConversationMember` — id, conversationId, userId, role (admin/member), joinedAt, lastReadAt
  - `Message` — id, conversationId, senderId, type (text/image/video/voice/file/system), content, mediaUrl, replyToId, isRead, readBy, self-referential replies
  - `VoiceCall` — id, conversationId, callerId, status (ringing/ongoing/ended/rejected), startedAt, endedAt, duration
  - `VideoCall` — same structure as VoiceCall
  - `CallSignal` — id, callId, callType, signalType (offer/answer/ice-candidate/hangup), senderId, content (JSON)
- **Updated User model:** removed `receivedMessages` relation, added `conversations`, `voiceCalls`, `videoCalls` relations
- Successfully pushed schema via `npx prisma db push`

#### 2. Legacy Message API Routes (Updated)
- **POST `/api/messages`** — Now creates/finds a direct conversation, then sends message to it
- **GET `/api/messages`** — Now fetches user's conversations via ConversationMember with unread counts
- **GET `/api/messages/[userId]`** — Finds direct conversation between two users, fetches messages
- **DELETE `/api/messages/[userId]`** — Unchanged (deletes message by ID, sender-only)
- **GET `/api/messages/unread-count`** — Computes unread across all conversation memberships

#### 3. New Conversation API Routes (8 routes)
- **POST `/api/conversations`** — Create conversation (direct with dedup, group with name), add members
- **GET `/api/conversations`** — List user's conversations with unread counts, other member info, pagination
- **GET `/api/conversations/[id]`** — Get full conversation detail with members, messages (50 most recent), marks as read
- **POST `/api/conversations/[id]/messages`** — Send message (text/image/video/voice/file), supports replies
- **GET `/api/conversations/[id]/messages`** — Paginated messages with cursor
- **POST `/api/conversations/[id]/members`** — Add member to group with system message
- **DELETE `/api/conversations/[id]/members`** — Leave group or remove member, auto-promote admin
- **POST `/api/conversations/[id]/read`** — Mark conversation as read

#### 4. Voice/Video Call API Routes (10 routes)
- **POST `/api/calls/voice/start`** — Initiate voice call (checks no ongoing call)
- **POST `/api/calls/voice/[id]/answer`** — Answer voice call
- **POST `/api/calls/voice/[id]/end`** — End voice call (calculates duration)
- **POST `/api/calls/video/start`** — Initiate video call
- **POST `/api/calls/video/[id]/answer`** — Answer video call
- **POST `/api/calls/video/[id]/end`** — End video call
- **POST `/api/calls/signal`** — Send WebRTC signal (offer/answer/ice-candidate/hangup)
- **GET `/api/calls/signal`** — Poll for pending signals (deletes after delivery)
- **GET `/api/calls/history`** — Get user's call history with other user info

#### 5. Chat Store (`src/stores/chat-store.ts`)
- Zustand store with: conversations, currentConversation, activeCall, incomingCall states
- Actions: fetchConversations, fetchConversation, fetchMessages, sendMessage, createConversation, markAsRead, clearCurrentConversation
- Call actions: startCall, answerCall, endCall, setActiveCall, setIncomingCall
- Signal actions: sendSignal, pollSignals
- Optimistic updates: addMessageLocally, updateConversationInList

#### 6. UI Components (6 new components)
- **ConversationList** (`src/components/chat/conversation-list.tsx`) — Searchable list with unread badges, avatar, last message preview, active highlighting, loading skeletons
- **ChatView** (`src/components/chat/chat-view.tsx`) — Full chat area with header (name, call buttons), message list with date separators, reply preview, textarea input, send button
- **MessageBubble** (`src/components/chat/message-bubble.tsx`) — Own=orange/amber gradient right-aligned, others=gray left-aligned, system=centered muted, media messages, reply references, read status (double check)
- **NewConversationDialog** (`src/components/chat/new-conversation-dialog.tsx`) — User search, multi-select with chips, group name for 3+, create button
- **VoiceCallUI** (`src/components/chat/voice-call-ui.tsx`) — Full-screen dark overlay, animated rings, avatar, timer, mute/speaker/end controls, incoming call dialog with accept/reject
- **VideoCallUI** (`src/components/chat/video-call-ui.tsx`) — Full-screen with remote video, local PiP, WebRTC setup (getUserMedia, RTCPeerConnection, ICE via Google STUN), controls bar (mute, camera toggle, screen share, end call)

#### 7. MessagesView (Rewritten)
- Uses new conversation-based system instead of old DM model
- Side-by-side layout (desktop) / toggle (mobile)
- ConversationList + ChatView + call integration
- 5-second polling for active conversation messages
- Incoming call dialog handling
- Active voice/video call overlays

#### Quality Checks
- `npm run lint` passes with **zero errors and zero warnings**
- Dev log shows successful compilations with no runtime errors
- TypeScript strict typing throughout all files
- Warm orange/amber color theme maintained (no blue/indigo)
- All framer-motion animations applied
- Responsive design (mobile-first)

#### Files Created (20 new files)
```
src/stores/chat-store.ts
src/components/chat/conversation-list.tsx
src/components/chat/chat-view.tsx
src/components/chat/message-bubble.tsx
src/components/chat/new-conversation-dialog.tsx
src/components/chat/voice-call-ui.tsx
src/components/chat/video-call-ui.tsx
src/app/api/conversations/route.ts
src/app/api/conversations/[id]/route.ts
src/app/api/conversations/[id]/messages/route.ts
src/app/api/conversations/[id]/members/route.ts
src/app/api/conversations/[id]/read/route.ts
src/app/api/calls/voice/start/route.ts
src/app/api/calls/voice/[id]/answer/route.ts
src/app/api/calls/voice/[id]/end/route.ts
src/app/api/calls/video/start/route.ts
src/app/api/calls/video/[id]/answer/route.ts
src/app/api/calls/video/[id]/end/route.ts
src/app/api/calls/signal/route.ts
src/app/api/calls/history/route.ts
```

#### Files Modified (5 files)
```
prisma/schema.prisma (replaced Message model, added 6 models, updated User relations)
src/app/api/messages/route.ts (updated for new conversation model)
src/app/api/messages/[userId]/route.ts (updated for new conversation model)
src/app/api/messages/unread-count/route.ts (updated for new conversation model)
src/components/views/messages-view.tsx (complete rewrite with conversation system + calls)
```

#### Total API Routes Added: 18 new routes (38 total was ~60 existing, now ~78)

#### Notes & Limitations
- WebRTC signaling uses DB polling (every 2 seconds) — sufficient for demo but production should use WebSocket/SSE
- Video call uses browser's native RTCPeerConnection with Google STUN servers
- No file upload in messages (mediaUrl field exists but no upload endpoint for messages)
- Old direct message data (if any) is lost after schema push (SQLite table recreation)
- QuickNav already had Messages item — no changes needed
- page.tsx already had 'messages' in View type and MessagesView import — no changes needed

# Data model

Canonical paths used by Pulse. Field-level contracts for TS live in `@pulse/shared` (Zod). Flutter mirrors critical fields; see fixtures under `packages/shared/fixtures/`.

## Firestore

| Path | Purpose |
|------|---------|
| `users/{uid}` | Profile, role, approval, accountStatus, orgNodeId, prefs |
| `users/{uid}/aiConversations/**` | Pulse AI history |
| `users/{uid}/aiUsage/{dayId}` | AI quotas |
| `users/{uid}/forumVotes/{voteId}` | Per-user vote records |
| `users/{uid}/enrollments/{courseId}` | Academy progress |
| `users/{uid}/notifications/{id}` | In-app inbox |
| `users/{uid}/fcmTokens/{id}` | Push tokens |
| `users/{uid}/notificationState/{id}` | Read/cursor state |
| `publicProfiles/{uid}` | Directory-safe public card (synced by Functions) |
| `threads/{threadId}` | Forum threads |
| `threads/{threadId}/replies/{replyId}` | Replies |
| `threads/{threadId}/votes/{uid}` | Thread votes |
| `threads/{threadId}/participants/{uid}` | Notify targets |
| `courses/{courseId}` | Academy courses (+ `modules`, `lessons`, `secure`) |
| `paths/{pathId}` | Learning paths |
| `orgNodes/{id}` | Org hierarchy (Admin); mutations via Functions |
| `aiKnowledgeChunks/{id}` | RAG vectors (backend-only) |
| `aiRuns/{id}` | AI run telemetry (backend-only) |
| `functionUsage/{id}` | Callable rate / usage counters |
| `ssoHandoffs/{code}` | Cross-app SSO codes |
| `ssoRateLimit/{id}` | SSO abuse counters |
| `platformConfig/{id}` | Platform settings |

Legacy note: some chat-related docs may appear under Firestore `chats/**` rules; **live chat traffic is RTDB** (below).

## Realtime Database

| Path | Purpose |
|------|---------|
| `chats/{chatId}` | Chat metadata, members, last message |
| `messages/{chatId}/{messageId}` | Message bodies |
| `userChats/{uid}/{chatId}` | Inbox index |
| `dmIndex/{dmKey}` | DM dedupe |
| `presence/{uid}` | Online presence |
| `autoJoinGroups/{roleOrKey}` | Role-based group auto-join |

## Storage

Avatars and Academy media (see `storage.rules`).

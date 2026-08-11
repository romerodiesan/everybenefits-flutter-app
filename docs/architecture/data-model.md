# Data model

Canonical paths used by Pulse. Field-level contracts for TS live in `@pulse/shared` (Zod). Flutter mirrors critical fields; see fixtures under `packages/shared/fixtures/`.

## Firestore

| Path | Purpose |
|------|---------|
| `users/{uid}` | Profile, role, approval, accountStatus, orgNodeId, prefs |
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
| `courses/{courseId}/analytics/{summary\|realtime\|audience\|traffic}` | Aggregate creator analytics (Functions-written) |
| `courses/{courseId}/analyticsDays/{yyyy-mm-dd}` | Daily series for Studio charts |
| `courses/{courseId}/lessonAnalytics/{lessonId}` | Per-lesson retention / quiz rollups |
| `courses/{courseId}/analyticsSessions/{sessionId}` | Ephemeral realtime presence (Functions-only) |
| `analyticsDedupe/{id}` | Client event idempotency (Functions-only) |
| `analyticsViewerDays/{id}` | Approximate unique viewers (Functions-only) |
| `paths/{pathId}` | Learning paths |
| `orgNodes/{id}` | Org hierarchy (Admin); mutations via Functions |
| `paymentsParticipants/{id}` | Override economic participants (`agency` \| `agent` only) |
| `businessRelationships/{id}` | Temporal upline→downline edges; type derived from participant pair |
| `contractTerms/{id}` | Contract levels (e.g. PMPM) by participant + scope |
| `carriers/{id}` | Carrier catalog (`market`: aca \| medicare \| life) |
| `carrierStateRates/{id}` | Per-state platform-owner intake: commission + override (`flat` \| `percent`); one active row per carrier+state |
| `statements/{id}` | Imported carrier/FMO statements |
| `statementLines/{id}` | Production / received-override lines |
| `overrideRuns/{id}` | Calculation run metadata |
| `overrideAllocations/{id}` | Per-participant override portions for a run |
| `reconciliationItems/{id}` | Expected vs received diffs for a run |
| `functionUsage/{id}` | Callable rate / usage counters |
| `ssoHandoffs/{code}` | Cross-app SSO codes (60s TTL; configure Firestore TTL on `expiresAt`) |
| `ssoRateLimit/{id}` | SSO abuse counters (configure Firestore TTL on `expiresAt`) |
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

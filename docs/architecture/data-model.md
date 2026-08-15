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
| `publicProfiles/{uid}` | Directory-safe public card (synced by Functions): identity, bio, agency, role, badge, optional city/state, join date, follow counts |
| `usernames/{username}` | Unique handle reservation `{ uid }` (Functions-only writes) |
| `social/{uid}/contacts/{otherUid}` | Mutual contacts (Functions-only writes; DM gate) |
| `social/{uid}/incomingRequests/{fromUid}` | Incoming contact requests (Functions-only writes) |
| `social/{uid}/outgoingRequests/{toUid}` | Outgoing contact requests (Functions-only writes) |
| `social/{uid}/followers/{otherUid}` | Unidirectional followers (Functions-only writes) |
| `social/{uid}/following/{otherUid}` | Unidirectional following (Functions-only writes) |
| `social/{uid}/blocks/{otherUid}` | Blocks (client create/delete) |
| `social/{uid}/mutes/{otherUid}` | Mutes (client create/delete) |
| `moderationReports/{id}` | Member reports (`reporterUid`, `targetUid`, `reason`, `details`, `status`) — Functions-only |
| `threads/{threadId}` | Forum threads (`interactorCount` = unique author/voters/repliers). Spotlight: ≥80% active users + absolute floors (min audience 25). Hot: ≥35% reach + floors. |
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
| `orgNodes/{id}` | Org hierarchy (Admin + Payments identity SoT per ADR-008) |
| `paymentsParticipants/{id}` | **Legacy** economic participants — deprecated for new Commission Runs |
| `businessRelationships/{id}` | **Legacy** upline edges — hierarchy now from orgNodes/users for new runs |
| `contractTerms/{id}` | Contract levels (e.g. PMPM) by participant + scope; may be materialized from a plan |
| `compensationTiers/{id}` | Named **override** PMPM level templates for plans (not commission) |
| `agentRateGroups/{id}` | Agent cohorts for shared plan slots |
| `compensationPlans/{id}` | Reusable multi-carrier compensation packages |
| `planAssignments/{id}` | Plan apply targets (agencies / agents) + pay mode |
| `paymentRouting/{id}` | **Legacy** remittance map by participant id |
| `agencyPayModes/{orgNodeId}` | ADR-008 agency pay mode (`direct` \| `through_agency`) |
| `carriers/{id}` | Carrier catalog (`market`: aca \| medicare \| life) |
| `carrierStateRates/{id}` | Per-state platform-owner intake: commission + override (`flat` \| `percent`); one active row per carrier+state |
| `statements/{id}` | Imported carrier/FMO statements |
| `statementLines/{id}` | Production / received-override lines |
| `overrideRuns/{id}` | Calculation run metadata |
| `overrideAllocations/{id}` | Per-participant override portions for a run |
| `reconciliationItems/{id}` | Expected vs received diffs for a run |
| `commissionRuns/{id}` | Commission run workflow (ADR-008) |
| `commissionSourceFiles/{id}` | Uploaded source files for a run |
| `commissionImportProfiles/{id}` | Column mapping profiles |
| `commissionTransactions/{id}` | Normalized lines (cents; commission + override streams) |
| `commissionRules/{id}` | Compensation rules (`stream`: commission \| override) |
| `commissionRuleVersions/{id}` | Immutable rule snapshots |
| `commissionValidationIssues/{id}` | Validation / reconciliation issues |
| `commissionCalculations/{id}` | Versioned calculation attempts |
| `commissionAllocations/{id}` | Per-party allocations + breakdown |
| `commissionStatements/{id}` | Generated recipient statements |
| `commissionStatementVersions/{id}` | Statement artifact versions |
| `commissionNotifications/{id}` | Email notification batch rows |
| `commissionAuditEvents/{id}` | Commission module audit trail |
| `commissionSettings/{id}` | Tolerances / defaults |
| `functionUsage/{id}` | Callable rate / usage counters |
| `ssoHandoffs/{code}` | Cross-app SSO codes (60s TTL; configure Firestore TTL on `expiresAt`) |
| `ssoRateLimit/{id}` | SSO abuse counters (configure Firestore TTL on `expiresAt`) |
| `platformConfig/{id}` | Platform settings |
| `promoBanners/{id}` | In-app promotional banners (`type`, `format`, `surface`, dismissible/CTA/image toggles, localized copy; Admin-managed). Multiple active banners on the same surface rotate in a Pulse carousel. |
| `polls/{id}` | In-app polls (question, options, surface, audience, schedule; Admin-managed). Votes live in `polls/{id}/votes/{uid}` and tallies on the poll doc. |

**Payments access:** payments-admin clients may **read** economic / commission collections via Firestore rules (`canAccessPaymentsData`). All **writes** go through Cloud Functions / Admin SDK. Identity for new Commission Runs is Pulse `orgNodes` + `users` ([ADR-008](ADR-008-commission-runs.md)); both **commission** and **override** streams are first-class. Recipient statements in Pulse use scoped callables + `commission.statements.self`, not broad client reads.

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

**Public profile privacy:** `users/{uid}.privacy.showLocationOnProfile` (default `false`) gates city + state on `publicProfiles`. Email, phone, NPN, and street address never sync to the public card. Follows do not unlock DMs — those still require mutual contacts.

## Storage

Avatars and Academy media (see `storage.rules`).

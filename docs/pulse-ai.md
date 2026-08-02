# Pulse AI

Bilingual US-insurance agent for the Next.js web app and Flutter mobile app.
Generation, tools, policy, RAG and quotas all live in `webapp`; Flutter consumes
the same agent over SSE.

## Architecture

| Surface | Endpoint | Protocol |
|---------|----------|----------|
| Web chat | `POST /api/ai/chat` | AI SDK UI message stream |
| Mobile chat | `POST /api/ai/stream` | Plain SSE (`PulseMobileEvent`) |
| History | `GET/DELETE /api/ai/conversations` | JSON |
| Messages | `GET /api/ai/conversations/:id/messages` | JSON |
| Feedback | `POST /api/ai/feedback` | JSON |
| Reindex | `GET/POST /api/ai/reindex` | JSON (admin / cron) |

Tools are read-only: accepted forum answers, academy catalog, curated official
corpus, allowlisted official web search, and the caller's learning context.

## Environment

Copy from `apps/web/.env.example`. Required for a real agent:

| Variable | Purpose |
|----------|---------|
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway. On Vercel, OIDC can provision this. |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Admin SDK JSON (raw or base64) for Auth, Firestore, App Check. |
| `FIREBASE_PROJECT_ID` | Defaults to the client project id when unset. |
| `PULSE_AI_ADMIN_TASK_KEY` | Shared secret for `/api/ai/reindex`. |
| `CRON_SECRET` | Also accepted by the reindex route (Vercel Cron). |

Useful knobs:

| Variable | Default | Notes |
|----------|---------|-------|
| `PULSE_AI_MODEL` | `anthropic/claude-sonnet-5` | Reasoning model |
| `PULSE_AI_FAST_MODEL` | `google/gemini-3.6-flash` | Titles / memory / light work |
| `PULSE_AI_EMBEDDING_MODEL` | `google/gemini-embedding-001` | Embeddings |
| `PULSE_AI_EMBEDDING_DIMENSIONS` | `768` | Must match the Firestore vector index |
| `PULSE_AI_DAILY_MESSAGE_LIMIT` | `60` | Per UID |
| `PULSE_AI_PER_MINUTE_MESSAGE_LIMIT` | `8` | Per UID |
| `PULSE_AI_REQUIRE_APP_CHECK` | on in production | Set `false` to disable |
| `PULSE_AI_ALLOW_ANONYMOUS` | `false` | Guests blocked by default |
| `PULSE_AI_WEB_SEARCH_PROVIDER` | `none` | `tavily` \| `brave` \| `none` |
| `PULSE_AI_PUBLIC_BASE_URL` | site URL | Used when building absolute links |

Flutter release builds need the web origin:

```bash
flutter run --dart-define=PULSE_AI_BASE_URL=https://your-webapp.vercel.app
```

Debug builds default to `http://<emulator-host>:3000` (Android emulator → `10.0.2.2`).

## Firebase

1. **Firestore edition / region** — vector search needs a database that supports
   it. Deploy indexes from `firestore.indexes.json` (includes the
   `aiKnowledgeChunks` vector index at 768 dimensions and the lexical
   `group + searchTokens` index).
2. **Rules** — `firestore.rules` keeps `aiKnowledgeChunks` and `aiRuns`
   backend-only; users can only read/delete their own
   `users/{uid}/aiConversations/**` and read their `aiUsage` counters.
3. **Realtime Database** — clients can no longer write messages as
   `support-ai`. Bot turns go through the `postSupportAiMessage` callable.
4. **App Check** — enforce for production web and mobile; the agent API
   verifies `X-Firebase-AppCheck` when required.

Deploy rules / indexes / functions:

```bash
firebase deploy --only firestore:rules,firestore:indexes,database,functions
```

## Knowledge index

Indexed content:

- Forum threads with an `acceptedReplyId` (question + accepted answer)
- Published courses, paths and lesson `bodyMarkdown`
- Curated official seeds (NAIC, CMS/Medicare, Healthcare.gov, DOL/EBSA, IRS/ACA,
  state DOIs)

Never indexed: drafts, private chats, progress detail, quiz answer keys, PII.

Rebuild:

```bash
# Manual
PULSE_AI_ADMIN_TASK_KEY=… node scripts/reindex-ai-knowledge.mjs

# Or hit the route (also wired as a daily Vercel cron in apps/web/vercel.json)
curl -H "Authorization: Bearer $CRON_SECRET" https://your-webapp.vercel.app/api/ai/reindex
```

Official live search (optional) is limited to allowlisted regulator domains;
see `apps/web/lib/ai/official-sources.ts`.

## Quotas, retention, observability

- Quotas live under `users/{uid}/aiUsage/{day}` and are enforced before each run.
- Conversation transcripts and a short `memorySummary` live under
  `users/{uid}/aiConversations/{id}`. Clients may delete their own history;
  assistant writes are Admin-SDK only.
- `aiRuns` stores latency, tokens, tools, cited source ids and compliance flags
  **without** full prompts or answers. User ids are pseudonymised.

## Local development

```bash
# Terminal 1 — Firebase emulators
./scripts/start-emulators.sh

# Terminal 2 — Next.js (pointing at emulators)
cd webapp
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true pnpm dev

# Terminal 3 — Flutter (optional)
flutter run --dart-define=USE_FIREBASE_EMULATORS=true
```

App Check is skipped against emulators. Vector search falls back to lexical
retrieval when the vector index is unavailable locally.

## Quality gates

```bash
cd webapp
pnpm typecheck
pnpm test          # unit + offline evals
pnpm eval:ai       # scope / citation eval suite only
pnpm build

cd ../functions && npx tsc --noEmit
cd ../test/rules && FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm test

flutter analyze lib/features/ai_chat
flutter test test/features/ai_chat
```

Offline evals live in `apps/web/lib/ai/evals/` and cover in-scope insurance
questions (EN/ES), off-topic refusals, legal-advice flags, prompt injection,
citation hallucination and academy deep links. They do not spend model tokens.

## Manual E2E checklist

1. Sign in as a non-anonymous member on web (`/ai`) and mobile (Pulse AI tab).
2. Ask an in-scope question (e.g. Medicare AEP). Confirm streaming text, at least
   one activity row, and source cards after the answer.
3. Tap / click a forum, course or official source and confirm it opens.
4. Ask something off-topic and confirm a refusal (no tool activity).
5. Ask for legal advice about suing a carrier and confirm the compliance / legal
   notice.
6. Open History, reload the conversation, delete it, start a new chat.
7. Submit thumbs-up / thumbs-down on an assistant message.

## Compliance posture

- Domain is US insurance and the business of insurance only.
- Educational legal/regulatory explanation is allowed; individualised legal
  advice, coverage determinations and eligibility conclusions are refused or
  bannered.
- Retrieved content is treated as untrusted against prompt injection.
- Citations are issued by the server registry; the model may only refer to
  refs a tool actually returned.

# ADR-004: Pulse AI bounded context

## Status

Accepted

## Context

Pulse AI (RAG, streaming, quotas, reindex) lives in the learner **webapp**. Flutter consumes it over SSE. Moving generation into Cloud Functions would be a large cut and is not required for the architecture wave.

## Decision

- Keep Pulse AI in **`webapp/lib/ai`** and **`webapp/app/api/ai`**.
- Treat it as a **bounded context**: clear HTTP contracts, documented env, no direct coupling from Studio/Admin.
- Flutter uses `POST /api/ai/stream` (plain SSE) and history/feedback JSON routes.
- Full operational detail remains in [`docs/pulse-ai.md`](../pulse-ai.md).

### Mobile SSE contract (summary)

Events on the stream include typed payloads such as text deltas, citations, errors, and completion (see `PulseMobileEvent` / `pulse_ai_client.dart`). Auth: Firebase ID token; App Check header when enforced.

## Consequences

- Flutter release builds need `PULSE_AI_BASE_URL` pointing at the webapp origin.
- Scaling AI means scaling the webapp (or later extracting a service) — not blocking shared-domain work.

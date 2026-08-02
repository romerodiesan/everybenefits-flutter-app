# ADR-003: Trusted boundary

## Status

Accepted

## Context

Clients talk directly to Firestore and RTDB under security rules, and call Cloud Functions for privileged work. Pulse AI uses the Next.js Admin SDK. Without a clear split, privileged ops leak into clients or Next routes.

## Decision

| Concern | Where it lives |
|---------|----------------|
| Own profile fields the user may edit | Client write + `firestore.rules` |
| Forum thread/reply create (non-vote) | Client or callable as already implemented; votes/deletes via Functions |
| Votes, accepted-answer side effects | Cloud Functions |
| Role / approval / admin user ops | Cloud Functions only |
| Org tree mutations (`orgNodes`) | Cloud Functions only; clients read via callables or rules |
| Quiz grading / enrollment progress trusted fields | Cloud Functions |
| Group create / default agent group / support-AI bot messages | Cloud Functions |
| SSO handoff create/exchange | Cloud Functions (+ thin Next bridge routes) |
| Account deactivate / deletion schedule | Cloud Functions |
| AI generation, RAG, quotas | Next.js `webapp` `/api/ai/*` with Admin SDK |
| FCM fan-out helpers | Functions (`notifications` module) |

## Consequences

- Admin UI must never write org/users privileged fields with the client SDK alone.
- Moving AI to Functions is explicitly out of scope (see ADR-004).
- Rules and Functions must stay in sync when adding collections (see data-model.md).

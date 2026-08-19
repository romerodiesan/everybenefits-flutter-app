# ADR-003: Trusted boundary

## Status

Accepted

## Context

Clients talk directly to Firestore and RTDB under security rules, and call Cloud Functions for privileged work. Without a clear split, privileged ops leak into clients or Next routes.

## Decision

| Concern | Where it lives |
|---------|----------------|
| Own profile fields the user may edit | Client write + `firestore.rules` |
| Forum thread/reply create (non-vote) | Client or callable as already implemented; votes/deletes via Functions |
| Votes, accepted-answer side effects | Cloud Functions |
| Role / approval / admin user ops | Cloud Functions only |
| Org tree (`orgNodes`) | Cloud Functions only (client reads/writes denied in rules) |
| Quiz grading / enrollment progress trusted fields | Cloud Functions |
| Group create / default agent group | Cloud Functions |
| SSO handoff create/exchange | Cloud Functions (+ thin Next `/api/auth/*`); Pulse is the auth hub (see ADR-006) |
| Account deactivate / deletion schedule | Cloud Functions |
| FCM fan-out helpers | Functions (`notifications` module) |

## Consequences

- Admin UI must never write org/users privileged fields with the client SDK alone.
- Role permission documents (`roles/{id}`) auto-seed on Functions instance init from `@pulse/shared` defaults (`ensureBuiltinRolesSeeded`); new catalog versions merge missing keys without clobbering Admin customizations. `seedSystemRoles` / `pnpm seed:roles` remain manual overrides. Functions fall back to built-in defaults when a doc is missing, while Firestore `hasPermission` fails closed.
- One-shot `sub_agency` → `agency` rewrite: `node tooling/scripts/migrate-sub-agencies.mjs` (callable is gated by `FUNCTIONS_ALLOW_ORG_MIGRATIONS=true`).

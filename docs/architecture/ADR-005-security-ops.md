# ADR-005: Security operations checklist

## Status

Accepted

## Context

App Check enforcement on Functions is opt-in (`FUNCTIONS_ENFORCE_APP_CHECK`). CORS allowlists and AI App Check flags are maintained by hand. Production must not ship with enforcement off.

## Checklist

- [ ] App Check providers registered for web, iOS, Android
- [ ] `FUNCTIONS_ENFORCE_APP_CHECK=true` on production Functions
- [ ] `PULSE_AI_REQUIRE_APP_CHECK` left on (default) in production webapp
- [ ] CORS / authorized domains list matches `pulse.everybenefits.us`, `studio.everybenefits.us`, `admin.everybenefits.us`, and local dev origins
- [ ] Service account JSON only in server env (`FIREBASE_SERVICE_ACCOUNT_KEY`), never in client bundles
- [ ] SSO handoff docs expire and rate-limit counters deployed
- [ ] Firestore / RTDB / Storage rules deployed with Functions
- [ ] Reindex cron secrets (`PULSE_AI_ADMIN_TASK_KEY` / `CRON_SECRET`) rotated and not committed

## Consequences

CI documents this checklist; enabling flags is an ops deploy step, not automatic in every PR environment.

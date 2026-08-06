# ADR-005: Security operations checklist

## Status

Accepted

## Context

App Check enforcement on Functions is opt-in (`FUNCTIONS_ENFORCE_APP_CHECK`). Web clients use **reCAPTCHA Enterprise** (`ReCaptchaEnterpriseProvider`) with the Google Cloud Fraud Defense site key (`NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY` / App Hosting secret `FIREBASE_APPCHECK_SITE_KEY`). Mobile uses App Attest / Play Integrity. CORS allowlists and AI App Check flags are maintained by hand. Production must not ship with enforcement off.

## Checklist

- [ ] App Check: web apps registered with **reCAPTCHA Enterprise** (Fraud Defense site key); iOS App Attest; Android Play Integrity
- [ ] App Hosting secret `FIREBASE_APPCHECK_SITE_KEY` granted to pulse/studio/admin backends
- [ ] `FUNCTIONS_ENFORCE_APP_CHECK=true` on production Functions
- [ ] `PULSE_AI_REQUIRE_APP_CHECK` left on (default) in production webapp
- [ ] reCAPTCHA Enterprise allowed domains include pulse/studio/admin hosts + localhost
- [ ] CORS / authorized domains list matches `pulse.everybenefits.us`, `studio.everybenefits.us`, `admin.everybenefits.us`, and local dev origins
- [ ] Service account JSON only in server env (`FIREBASE_SERVICE_ACCOUNT_KEY`), never in client bundles
- [ ] SSO handoff docs expire and rate-limit counters deployed
- [ ] Firestore / RTDB / Storage rules deployed with Functions
- [ ] Reindex cron secrets (`PULSE_AI_ADMIN_TASK_KEY` / `CRON_SECRET`) rotated and not committed

## Consequences

CI documents this checklist; enabling flags is an ops deploy step, not automatic in every PR environment.

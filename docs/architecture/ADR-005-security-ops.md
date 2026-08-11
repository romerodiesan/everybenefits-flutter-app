# ADR-005: Security operations checklist

## Status

Accepted (App Check currently **disabled** / opt-in)

## Context

App Check is **off by default** across web clients, SSO, and Cloud Functions.
Re-enable later with explicit flags after providers and Console enforcement
are organized:

- Client site key: `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY`
- SSO: `PULSE_SSO_REQUIRE_APP_CHECK=true`
- Functions: `FUNCTIONS_ENFORCE_APP_CHECK=true`

Phone Auth MFA still uses Auth `RecaptchaVerifier` (unrelated to App Check).

## Checklist

- [ ] Firebase Console App Check products left on **Monitor** (not Enforce) while disabled
- [ ] When re-enabling: register web apps with reCAPTCHA Enterprise; iOS App Attest; Android Play Integrity
- [ ] When re-enabling: set the three flags above in App Hosting / Functions env
- [ ] CORS / authorized domains list matches `pulse.everybenefits.us`, `studio.everybenefits.us`, `admin.everybenefits.us`, and local dev origins
- [ ] Service account JSON only in server env (`FIREBASE_SERVICE_ACCOUNT_KEY` / `SERVICE_ACCOUNT_KEY`), never in client bundles
- [ ] SSO handoff docs expire and rate-limit counters deployed
- [ ] Firestore / RTDB / Storage rules deployed with Functions

## Consequences

CI documents this checklist; enabling flags is an ops deploy step, not automatic in every PR environment.

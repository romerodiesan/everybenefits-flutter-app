# ADR-005: Security operations checklist

## Status

Accepted (App Check currently **disabled** / opt-in)

## Context

App Check is **off by default** across web clients, SSO, and Cloud Functions.
Re-enable later with explicit flags after providers and Console enforcement
are organized:

- Client site key: `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY`
- SSO: `PULSE_SSO_REQUIRE_APP_CHECK=true`
- Functions: `FUNCTIONS_ENFORCE_APP_CHECK=true` (read in `apps/functions/src/init.ts` → `callableOpts.enforceAppCheck`)

Phone Auth MFA still uses Auth `RecaptchaVerifier` (unrelated to App Check).

## Enforce path (ordered)

1. Register App Check providers (reCAPTCHA Enterprise web; App Attest / Play Integrity mobile).
2. Ship client initialization behind `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY` on all Next apps + Flutter.
3. Leave Firebase Console App Check on **Monitor**; verify token attach rate.
4. Set `FUNCTIONS_ENFORCE_APP_CHECK=true` on Cloud Functions (Gen2 callables already honor the flag).
5. Set `PULSE_SSO_REQUIRE_APP_CHECK=true` on the auth hub / SSO exchange.
6. Flip Console products to **Enforce** only after Functions + SSO show healthy attestation.

Emergency rollback: unset / set `FUNCTIONS_ENFORCE_APP_CHECK=false` and return Console to Monitor.

## Checklist

- [ ] Firebase Console App Check products left on **Monitor** (not Enforce) while disabled
- [ ] When re-enabling: register web apps with reCAPTCHA Enterprise; iOS App Attest; Android Play Integrity
- [ ] When re-enabling: set the three flags above in App Hosting / Functions env
- [ ] CORS / authorized domains list matches `pulse.everybenefits.us`, `studio.everybenefits.us`, `admin.everybenefits.us`, `payments.everybenefits.us` (localhost only via emulator or `FUNCTIONS_ALLOW_LOCALHOST`)
- [ ] CI runs CodeQL + dependency audit; rules unit tests under `test/rules` (blocking)
- [ ] Service account JSON only in server env (`FIREBASE_SERVICE_ACCOUNT_KEY` / `SERVICE_ACCOUNT_KEY`), never in client bundles
- [ ] SSO handoff docs expire and rate-limit counters deployed
- [ ] Firestore / RTDB / Storage rules deployed with Functions
- [ ] App Hosting backends connected to GitHub `main` with correct `rootDir`
- [ ] CD secrets configured (`GCP_*` WIF or `FIREBASE_TOKEN`) for Functions/rules/legal deploys

## Consequences

CI documents this checklist; enabling flags is an ops deploy step, not automatic in every PR environment.

Shared client helpers for callables / React Query defaults live in `@pulse/firebase-web` (`callables.ts`, `query.ts`) to reduce per-app drift while App Check rolls out.

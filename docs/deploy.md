# Deploy policy

## Firebase App Hosting + Cloud Functions

| Surface | Mechanism | Config |
|---------|-----------|--------|
| Web (`apps/web`) | App Hosting backend `pulse-web-app` | [`firebase.json`](../firebase.json) `rootDir: apps/web` |
| Studio (`apps/studio`) | App Hosting backend `studio-web-app` | `rootDir: apps/studio` |
| Admin (`apps/admin`) | App Hosting backend `admin-web-app` | `rootDir: apps/admin` |
| Callables / triggers | Cloud Functions Gen2 | `source: apps/functions` |

Production domains: `pulse.everybenefits.us`, `studio.everybenefits.us`, `admin.everybenefits.us`.

### Functions predeploy

```bash
pnpm --filter @pulse/functions build   # syncs vendor packages + tsc
firebase deploy --only functions
```

`sync:shared` copies `@pulse/shared` and `@pulse/insights-metrics` into `apps/functions/vendor/` for Cloud Build uploads.

### App Check

- Set `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY` on each App Hosting backend (web required for AI + SSO).
- Enforce callable App Check with `FUNCTIONS_ENFORCE_APP_CHECK=true` once site keys are live on all three origins.
- SSO App Check: `PULSE_SSO_REQUIRE_APP_CHECK` (defaults on in production when a site key is present).

### Pulse AI reindex

Prefer Cloud Scheduler → `POST https://pulse.everybenefits.us/api/ai/reindex` with `PULSE_AI_ADMIN_TASK_KEY`, or an App Hosting scheduled job.

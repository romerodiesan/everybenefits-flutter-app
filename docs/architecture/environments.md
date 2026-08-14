# Environments

## Firebase projects

| Alias / name | Where referenced | Role |
|--------------|------------------|------|
| `every-benefits-us` | `.firebaserc` **default** | Primary Firebase project for this repo (CLI, App Hosting, Functions) |
| `every-insurance` | Legacy docs / older local `.env` samples | Historical project id — **do not use** for new env files |

Treat **`.firebaserc` → `every-benefits-us`** as the active CLI default unless you `firebase use` another project. Align client `.env` `NEXT_PUBLIC_FIREBASE_PROJECT_ID` / Flutter Firebase options with the project you actually deploy.

**Flutter mobile** (`apps/mobile`): `lib/firebase_options.dart` and native plists must use **every-benefits-us** (not legacy `every-insurance`). See [`apps/mobile/README.md`](../../apps/mobile/README.md).

**Local emulators:** `NEXT_PUBLIC_FIREBASE_PROJECT_ID` (and `FIREBASE_PROJECT_ID`) **must** be `every-benefits-us` — the same ID passed to `firebase emulators:start --project every-benefits-us`. A mismatch stores Auth and Firestore data under different project keys, so registrations can create an Auth user with no `users/{uid}` document. Keep `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` on web, studio, admin, and payments while testing locally.

## Domains (production)

- `pulse.everybenefits.us` — webapp
- `studio.everybenefits.us` — studio
- `admin.everybenefits.us` — admin
- `payments.everybenefits.us` — override management (Payments)
- `legal.everybenefits.us` — legal center (Privacy, Data Use, Cookies, Terms; SvelteKit static)

## Local ports

| Service | Port |
|---------|------|
| apps/web | 3000 |
| apps/studio | 3001 |
| apps/admin | 3002 |
| apps/legal | 3003 |
| apps/payments | 3004 |
| Auth emulator | (see `firebase.json`) |
| Firestore emulator | (see `firebase.json`) |
| RTDB emulator | (see `firebase.json`) |
| Functions emulator | 5001 (typical) |

## Env files

Copy:

- `apps/web/.env.example` → `apps/web/.env.local`
- `apps/studio/.env.example` → `apps/studio/.env.local`
- `apps/admin/.env.example` → `apps/admin/.env.local`
- `apps/payments/.env.example` → `apps/payments/.env.local`
- `apps/legal/.env.example` → `apps/legal/.env`

Pulse links to the legal app via `NEXT_PUBLIC_LEGAL_ORIGIN` (dev: `http://localhost:3003`, prod: `https://legal.everybenefits.us`).

Deploy legal static site after `pnpm build:legal`:

```bash
firebase deploy --only hosting:legal
```

Map the Hosting site `pulse-legal` to `legal.everybenefits.us` in Firebase Console (DNS / custom domain). The `.firebaserc` target name is `legal`.

Never commit secrets. Service accounts and other server credentials stay in App Hosting / Functions env only — never in client bundles.

## Hosting

**Canonical:** Firebase App Hosting for Pulse web / studio / admin / payments.

Per-app `vercel.json` files are **legacy** (local scaffolding leftovers). Do not use them for production deploys unless intentionally migrating off App Hosting.

### GitHub → App Hosting (Next.js)

Connect each backend (`pulse-web-app`, `studio-web-app`, `admin-web-app`, `payments-web-app`) to the GitHub repo `romerodiesan/everybenefits-flutter-app` with:

- Live branch: `main`
- Root directory: `apps/{web|studio|admin|payments}` (must match `firebase.json`)

Push to `main` triggers App Hosting rollouts. Do **not** also deploy those backends from GitHub Actions (avoids double deploys).

Verify linkage after `firebase login --reauth`:

```bash
firebase apphosting:backends:list --project every-benefits-us
firebase apphosting:backends:get pulse-web-app --project every-benefits-us
```

### GitHub Actions CD (Functions / rules / legal)

[`.github/workflows/cd.yml`](../.github/workflows/cd.yml) runs after the **CI** workflow succeeds on `main` (`workflow_run`). Path filters:

| Paths | Deploy |
|-------|--------|
| `apps/functions/**`, `packages/shared/**` | `pnpm deploy:functions` |
| `firestore.rules`, `storage.rules`, `database.rules.json`, `firestore.indexes.json` | `pnpm deploy:rules` |
| `apps/legal/**` | `pnpm deploy:legal` |

Auth: set either Workload Identity Federation (`GCP_WORKLOAD_IDENTITY_PROVIDER` + `GCP_SERVICE_ACCOUNT`) or `FIREBASE_TOKEN` (`firebase login:ci`).

Legal stays on **Classic Hosting** (`hosting:legal` / site `pulse-legal`). The App Hosting backend id `legal` is alternate only.

### Rollback

1. **App Hosting:** Console → backend → Rollouts → roll back to a previous build.
2. **Functions / rules / legal:** Re-run CD on a known-good commit, or `pnpm deploy:*` from that commit locally; disable the CD workflow if needed.
3. **App Check emergency:** set `FUNCTIONS_ENFORCE_APP_CHECK=false` / unset `PULSE_SSO_REQUIRE_APP_CHECK` and Console → Monitor (see ADR-005).

## App Check enforce path

See [ADR-005](ADR-005-security-ops.md). Gradual rollout:

1. Console products on **Monitor** (not Enforce)
2. Clients: `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY` + initialize App Check (wired in each Next `lib/firebase/client.ts` when the key is set)
3. Functions: `FUNCTIONS_ENFORCE_APP_CHECK=true` (already wired in `apps/functions/src/init.ts`)
4. SSO: `PULSE_SSO_REQUIRE_APP_CHECK=true`
5. Flip Console to **Enforce** only after callables + SSO are green

Callable CORS in production does **not** include localhost (use `FUNCTIONS_ALLOW_LOCALHOST=true` only for emergency preview). Emulator CORS stays open.

## Creator analytics (Studio)

Production audience geo/device requires:

1. Firebase **Blaze** billing
2. GA4 → BigQuery export enabled
3. Functions env `BIGQUERY_ANALYTICS_DATASET` (see `docs/architecture/creator-analytics.md`)

Local emulators: leave the dataset unset and run `pnpm seed` (or `pnpm seed:quick`) for synthetic rollups and volume data.

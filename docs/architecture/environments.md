# Environments

## Firebase projects

| Alias / name | Where referenced | Role |
|--------------|------------------|------|
| `every-insurance` | `.firebaserc` default | Primary Firebase project for this repo |
| `every-benefits-us` | App Hosting YAML comments / historical | Production naming / domains `*.everybenefits.us` |

Treat **`.firebaserc` → `every-insurance`** as the active CLI default unless you `firebase use` another project. Align client `.env` `NEXT_PUBLIC_FIREBASE_PROJECT_ID` / Flutter Firebase options with the project you actually deploy.

**Local emulators:** `NEXT_PUBLIC_FIREBASE_PROJECT_ID` (and `FIREBASE_PROJECT_ID`) **must** be `every-insurance` — the same ID passed to `firebase emulators:start --project every-insurance`. A mismatch stores Auth and Firestore data under different project keys, so registrations can create an Auth user with no `users/{uid}` document. Keep `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` on web, studio, and admin while testing locally.

## Domains (production)

- `pulse.everybenefits.us` — webapp
- `studio.everybenefits.us` — studio
- `admin.everybenefits.us` — admin
- `legal.everybenefits.us` — legal center (Privacy, Data Use, Cookies, Terms; SvelteKit static)

## Local ports

| Service | Port |
|---------|------|
| apps/web | 3000 |
| apps/studio | 3001 |
| apps/admin | 3002 |
| apps/legal | 3003 |
| Auth emulator | (see `firebase.json`) |
| Firestore emulator | (see `firebase.json`) |
| RTDB emulator | (see `firebase.json`) |
| Functions emulator | 5001 (typical) |

## Env files

Copy:

- `apps/web/.env.example` → `apps/web/.env.local`
- `apps/studio/.env.example` → `apps/studio/.env.local`
- `apps/admin/.env.example` → `apps/admin/.env.local`
- `apps/legal/.env.example` → `apps/legal/.env`

Pulse links to the legal app via `NEXT_PUBLIC_LEGAL_ORIGIN` (dev: `http://localhost:3003`, prod: `https://legal.everybenefits.us`).

Deploy legal static site after `pnpm build:legal`:

```bash
firebase deploy --only hosting:legal
```

Map the Hosting site `pulse-legal` to `legal.everybenefits.us` in Firebase Console (DNS / custom domain). The `.firebaserc` target name is `legal`.

Never commit secrets. AI keys and service accounts are webapp-server only (see `docs/pulse-ai.md`).

## Creator analytics (Studio)

Production audience geo/device requires:

1. Firebase **Blaze** billing
2. GA4 → BigQuery export enabled
3. Functions env `BIGQUERY_ANALYTICS_DATASET` (see `docs/architecture/creator-analytics.md`)

Local emulators: leave the dataset unset and run `pnpm seed` (or `pnpm seed:quick`) for synthetic rollups and volume data.

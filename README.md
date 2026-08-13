# Pulse (Every Benefits)

Insurance-agent learning and community platform: forums, chats, Academy, and ops portals — all on Firebase.

Turborepo monorepo (`apps/` + `packages/`) orchestrated with pnpm.

| Surface | Path | Port / host |
|---------|------|-------------|
| Flutter mobile | `apps/mobile/` | iOS / Android / macOS / Linux |
| Pulse Web (learners) | `apps/web/` | `http://localhost:3000` |
| Pulse Studio (authors) | `apps/studio/` | `http://localhost:3001` |
| Pulse Admin (ops) | `apps/admin/` | `http://localhost:3002` |
| Pulse Payments (overrides) | `apps/payments/` | `http://localhost:3004` |
| Cloud Functions | `apps/functions/` | Emulator `:5001` |
| Shared TS contracts | `packages/shared` | `@pulse/shared` |
| Shared web Firebase clients | `packages/firebase-web` | `@pulse/firebase-web` |

Architecture docs: [`docs/architecture/`](docs/architecture/).

## Prerequisites

- Flutter SDK (Dart `^3.12`)
- Node 24 + [pnpm](https://pnpm.io) `11.x`
- Java 21+ (Homebrew `openjdk@25`) for Firebase emulators
- Firebase CLI (`npx firebase-tools`)

## Install

```bash
# TypeScript workspace (web apps, functions, shared packages)
pnpm install

# Flutter
cd apps/mobile && flutter pub get
```

Copy env files from each app’s `.env.example` → `.env.local` (see [`docs/architecture/environments.md`](docs/architecture/environments.md)).

## Develop

```bash
# Emulators (Auth, Firestore, RTDB, Storage, Functions)
pnpm emulators

# Web apps (from root)
pnpm dev:web
pnpm dev:studio
pnpm dev:admin
pnpm dev:payments

# Flutter
cd apps/mobile && flutter run
```

## Build & test

```bash
pnpm build
pnpm test
pnpm lint

cd apps/mobile && flutter analyze && flutter test
```

## Seed / migrate

Scripts live under [`tooling/scripts/`](tooling/scripts/).

| Script | Purpose |
|--------|---------|
| `pnpm seed` | Users + Academy + notifications (agent) into emulators |
| `pnpm seed:users` | Auth + Firestore demo profiles only |
| `pnpm seed:academy` | Sample Academy content only |
| `pnpm seed:notifications -- <uid>` | Notification fixtures for one user |
| `tooling/scripts/migrate-academy-every-benefits-us.mjs` | Academy migration |
| `tooling/scripts/import-manhattanlife-course.mjs` | Course import |

With emulators running (`pnpm emulators`):

```bash
pnpm seed
# Demo logins (password PulseSeed1!):
#   admin@pulse.local | manager@pulse.local | agent@pulse.local
#   student@pulse.local | instructor@pulse.local | pending@pulse.local
```

## Deploy

### Continuous delivery (GitHub)

| Surface | How it deploys |
|---------|----------------|
| `pulse-web-app` / `studio-web-app` / `admin-web-app` / `payments-web-app` | **Firebase App Hosting** native GitHub connection — push to `main` triggers a rollout. Console **Root directory** must match `firebase.json` → `apphosting[].rootDir` (`apps/web`, `apps/studio`, `apps/admin`, `apps/payments`). Live branch: `main`. |
| Cloud Functions | GitHub Actions [`.github/workflows/cd.yml`](.github/workflows/cd.yml) after CI succeeds (path-filtered). |
| Firestore / Storage / RTDB rules | Same CD workflow (path-filtered). |
| `legal.everybenefits.us` | Same CD workflow → Classic Firebase Hosting (`pnpm deploy:legal`). |

**One-time App Hosting ↔ GitHub setup** (requires `firebase login --reauth`):

```bash
firebase apphosting:backends:list --project every-benefits-us
firebase apphosting:backends:get pulse-web-app --project every-benefits-us
# If a backend is not linked to GitHub, create/connect it in Firebase Console
# (App Hosting → backend → Connect repository) or via:
#   firebase apphosting:backends:create --project every-benefits-us ...
```

**CD auth secrets** (repo Settings → Secrets):

- Preferred: `GCP_WORKLOAD_IDENTITY_PROVIDER` + `GCP_SERVICE_ACCOUNT` (WIF)
- Fallback: `FIREBASE_TOKEN` from `firebase login:ci`

**Rollback:** App Hosting → previous rollout in Console; Functions/rules → redeploy prior commit or disable the CD workflow; legal → redeploy previous `apps/legal/build`.

### Manual CLI

| Backend | Console root directory | CLI |
|---------|------------------------|-----|
| `pulse-web-app` | `apps/web` | `pnpm deploy:web` |
| `studio-web-app` | `apps/studio` | `pnpm deploy:studio` |
| `admin-web-app` | `apps/admin` | `pnpm deploy:admin` |
| `payments-web-app` | `apps/payments` | `pnpm deploy:payments` |

Keep the Console **Root directory** aligned with `firebase.json` → `apphosting[].rootDir`. App Hosting reads the repo-root `turbo.json` / `pnpm-workspace.yaml` and builds workspace packages before the target Next app.

```bash
# Rules / indexes / RTDB / Storage
pnpm deploy:rules

# Cloud Functions (syncs @pulse/shared into vendor first)
pnpm deploy:functions

# One App Hosting backend (from repo root)
pnpm deploy:web
# pnpm deploy:studio
# pnpm deploy:admin
# pnpm deploy:payments

# Legal Classic Hosting
pnpm deploy:legal
```

## Naming

| Name | Meaning |
|------|---------|
| **Pulse** | Product brand |
| **Every Benefits** | Company / org root label |
| `every_benefits` | Flutter package name (`apps/mobile`) |
| `every-insurance` | Local Firebase project (`.firebaserc`) |
| `every-benefits-us` | App Hosting / production naming |

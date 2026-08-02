# Pulse (Every Benefits)

Insurance-agent learning and community platform: forums, chats, Academy, Pulse AI, and ops portals — all on Firebase.

| Surface | Path | Port / host |
|---------|------|-------------|
| Flutter mobile | `lib/` | iOS / Android / macOS / Linux |
| Pulse Web (learners) | `webapp/` | `http://localhost:3000` |
| Pulse Studio (authors) | `studio/` | `http://localhost:3001` |
| Pulse Admin (ops) | `admin/` | `http://localhost:3002` |
| Cloud Functions | `functions/` | Emulator `:5001` |
| Shared TS contracts | `packages/pulse-shared` | — |
| Shared web Firebase clients | `packages/pulse-firebase-web` | — |

Architecture docs: [`docs/architecture/`](docs/architecture/). Pulse AI runbook: [`docs/pulse-ai.md`](docs/pulse-ai.md).

## Prerequisites

- Flutter SDK (Dart `^3.12`)
- Node 22 + [pnpm](https://pnpm.io) `11.x`
- Firebase CLI (`npx firebase-tools`)

## Install

```bash
# TypeScript workspace (web apps, functions, shared packages)
pnpm install

# Flutter
flutter pub get
```

Copy env files from each app’s `.env.example` → `.env.local` (see [`docs/architecture/environments.md`](docs/architecture/environments.md)).

## Develop

```bash
# Emulators (Auth, Firestore, RTDB, Storage, Functions)
pnpm emulators
# or: ./scripts/start-emulators.sh

# Web apps (from root)
pnpm --filter webapp dev
pnpm --filter pulse-studio dev
pnpm --filter pulse-admin dev

# Flutter
flutter run
```

## Build & test

```bash
pnpm build          # turbo: shared → apps + functions
pnpm test           # turbo tests where defined
pnpm lint

flutter analyze
flutter test
```

## Seed / migrate

| Script | Purpose |
|--------|---------|
| `scripts/seed-academy.mjs` | Sample Academy content |
| `scripts/seed-notifications.mjs` | Notification fixtures |
| `scripts/migrate-academy-every-benefits-us.mjs` | Academy migration |
| `scripts/reindex-ai-knowledge.mjs` | Pulse AI knowledge reindex |
| `scripts/import-manhattanlife-course.mjs` | Course import |

## Deploy

Firebase App Hosting backends: `pulse-web-app`, `studio-web-app`, `admin-web-app` (see `firebase.json`).

```bash
firebase deploy --only firestore:rules,firestore:indexes,database,storage,functions
# App Hosting / Vercel per app as configured in each package
```

## Naming

| Name | Meaning |
|------|---------|
| **Pulse** | Product brand |
| **Every Benefits** | Company / org root label |
| `every_benefits` | Flutter package name |
| `every-insurance` | Default Firebase project (`.firebaserc`) |
| `every-benefits-us` | App Hosting / production naming (see environments doc) |

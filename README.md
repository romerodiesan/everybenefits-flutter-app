# Pulse (Every Benefits)

Insurance-agent learning and community platform: forums, chats, Academy, Pulse AI, and ops portals — all on Firebase.

Turborepo monorepo (`apps/` + `packages/`) orchestrated with pnpm.

| Surface | Path | Port / host |
|---------|------|-------------|
| Flutter mobile | `apps/mobile/` | iOS / Android / macOS / Linux |
| Pulse Web (learners) | `apps/web/` | `http://localhost:3000` |
| Pulse Studio (authors) | `apps/studio/` | `http://localhost:3001` |
| Pulse Admin (ops) | `apps/admin/` | `http://localhost:3002` |
| Cloud Functions | `apps/functions/` | Emulator `:5001` |
| Shared TS contracts | `packages/shared` | `@pulse/shared` |
| Shared web Firebase clients | `packages/firebase-web` | `@pulse/firebase-web` |

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
| `tooling/scripts/seed-academy.mjs` | Sample Academy content |
| `tooling/scripts/seed-notifications.mjs` | Notification fixtures |
| `tooling/scripts/migrate-academy-every-benefits-us.mjs` | Academy migration |
| `tooling/scripts/reindex-ai-knowledge.mjs` | Pulse AI knowledge reindex |
| `tooling/scripts/import-manhattanlife-course.mjs` | Course import |

## Deploy

Firebase App Hosting backends: `pulse-web-app`, `studio-web-app`, `admin-web-app` (see `firebase.json` — rootDirs under `apps/`).

```bash
firebase deploy --only firestore:rules,firestore:indexes,database,storage,functions
```

## Naming

| Name | Meaning |
|------|---------|
| **Pulse** | Product brand |
| **Every Benefits** | Company / org root label |
| `every_benefits` | Flutter package name (`apps/mobile`) |
| `every-insurance` | Local Firebase project (`.firebaserc`) |
| `every-benefits-us` | App Hosting / production naming |

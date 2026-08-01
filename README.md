# Pulse / Every Benefits

Multi-app product monorepo: Flutter mobile, three Next.js surfaces (Web, Studio, Admin), and Firebase Cloud Functions.

## Quick map

| Path | What |
|------|------|
| [`apps/web`](apps/web) | Learner web (forums, chats, academy, Pulse AI) — port 3000 |
| [`apps/studio`](apps/studio) | Course authoring + insights — port 3001 |
| [`apps/admin`](apps/admin) | Users, orgs, approvals — port 3002 |
| [`apps/functions`](apps/functions) | Trusted callables & triggers |
| [`apps/mobile`](apps/mobile) | Flutter iOS / Android / desktop |
| [`packages/`](packages) | Shared domain & UI libraries (`@pulse/*`) |
| [`scripts/`](scripts) | Emulators, seeds, migrations |
| [`docs/architecture.md`](docs/architecture.md) | **Architecture & conventions** |
| [`docs/deploy.md`](docs/deploy.md) | App Hosting + App Check |
| [`docs/pulse-ai.md`](docs/pulse-ai.md) | Pulse AI agent |

## Prerequisites

- Node 22 + [pnpm](https://pnpm.io) 11+
- Flutter stable (for mobile)
- Firebase CLI (`npx firebase-tools`)

## Setup

```bash
pnpm install
./scripts/start-emulators.sh   # other terminal
pnpm dev:web                   # or dev:studio / dev:admin
```

Mobile:

```bash
cd apps/mobile && flutter pub get && flutter run
```

## Deploy

Primary hosting for the three Next apps is **Firebase App Hosting** (see `firebase.json` and [`docs/deploy.md`](docs/deploy.md)). Functions:

```bash
pnpm --filter @pulse/functions build
firebase deploy --only functions
```

## License

Private — Every Benefits.

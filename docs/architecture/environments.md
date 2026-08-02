# Environments

## Firebase projects

| Alias / name | Where referenced | Role |
|--------------|------------------|------|
| `every-insurance` | `.firebaserc` default | Primary Firebase project for this repo |
| `every-benefits-us` | App Hosting YAML comments / historical | Production naming / domains `*.everybenefits.us` |

Treat **`.firebaserc` → `every-insurance`** as the active CLI default unless you `firebase use` another project. Align client `.env` `NEXT_PUBLIC_FIREBASE_PROJECT_ID` / Flutter Firebase options with the project you actually deploy.

## Domains (production)

- `pulse.everybenefits.us` — webapp
- `studio.everybenefits.us` — studio
- `admin.everybenefits.us` — admin

## Local ports

| Service | Port |
|---------|------|
| apps/web | 3000 |
| apps/studio | 3001 |
| apps/admin | 3002 |
| Auth emulator | (see `firebase.json`) |
| Firestore emulator | (see `firebase.json`) |
| RTDB emulator | (see `firebase.json`) |
| Functions emulator | 5001 (typical) |

## Env files

Copy:

- `apps/web/.env.example` → `apps/web/.env.local`
- `apps/studio/.env.example` → `apps/studio/.env.local`
- `apps/admin/.env.example` → `apps/admin/.env.local`

Never commit secrets. AI keys and service accounts are webapp-server only (see `docs/pulse-ai.md`).

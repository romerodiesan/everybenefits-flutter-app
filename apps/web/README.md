# Pulse Web

Next.js web client for Pulse. Shares Firebase Auth, Firestore, Realtime Database, Storage, and Cloud Functions with the Flutter mobile app (`every-insurance`).

## Stack

- Next.js App Router + TypeScript + Tailwind CSS v4
- `next-intl` (EN / ES)
- Firebase JS SDK (client)
- Package manager: **pnpm**

## Setup

```bash
cd webapp
cp .env.example .env.local
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) (redirects to `/en`).

Academy **Studio** authoring lives in the adjacent app at [`../studio`](../studio) (default [http://localhost:3001](http://localhost:3001)). Pulse redirects `/[locale]/studio/*` there via `NEXT_PUBLIC_STUDIO_URL`.

### Environment

Copy values from `.env.example`. They match the Firebase web app already registered in the mobile project (`lib/firebase_options.dart`).

Optional:

- `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY` — reCAPTCHA v3 site key for App Check
- `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` — point Auth / Firestore / RTDB / Storage / Functions at local emulators

### Firebase Console checklist

1. **Authentication → Settings → Authorized domains**: add `localhost` and your Vercel domain.
2. **Realtime Database**: project must have the default instance
   `https://every-insurance-default-rtdb.firebaseio.com` (create via Console or
   `firebase database:instances:create` / Management API), then
   `firebase deploy --only database`.
3. **App Check** (optional): register the web app with reCAPTCHA v3 and set the site key in env.
4. Google sign-in provider must remain enabled (same as mobile).

> Flutter debug defaults to **emulators**. Web `pnpm dev` talks to **production**
> Firebase unless you set `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true`.

## Pulse AI

The agent lives under `lib/ai/` and `app/api/ai/`. It answers US insurance questions
with RAG over accepted forum answers, the academy and official regulator sources.

See the full runbook: [`../docs/pulse-ai.md`](../docs/pulse-ai.md).

```bash
pnpm test          # unit tests + offline evals
pnpm eval:ai       # scope / citation eval suite
node ../scripts/reindex-ai-knowledge.mjs   # rebuild retrieval index
```

## Deploy (Vercel)

- Root directory: `webapp`
- Framework preset: Next.js
- Install / build: `pnpm install` / `pnpm build` (see `vercel.json`)
- Env vars: paste from `.env.local` / `.env.example` into the Vercel project

```bash
cd webapp
pnpm dlx vercel
```

## Features

| Area | Notes |
|------|--------|
| Landing | Branded hero + CTAs |
| Auth | Email/password, Google popup, magic link, guest |
| Profile completion | Student vs agent |
| Forums | Feed + master-detail, votes, accept answer, share to chat |
| Chats | RTDB inbox + split pane, DM/group/support, reactions, pin/hide |
| AI | Pulse AI agent (streaming, sources, history) — see [`docs/pulse-ai.md`](../docs/pulse-ai.md) |
| Academy | Learner catalog, courses, paths (authoring → [`../studio`](../studio)) |
| Admin | Promote students (`listStudentsForPromotion` / `setUserRole`) |

## Local emulators

Start emulators from the repo root (`scripts/start-emulators.sh` or `firebase emulators:start`), then:

```bash
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true pnpm dev
```

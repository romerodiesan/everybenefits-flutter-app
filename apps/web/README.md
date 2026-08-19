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

- `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` — point Auth / Firestore / RTDB / Storage / Functions at local emulators
- App Check is **off**; opt-in later with `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY` + require flags

### Firebase Console checklist

1. **Authentication → Settings → Authorized domains**: add `localhost` and your deploy domains.
2. **Realtime Database**: project must have the default instance
   `https://every-benefits-us-default-rtdb.firebaseio.com`, then
   `firebase deploy --only database`.
3. **App Check**: leave products on **Monitor** (not Enforce) while disabled.
4. Google sign-in provider must remain enabled (same as mobile).

> Flutter debug defaults to **emulators**. Web `pnpm dev` talks to **production**
> Firebase unless you set `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true`.

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
| Auth | Email/password, Google popup, magic link |
| Profile completion | Student vs agent |
| Forums | Feed + master-detail, votes, accept answer, share to chat |
| Chats | RTDB inbox + split pane, DM/group, reactions, pin/hide |
| Academy | Learner catalog, courses, paths (authoring → [`../studio`](../studio)) |
| Admin | Promote students (`listStudentsForPromotion` / `setUserRole`) |

## Local emulators

Start emulators from the repo root (`scripts/start-emulators.sh` or `firebase emulators:start`), then:

```bash
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true pnpm dev
```

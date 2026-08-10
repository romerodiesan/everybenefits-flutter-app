# Pulse Studio

Authoring app for Academy courses and learning paths. Runs separately from the Pulse learner webapp on **port 3001**.

## Setup

```bash
cd studio
pnpm install
cp .env.example .env.local
```

Fill `.env.local` with the same Firebase web config as the Pulse webapp (`NEXT_PUBLIC_FIREBASE_*`). Set:

- `NEXT_PUBLIC_PULSE_WEB_URL` — learner app (default `http://localhost:3000`)
- `NEXT_PUBLIC_STUDIO_URL` — this app (default `http://localhost:3001`)

```bash
pnpm dev
```

Open [http://localhost:3001](http://localhost:3001).

## Firebase Auth

Add `localhost` (and your Studio + Pulse deploy domains) under **Authentication → Settings → Authorized domains**.

### Cross-app SSO

Pulse (`:3000`) and Studio (`:3001`) are different origins, so Firebase sessions are not shared automatically. Switching apps uses:

1. Source POSTs its ID token to `/api/auth/create-sso-handoff` (same origin) → opaque code
2. Redirect to dest `/auth/sso?hc=<code>` — the ID token never appears in the URL
3. Dest `/api/auth/exchange-sso` consumes the one-time code and mints a custom token
4. `/auth/bridge` — if you already have a session here, complete a handoff for the sibling app

Callables `createSsoHandoff` / `exchangeSsoToken` mirror the same flow. Rate limits apply. App Check is currently off; set `PULSE_SSO_REQUIRE_APP_CHECK=true` (and a site key) when re-enabling.

Studio also tries a silent bridge to Pulse once when you arrive signed out.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Dev server on port 3001 |
| `pnpm build` / `pnpm start` | Production build |
| `pnpm typecheck` | `tsc --noEmit` |

# Pulse Admin

Ops portal for managers and admins — users, org hierarchy, approvals, and platform insights.
Runs separately from Pulse (`:3000`) and Studio (`:3001`) on **port 3002**.

## Setup

```bash
cd admin
pnpm install
cp .env.example .env.local
```

Fill `.env.local` with the same Firebase web config as the Pulse webapp. Set:

- `NEXT_PUBLIC_PULSE_WEB_URL` — learner app (default `http://localhost:3000`)
- `NEXT_PUBLIC_STUDIO_URL` — Studio (default `http://localhost:3001`)
- `NEXT_PUBLIC_ADMIN_URL` — this app (default `http://localhost:3002`)

```bash
pnpm dev
```

Open [http://localhost:3002](http://localhost:3002).

## Access

Only **manager** and **admin** roles may use Admin. Others are redirected to `/no-access`.

## Cross-app SSO

Same opaque handoff flow as Pulse ↔ Studio. Add `localhost` and deploy domains under **Authentication → Settings → Authorized domains**.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Dev server on port 3002 |
| `pnpm build` / `pnpm start` | Production build |
| `pnpm typecheck` | `tsc --noEmit` |

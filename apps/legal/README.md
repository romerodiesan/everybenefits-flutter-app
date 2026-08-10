# @pulse/legal

Static Legal Center for Pulse (Privacy, Data Use, Cookies, Terms).

- Local: `pnpm --filter @pulse/legal dev` → http://localhost:3003
- Build: `pnpm build:legal` → `apps/legal/build`
- Deploy (Hosting): `pnpm deploy:legal` (Firebase Hosting target `legal` → `legal.everybenefits.us`)
- Deploy (App Hosting): backend id `legal` with `apps/legal/apphosting.yaml`
  - Build uses `package.json#apphosting:build`. Runtime uses
    `scripts.runCommand` → `node apps/legal/server.js` (repo-root path) and
    `outputFiles.serverApp.include: [.]`. Do not set `scripts.buildCommand` in
    `apphosting.yaml` — the Node buildpack rewrites `package.json` and can emit
    `"dependencies": null`, which breaks pnpm 11.

Set `PUBLIC_PULSE_WEB_URL` to the Pulse web origin (e.g. `https://pulse.everybenefits.us`).
With Vite 8 / Rolldown, missing static public env exports fail the build — the app reads
`$env/dynamic/public` and falls back to production Pulse if unset.

Routes: `/en|es`, `/en|es/privacy|data|cookies|terms`, and `/…/[topic]`.

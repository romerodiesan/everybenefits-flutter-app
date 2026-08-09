# @pulse/legal

Static Legal Center for Pulse (Privacy, Data Use, Cookies, Terms).

- Local: `pnpm --filter @pulse/legal dev` → http://localhost:3003
- Build: `pnpm build:legal` → `apps/legal/build`
- Deploy: `pnpm deploy:legal` (Firebase Hosting target `legal` → `legal.everybenefits.us`)

Routes: `/en|es`, `/en|es/privacy|data|cookies|terms`, and `/…/[topic]`.

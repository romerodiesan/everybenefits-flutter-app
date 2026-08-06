# ADR-001: Monorepo tooling

## Status

Accepted (updated: apps + packages layout)

## Context

The repo mixed Flutter at the root with three Next.js apps and Cloud Functions. We first introduced pnpm workspaces + Turborepo in place; this ADR records the full Turborepo layout migration.

## Decision

- Use **pnpm workspaces** for `apps/*`, `packages/*`, and `test/rules`.
- Use **Turborepo** for `build`, `test`, `lint`, and `typecheck`.
- Layout:
  - `apps/web`, `apps/studio`, `apps/admin`, `apps/functions`, `apps/mobile` (Flutter)
  - `packages/shared`, `packages/firebase-web`, `packages/eslint-config`, `packages/typescript-config`
  - `tooling/scripts` for seed/migrate/emulator helpers
- Prefer `workspace:*` for shared packages; Functions still vendor-copy `@pulse/shared` for Firebase deploy.
- Next.js local `dev` uses Turbopack (`next dev --turbopack`); production builds stay on `next build`.
- Root scripts: `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm emulators`, `pnpm dev:web|studio|admin`.

## Consequences

- One `pnpm install` at the root installs all TS packages.
- Flutter commands run from `apps/mobile`.
- Firebase App Hosting `rootDir` values are `apps/web|studio|admin`; Functions `source` is `apps/functions`.
- App Hosting Console root directories must match those paths. Deploy helpers: `pnpm deploy:web|studio|admin`, `pnpm deploy:functions`, `pnpm deploy:rules`.
- Do not ignore repo-root `.npmrc` / workspace manifests in App Hosting source uploads — pnpm + Turborepo need them.

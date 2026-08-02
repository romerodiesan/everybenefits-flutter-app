# ADR-001: Monorepo tooling

## Status

Accepted

## Context

The repo mixed Flutter at the root with three Next.js apps and Cloud Functions. Each TS package used its own `pnpm install` / `file:` dependency on `@pulse/shared`, with no root scripts or CI orchestration. Functions also vendor-copied shared code.

## Decision

- Use **pnpm workspaces** for `webapp`, `studio`, `admin`, `functions`, `packages/*`, and `test/rules`.
- Use **Turborepo** for `build`, `test`, `lint`, and `typecheck` pipelines with dependency awareness (`@pulse/shared` builds first).
- Keep Flutter at the repo root (`lib/`, `pubspec.yaml`); do not move into `apps/` in this wave.
- Prefer `workspace:*` for `@pulse/shared` (and later `@pulse/firebase-web`) instead of `file:` paths.
- Root scripts: `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm emulators`.

## Consequences

- One `pnpm install` at the root installs all TS packages.
- Firebase Functions still need a deployable `node_modules` layout; predeploy may sync/bundled shared packages as required by the Firebase toolchain.
- Flutter remains on `pub` / Melos-free until we extract Dart packages.

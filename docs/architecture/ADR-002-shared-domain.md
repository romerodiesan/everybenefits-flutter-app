# ADR-002: Shared domain (`@pulse/shared`)

## Status

Accepted

## Context

Roles, academy, org, and profile helpers lived in `@pulse/shared`, but forums, chats, notifications, and full user profile shapes were duplicated across Dart and three Next apps — inviting drift (for example Admin `orgNodeId` vs mobile profile).

## Decision

- Expand **`@pulse/shared`** with **Zod** schemas as the TypeScript source of truth for domain types (users, roles, org, academy, forums, notifications).
- Infer TypeScript types from Zod; Functions and Next apps import from `@pulse/shared`.
- Extract shared **client** Firebase I/O into **`@pulse/firebase-web`** (repositories), not into the pure domain package.
- Flutter keeps Dart models; align field names with shared fixtures under `packages/shared/fixtures/` and parity tests. No cross-language codegen in this wave.

## Consequences

- Web/Functions share one contract; Flutter parity is tested, not generated.
- Zod is a runtime dependency of `@pulse/shared` (webapp already depends on Zod).
- Large one-time migration of local type aliases toward shared exports.

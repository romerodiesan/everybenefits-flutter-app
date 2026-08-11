# Pulse Payments

Override Management for ACA distribution — participants, business relationships, contract terms, statement import, and reconciliation.

- Dev: `pnpm dev:payments` (port **3004**)
- Auth: SSO via Pulse (`ADR-006`)
- Access: `apps.payments.access` / platform admins
- Domain: `@pulse/shared` payments module + Cloud Functions (`apps/functions/src/payments.ts`)

See [ADR-007](../../docs/architecture/ADR-007-payments-overrides.md).

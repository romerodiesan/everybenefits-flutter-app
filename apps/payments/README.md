# Pulse Payments

Commission and override management — Pulse identity (agencies/agents), **pay mode**, **compensation plans**, carrier state rates, statement import, and **commission runs**.

## Local setup

```bash
cp apps/payments/.env.example apps/payments/.env.local
pnpm dev:payments
```

- Dev: `pnpm dev:payments` (port **3004**)
- Auth: SSO via Pulse (`ADR-006`)
- Access: `apps.payments.access` / platform admins
- Domain: `@pulse/shared` payments module + Cloud Functions

## Operator flow

1. **Carriers** — import or edit per-state commission/override intake
2. **Agencies** — Pulse agencies (active only); set pay mode (`direct` | `through_agency`)
3. **Compensation plans** — tiers, agent groups, bulk apply
4. **Statements** — import source production lines
5. **Commission runs** — end-to-end commission + override processing (ADR-008)

See `docs/architecture/ADR-008-commission-runs.md`.

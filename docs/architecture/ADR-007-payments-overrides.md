# ADR-007: ACA Override Management (`apps/payments`)

## Status

Accepted — **identity / sync portions superseded by [ADR-008](ADR-008-commission-runs.md)**

## Context

Pulse Admin models an operational org tree (`orgNodes`) with fixed depth and users attached via `orgNodeId`. ACA override economics require participants (agency or agent), temporal relationships, contract levels, carrier markets with per-state rates, statement ingest, and expected-vs-received reconciliation.

## Decision

- Ship a dedicated Next.js app **`apps/payments`** (port 3004, domain `payments.everybenefits.us`) gated by `apps.payments.access` / `platform.manage` (platform admins).
- Auth via Pulse hub + `@pulse/sso` (ADR-006); register in `PULSE_APPS` as `"payments"`.
- Domain types and pure calculation live in **`@pulse/shared`** (`payments/*`). Mutations and statement/calc orchestration live in **Cloud Functions** (ADR-003).
- **Identity (superseded):** ADR-007 originally synced `orgNodes`/`users` → `paymentsParticipants`. **ADR-008:** Payments uses Pulse identity directly (`PartyRef`); no sync for new Commission Runs.
- **Override calc** remains first-class (hierarchy spread). ADR-008 adds a parallel **commission** stream in the same module.
- Carriers are **not** parties; they live in `carriers/{id}` with a `market` and **`code` exactly 4 digits**. `carrierStateRates/{id}` holds commission + override intake.
- **Contract levels / compensation plans** remain an authoring path for override ladders (`contractTerms` materialization) until fully absorbed into `commissionRules`.
- **Pay mode** (`direct` | `through_agency`) is remittance routing — see ADR-008 `agencyPayModes`.
- Out of scope: live Google Sheets OAuth; payouts (ACH/Stripe); volume-based tiers (unless added later).

## Consequences

- See **ADR-008** for Commission Run workflow, cents money, and portal in Pulse.
- Legacy `paymentsParticipants` / sync hooks are deprecated for new features; do not expand them.
- Override hierarchy business rules (upline spread; writing producer not allocated own-book override by default) remain unless product changes them explicitly.
- **Read policy:** payments-admin clients may **read** economic / commission collections via `canAccessPaymentsData`. All **writes** are Functions / Admin SDK only.

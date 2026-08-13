# ADR-008: Commission Runs with Pulse identity (commission + override)

## Status

Accepted (supersedes ADR-007 **identity / sync** decisions only)

## Context

ADR-007 introduced a dedicated economic graph (`paymentsParticipants`, derived `businessRelationships`) synced from Pulse `orgNodes` / `users`. That dual graph required sync jobs, drift checks, and duplicated identity. Product direction is:

1. **No sync** — Payments reads agencies and agents **directly** from Pulse (`orgNodes`, `users`).
2. **Everyone participates** — all assignable agencies and eligible agents are in scope.
3. **Pay mode** is the admin differentiator: `direct` (statement per agent) vs `through_agency` (aggregate to agency).
4. **Commission and override** are both first-class calculation streams (do not drop override).

## Decision

- **Identity:** `PartyRef` = `{ kind: "agency", orgNodeId }` | `{ kind: "agent", userId }`. Hierarchy from `orgNodes.parentId` and `users.orgNodeId`.
- **Remittance:** `agencyPayModes/{orgNodeId}` stores `payMode: direct | through_agency` (default from `commissionSettings`). Does not change spread math; selects statement recipient after calc.
- **Workflow:** `commissionRuns` with explicit status machine (`DRAFT` → … → `COMPLETED`, plus `FAILED` / `CANCELLED`).
- **Streams:** rules, transactions, and allocations carry `stream: commission | override`. Engine evolves current `calc.ts` override logic to cents + PartyRef; commission stream is additive.
- **Money:** integer cents (`MoneyCents`) in `@pulse/shared`; no IEEE floats for persisted amounts.
- **Immutability:** after `APPROVED`, calculation snapshots (rule versions + hierarchy snapshot) are immutable; corrections produce new calculation / statement versions.
- **Portal:** published statements for recipients live in **Pulse** (`apps/web`), gated by `commission.statements.self` + scoped callables — not by opening `canAccessPaymentsData` to all agents.
- **Legacy:** `paymentsParticipants` sync is deprecated for new work; historical override collections may remain read-only until migrated.

## Consequences

- Payments callables load org/users via Admin SDK (`listCommissionParties`, etc.).
- ADR-007 override hierarchy semantics remain (writing producer does not eat own-book override unless configured otherwise); only identity sourcing changes.
- Granular permissions: `commission.view|upload|resolve|calculate|approve|publish|manageRules|manageImportProfiles|viewAudit|statements.self`.
- Firestore: new `commission*` + `agencyPayModes` collections — admin read / Functions write (same trusted boundary as ADR-003/007).

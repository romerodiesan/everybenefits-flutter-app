# ADR-007: ACA Override Management (`apps/payments`)

## Status

Accepted

## Context

Pulse Admin models an operational org tree (`orgNodes`) with fixed depth and users attached via `orgNodeId`. ACA override economics require a different graph: participants (agency or agent), temporal business relationships (including Agent→Agent and Agency→Agency), contract levels, carrier markets with per-state rates, statement ingest, and expected-vs-received reconciliation. Forcing that into `orgNodes` would break Admin and still could not represent agent-as-upline recipients.

## Decision

- Ship a dedicated Next.js app **`apps/payments`** (port 3004, domain `payments.everybenefits.us`) gated by `apps.payments.access` / `platform.manage` (platform admins).
- Auth via Pulse hub + `@pulse/sso` (ADR-006); register in `PULSE_APPS` as `"payments"`.
- Domain types and pure calculation live in **`@pulse/shared`** (`payments/*`). Mutations and statement/calc orchestration live in **Cloud Functions** (ADR-003).
- Economic source of truth is **`paymentsParticipants` + `businessRelationships` + `contractTerms`**, not `orgNodes`. Optional `linkedOrgNodeId` is a UX bridge only.
- **Participants** are only `agency` | `agent`. A “sub-agency” is an agency that is downline of another agency (`agency_agency`). Carriers are **not** participants; they live in `carriers/{id}` with a `market` (`aca` | `medicare` | `life`) and optional `carrierStateRates/{id}` (one active row per state with **commission** and **override** intake for the platform-owner / matriz agency — not downline distribution).
- **Relationships** are always **upline → downline** (authority only downward). `relationshipType` is **derived** from participant types (`agency_agency` | `agency_agent` | `agent_agent`); the admin does not pick a free enum. Cycles in the upline chain are rejected.
- Out of scope for v1: agent base-commission payroll UI; agency-leader authz for managing their own downline (platform admins only in the UI today).

## Consequences

- Pulse Admin `orgNodes` remain for learning/community ops until a future convergence.
- Override math must never key off `users.agency` or `orgNodes.type`.
- New Firestore collections are Admin-SDK write / payments-admin read.
- Calc may resolve carrier **override** intake from `carrierStateRates.overrideRate` when a statement line omits `carrierRate`. Commission on the carrier row is catalog-only in v1.

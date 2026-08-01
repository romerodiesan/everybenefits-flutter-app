# Pulse monorepo architecture

Canonical layout, package boundaries, and conventions for Every Benefits / Pulse.

## Layout

```text
every_benefits/
├── apps/
│   ├── mobile/          # Flutter learner app
│   ├── web/             # Next.js learner (Pulse Web)
│   ├── studio/          # Next.js academy authoring
│   ├── admin/           # Next.js ops / approvals / orgs
│   └── functions/       # Firebase Cloud Functions (Node 22)
├── packages/
│   ├── shared/          # @pulse/shared — domain types & policy
│   ├── firebase-client/ # @pulse/firebase-client — web Firebase client helpers
│   ├── ui/              # @pulse/ui — primitives, brand, chrome base
│   ├── sso/             # @pulse/sso — cross-app SSO handoff
│   ├── i18n-config/     # @pulse/i18n — locale routing defaults
│   └── insights-metrics/# @pulse/insights-metrics — pure Studio metrics
├── scripts/             # seed, migrate, bulk-approve, emulators
├── docs/
├── package.json         # pnpm workspace root
├── pnpm-workspace.yaml
├── turbo.json
├── firebase.json
└── .firebaserc
```

Firebase rules/indexes stay at the **repo root** (`firestore.rules`, `database.rules.json`, etc.) so the Firebase CLI and App Hosting config remain simple.

## Apps

| App | Path | Port | Role |
|-----|------|------|------|
| Web | `apps/web` | 3000 | Learner: forums, chats, academy, Pulse AI |
| Studio | `apps/studio` | 3001 | Course authoring + insights |
| Admin | `apps/admin` | 3002 | Users, orgs, approvals, notifications |
| Functions | `apps/functions` | 5001 (emu) | Trusted callables + triggers |
| Mobile | `apps/mobile` | — | Flutter iOS/Android/desktop |

### Next.js conventions

- App Router under `app/[locale]/` with next-intl (`proxy.ts`, not legacy `middleware.ts`).
- Domain UI under `components/<domain>/`; shared chrome via `@pulse/ui`.
- Firebase client via `@pulse/firebase-client`; do not copy `lib/firebase/client.ts` per app.
- SSO API routes are thin wrappers around `@pulse/sso`.
- Messages (`messages/en.json`, `es.json`) stay **per app** (different product copy).

### Cloud Functions conventions

- `src/index.ts` only re-exports domain modules.
- One folder ≈ one bounded context: `chat/`, `forum/`, `academy/`, `admin/`, `org/`, `notifications/`, `insights/`, `account/`, `sso/`.
- Shared helpers in `src/lib/` (`requireCaller`, CORS, App Check).
- Depends on workspace `@pulse/shared` (vendored at deploy via `sync:shared` if the Firebase upload root cannot see the monorepo).

### Flutter conventions

- Feature-first under `lib/features/<name>/`.
- Shared: `lib/app/` (shell/theme), `lib/auth/`, `lib/users/`, `lib/core/` (DI, firebase).
- Construct repositories in the composition root (`main` / `core/di`), not inside the shell.
- Role policy in Dart must stay aligned with `@pulse/shared` (see checklist below). No Dart↔TS codegen in v1.

## Packages

| Package | Includes | Excludes |
|---------|----------|----------|
| `@pulse/shared` | roles, permissions, org, academy types, profile/approval parsers, CSP builders | React, Firebase SDK |
| `@pulse/firebase-client` | app init, auth helpers, `callCloudFunction`, emulator connect | Admin SDK |
| `@pulse/firebase-admin` | `createFirebaseAdmin({ appName })` for Next server routes | Client SDK |
| `@pulse/ui` | primitives, brand-mark, AppSwitcher, CommandPalette, ThemeProvider | Domain pages (users table, course editor) |
| `@pulse/sso` | handoff helpers + route-handler factories | Per-app branding |
| `@pulse/i18n` | locales, `localePrefix`, routing defaults | Message catalogs |
| `@pulse/insights-metrics` | pure aggregation helpers | Firestore I/O |

## User lifecycle fields

On `users/{uid}` (not redundant):

| Field | Values | Meaning |
|-------|--------|---------|
| `approvalStatus` | `pending` \| `approved` \| `rejected` | Onboarding gate |
| `accountStatus` | `active` \| `deactivated` \| `pendingDeletion` | Account lifecycle |

Missing `approvalStatus` ⇒ treated as approved (legacy). Missing `accountStatus` ⇒ treated as active.

## Deploy policy

**Hosting:** Firebase App Hosting for `web`, `studio`, and `admin` (backends in `firebase.json`). Pulse AI reindex should use Cloud Scheduler or an App Hosting scheduled job → web `/api/ai/reindex`.

App Check: required for production web callables/AI; configure site keys in each app’s App Hosting env.

## Tooling

```bash
pnpm install                 # root — all JS apps + packages
pnpm dev:web | dev:studio | dev:admin
pnpm build                   # turbo build
pnpm lint
pnpm --filter @pulse/functions build
./scripts/start-emulators.sh
```

Flutter (from `apps/mobile`):

```bash
flutter pub get && flutter run
```

## Where to put new code

| Kind of change | Location |
|----------------|----------|
| Role / permission / org / academy type | `packages/shared` |
| Button / brand / shared shell chrome | `packages/ui` |
| SSO handoff behavior | `packages/sso` |
| New trusted mutation | `apps/functions/src/<domain>/` |
| Learner UI feature | `apps/web` |
| Course editor / insights UI | `apps/studio` |
| Approvals / org admin UI | `apps/admin` |
| Mobile feature | `apps/mobile/lib/features/` |

## Flutter ↔ `@pulse/shared` alignment checklist

When changing roles or approval rules in TypeScript, update Dart in the same PR:

- [ ] `packages/shared/src/roles.ts` ↔ `apps/mobile/lib/users/user_role.dart`
- [ ] `packages/shared/src/profile.ts` (`ApprovalStatus`, `isUserApproved`) ↔ `apps/mobile/lib/users/profile_validation.dart`
- [ ] Academy permission helpers ↔ `apps/mobile/lib/features/university/` as needed

## Related docs

- [Pulse AI](./pulse-ai.md)
- [Deploy policy](./deploy.md)
- Per-app READMEs under `apps/web`, `apps/studio`, `apps/admin`

# ADR-006: Pulse as auth hub

## Status

Accepted

## Context

Pulse, Studio, and Admin share one Firebase Auth project. Sessions are **per origin**, so cross-app continuity uses opaque SSO handoffs (`@pulse/sso`). Login UX (magic link, MFA, register) already lives on Pulse; Studio/Admin still had full local login forms and inconsistent logout cascades. A dedicated `auth.everybenefits.us` app was considered.

## Decision

| Concern | Where it lives |
|---------|----------------|
| Identity provider | **Firebase Auth** (shared project) |
| Preferred session / SSO hub | **Pulse** (`apps/web`) |
| Login, register, magic link, MFA, forgot password | Pulse only |
| Account settings (profile, privacy, security, approval) | Pulse `/account` |
| SSO protocol (create / exchange / bridge / consume; local logout) | `@pulse/sso` (+ thin Next `/api/auth/*` and Functions mirrors) |
| Studio / Admin unauthenticated entry | Silent bridge to Pulse; CTA to Pulse login; no rich local auth UX |
| Dedicated `auth.*` web app | **Deferred** until account scope, product count, or compliance requires a separate origin |

Studio and Admin may keep a minimal emergency local sign-in for offline/dev recovery; it is not the product path.

## Consequences

- Do not clone Pulse login into Studio/Admin.
- App Switcher and “Manage account” deep links hand off to Pulse via SSO.
- Logout is **local to the current origin** (no multi-app redirect cascade). Sibling sessions remain until signed out there.
- Extracting a future auth app is a URL/hub migration on top of `@pulse/sso`, not a new IdP.

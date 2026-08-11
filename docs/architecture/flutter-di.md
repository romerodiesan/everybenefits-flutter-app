# Flutter DI and navigation

## Bootstrap

[`apps/mobile/lib/main.dart`](../../apps/mobile/lib/main.dart) initializes Firebase, App Check / emulators, then constructs repositories and services manually (constructor injection). There is no Riverpod/Bloc in this wave.

Typical graph:

- `AuthService` — Firebase Auth providers / MFA
- `UserRepository` — profile persistence
- Feature repositories — forums, chats, university/academy, notifications
- `PulseShell` — tab navigation and badge streams

Pass repositories into feature screens via constructors or inherited shell state; avoid service locators.

## Navigation

Imperative `Navigator` / `MaterialPageRoute` from the shell tabs (Forums, Chats, Academy, Profile). **`go_router` is deferred** until a navigation-heavy change justifies it.

## Domain parity

Field names on `UserProfile` and related models should match `@pulse/shared` fixtures under `packages/shared/fixtures/`. Prefer adding `orgNodeId` and account lifecycle fields when Admin/Functions expose them.

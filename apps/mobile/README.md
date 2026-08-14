# Pulse Mobile (Flutter)

Insurance-agent learning app. Firebase project: **every-benefits-us**
(same as Pulse web / Studio / Admin).

## Prerequisites

- Flutter SDK (see root `README.md`)
- Local emulators: from repo root `pnpm emulators` (`--project every-benefits-us`)

## Run (simulator)

```bash
cd apps/mobile
flutter run
```

Debug builds default to Firebase emulators (`USE_FIREBASE_EMULATORS`).

## Run (physical device)

Pass your Mac LAN IP so the phone can reach emulators:

```bash
flutter run --dart-define=FIREBASE_EMULATOR_HOST=10.0.0.x
```

After changing the emulator host, **fully quit** the app (not hot restart) —
native Firestore channels cache the old host (`GOAWAY too_many_pings`).

## Firebase config

- Dart: `lib/firebase_options.dart`
- iOS: `ios/Runner/GoogleService-Info.plist`
- Android: `android/app/google-services.json`

Native apps currently use format-valid `:ios:` / `:android:` placeholder app IDs.
**App Check:** Flutter’s plugin defaults to DeviceCheck on load; iOS
`AppDelegate` installs a no-op provider so debug builds never call
`exchangeDeviceCheckToken`. Dart never `activate()`s App Check in non-prod.

Register real apps and overwrite plists when ready for production App Check:

```bash
firebase login --reauth
firebase apps:create IOS --bundle-id com.everybenefits.everyinsurance \
  --project every-benefits-us
firebase apps:sdkconfig IOS <appId> --project every-benefits-us \
  -o ios/Runner/GoogleService-Info.plist
# Then copy the GOOGLE_APP_ID into lib/firebase_options.dart (ios.appId).
```

## Auth smoke checklist

1. Register email/password (given + family name)
2. Complete profile (phone verify uses code `123456` on emulator)
3. Land on pending approval (or seed-approve in Firestore emulator)
4. Login password → shell
5. Logout / login again
6. Account gates: set `accountStatus` to `deactivated` / `pendingDeletion` → gate screen
7. (Optional) Google sign-in after OAuth clients exist on every-benefits-us
8. MFA enroll is skipped on Auth emulator (use prod Auth to test enrollment)

## Roles / permissions

Mobile hydrates `roles/{roleId}.permissions` (same as web). Built-in defaults
cover `agency_owner`. Gates (forums/chats/academy/admin/license) use
`AccessScope`, not hard-coded enum checks.

Smoke: student + agent + agency_owner can post/chat; guest cannot; manager sees
Admin promote when `admin.access` is present.

## Tests

```bash
flutter test test/users/
# From repo root (rules create profile):
pnpm test:rules
```

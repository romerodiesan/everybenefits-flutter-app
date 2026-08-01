#!/usr/bin/env bash
# Local Firebase Emulator Suite — auth, Firestore, RTDB, Storage, Functions.
# Avoids ADC hitting production and Node engines mismatches.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Prefer Node 22 (Cloud Functions Gen2 runtime). Install from apps/functions/.nvmrc.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  (
    cd apps/functions
    nvm install >/dev/null
    nvm use >/dev/null
  )
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  nvm use "$(cat apps/functions/.nvmrc)" >/dev/null
fi

echo "Node $(node -v) (Functions runtime expects 22.x)"

# Don't let laptop gcloud ADC talk to production from the Functions emulator
# for non-emulated products. Firestore/RTDB/Auth/Storage stay on emulators below.
if [[ -n "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]]; then
  echo "Unsetting GOOGLE_APPLICATION_CREDENTIALS for this emulator session"
  unset GOOGLE_APPLICATION_CREDENTIALS
fi

# Force Admin SDK at emulators (CLI also sets these for the Functions process).
export FIRESTORE_EMULATOR_HOST="${FIRESTORE_EMULATOR_HOST:-127.0.0.1:8080}"
export FIREBASE_AUTH_EMULATOR_HOST="${FIREBASE_AUTH_EMULATOR_HOST:-127.0.0.1:9099}"
export FIREBASE_DATABASE_EMULATOR_HOST="${FIREBASE_DATABASE_EMULATOR_HOST:-127.0.0.1:9000}"
export FIREBASE_STORAGE_EMULATOR_HOST="${FIREBASE_STORAGE_EMULATOR_HOST:-127.0.0.1:9199}"
export FUNCTIONS_EMULATOR=true
export GCLOUD_PROJECT="${GCLOUD_PROJECT:-every-insurance}"
export GOOGLE_CLOUD_PROJECT="$GCLOUD_PROJECT"

pnpm --prefix apps/functions run build

# Without local secret stubs, Gen2 discovery calls Secret Manager. A 403 there
# causes "Failed to load function definition" and the emulator serves ZERO
# callables (listPublicProfiles, Insights, etc. all look "unavailable").
SECRET_LOCAL="$ROOT/apps/functions/.secret.local"
if [[ ! -f "$SECRET_LOCAL" ]]; then
  cat >"$SECRET_LOCAL" <<'EOF'
RESEND_API_KEY=local-dev-not-a-real-key
EMAIL_FROM=Pulse Local <noreply@everybenefits.demo>
EOF
  echo "Created apps/functions/.secret.local (email stubs for the emulator)"
fi

LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
if [[ -n "${LAN_IP}" ]]; then
  echo ""
  echo "LAN IP for phone / Flutter (IP rotates — refresh if login times out):"
  echo "  flutter run --dart-define=FIREBASE_EMULATOR_HOST=${LAN_IP}"
  echo "  Web from phone: set NEXT_PUBLIC_FIREBASE_EMULATOR_HOST=${LAN_IP} then open http://${LAN_IP}:3000"
  echo "  Browser on this Mac: leave that env unset and use http://localhost:3000"
  echo ""
fi

exec npx -y firebase-tools@latest emulators:start \
  --only auth,firestore,database,storage,functions,ui \
  --project every-insurance

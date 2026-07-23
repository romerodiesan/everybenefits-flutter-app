#!/usr/bin/env bash
# Local Firebase Emulator Suite — auth, Firestore, RTDB, Storage, Functions.
# Avoids ADC hitting production and Node engines mismatches.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Prefer Node 22 (Cloud Functions Gen2 runtime). Install from functions/.nvmrc.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  (
    cd functions
    nvm install >/dev/null
    nvm use >/dev/null
  )
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  nvm use "$(cat functions/.nvmrc)" >/dev/null
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

npm --prefix functions run build

exec npx -y firebase-tools@latest emulators:start \
  --only auth,firestore,database,storage,functions,ui \
  --project every-insurance

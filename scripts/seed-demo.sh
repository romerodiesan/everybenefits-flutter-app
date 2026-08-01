#!/usr/bin/env bash
# Seed Pulse / Studio / Admin demo data into local Firebase emulators.
# Requires: ./scripts/start-emulators.sh running in another terminal.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export FIRESTORE_EMULATOR_HOST="${FIRESTORE_EMULATOR_HOST:-127.0.0.1:8080}"
export FIREBASE_AUTH_EMULATOR_HOST="${FIREBASE_AUTH_EMULATOR_HOST:-127.0.0.1:9099}"
export FIREBASE_DATABASE_EMULATOR_HOST="${FIREBASE_DATABASE_EMULATOR_HOST:-127.0.0.1:9000}"
export FIREBASE_STORAGE_EMULATOR_HOST="${FIREBASE_STORAGE_EMULATOR_HOST:-127.0.0.1:9199}"
export GCLOUD_PROJECT="${GCLOUD_PROJECT:-every-insurance}"
export GOOGLE_CLOUD_PROJECT="$GCLOUD_PROJECT"
export FIREBASE_DATABASE_URL="${FIREBASE_DATABASE_URL:-http://127.0.0.1:9000?ns=${GCLOUD_PROJECT}}"

# Prefer the same Node as Functions if nvm is available.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ -s "$NVM_DIR/nvm.sh" && -f apps/functions/.nvmrc ]]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  nvm use "$(cat apps/functions/.nvmrc)" >/dev/null
fi

if [[ ! -d apps/functions/node_modules/firebase-admin ]]; then
  echo "Installing functions deps (firebase-admin)…"
  pnpm --prefix apps/functions install --silent
fi

echo "Seeding emulators at Firestore ${FIRESTORE_EMULATOR_HOST} / Auth ${FIREBASE_AUTH_EMULATOR_HOST}"
exec node scripts/seed-demo-platform.mjs "$@"

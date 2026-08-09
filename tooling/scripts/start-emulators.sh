#!/usr/bin/env bash
# Local Firebase Emulator Suite — auth, Firestore, RTDB, Storage, Functions.
# Avoids ADC hitting production and Node engines mismatches.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
FUNCTIONS_DIR="$ROOT/apps/functions"

# Prefer Node 24 (Cloud Functions Gen2 runtime). Install from apps/functions/.nvmrc.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  (
    cd "$FUNCTIONS_DIR"
    nvm install >/dev/null
    nvm use >/dev/null
  )
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  nvm use "$(cat "$FUNCTIONS_DIR/.nvmrc")" >/dev/null
fi

echo "Node $(node -v) (Functions runtime expects 24.x)"

# Firestore/UI emulators need a real JDK. Homebrew OpenJDK is often installed but
# not registered with macOS (/usr/bin/java is a stub). Prefer JAVA_HOME if set.
if [[ -z "${JAVA_HOME:-}" ]]; then
  for candidate in \
    /opt/homebrew/opt/openjdk@25/libexec/openjdk.jdk/Contents/Home \
    /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home \
    /opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home \
    /usr/local/opt/openjdk@25/libexec/openjdk.jdk/Contents/Home \
    /usr/local/opt/openjdk/libexec/openjdk.jdk/Contents/Home
  do
    if [[ -x "${candidate}/bin/java" ]]; then
      export JAVA_HOME="${candidate}"
      break
    fi
  done
fi
if [[ -n "${JAVA_HOME:-}" ]]; then
  export PATH="${JAVA_HOME}/bin:${PATH}"
fi
if ! command -v java >/dev/null 2>&1 || ! java -version >/dev/null 2>&1; then
  echo "Java runtime not found. Install with: brew install openjdk@25" >&2
  echo "Then either re-run this script, or register it for macOS:" >&2
  echo "  sudo ln -sfn \$(brew --prefix openjdk@25)/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-25.jdk" >&2
  exit 1
fi
echo "Java $(java -version 2>&1 | head -1)"

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
# Must match NEXT_PUBLIC_FIREBASE_PROJECT_ID in apps/*/.env.local
export GCLOUD_PROJECT="${GCLOUD_PROJECT:-every-benefits-us}"
export GOOGLE_CLOUD_PROJECT="$GCLOUD_PROJECT"

pnpm --filter @pulse/functions run build

LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
if [[ -n "${LAN_IP}" ]]; then
  echo ""
  echo "LAN IP for phone / Flutter (IP rotates — refresh if login times out):"
  echo "  cd apps/mobile && flutter run --dart-define=FIREBASE_EMULATOR_HOST=${LAN_IP}"
  echo "  Web from phone: set NEXT_PUBLIC_FIREBASE_EMULATOR_HOST=${LAN_IP} then open http://${LAN_IP}:3000"
  echo "  Browser on this Mac: leave that env unset and use http://localhost:3000"
  echo ""
fi

exec npx -y firebase-tools@latest emulators:start \
  --only auth,firestore,database,storage,functions,ui \
  --project "${GCLOUD_PROJECT}"

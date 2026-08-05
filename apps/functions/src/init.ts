import * as admin from "firebase-admin";
import { setGlobalOptions } from "firebase-functions/v2";

admin.initializeApp({
  databaseURL:
    process.env.FIREBASE_DATABASE_URL ||
    "https://every-insurance-default-rtdb.firebaseio.com",
});
setGlobalOptions({ region: "us-central1", maxInstances: 20 });

/** Gen2 callables need explicit CORS for browser (e.g. localhost webapp). */
const usingFunctionsEmulator = process.env.FUNCTIONS_EMULATOR === "true";
/** Opt-in: set FUNCTIONS_ENFORCE_APP_CHECK=true once Pulse/Studio site keys are live. */
const enforceAppCheck =
  !usingFunctionsEmulator &&
  process.env.FUNCTIONS_ENFORCE_APP_CHECK === "true";

export const callableOpts = {
  // Emulator Gen2 often drops Access-Control headers on preflight when cors is
  // an allow-list; open it fully locally. Production keeps an explicit list.
  cors: usingFunctionsEmulator
    ? true
    : [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
        "https://every-insurance.web.app",
        "https://every-insurance.firebaseapp.com",
        "https://pulse.everybenefits.us",
        "https://studio.everybenefits.us",
        "https://admin.everybenefits.us",
        "https://pulse-web-app--every-benefits-us.us-central1.hosted.app",
        "https://studio-web-app--every-benefits-us.us-central1.hosted.app",
        "https://admin-web-app--every-benefits-us.us-central1.hosted.app",
        ...(process.env.FUNCTIONS_ALLOWED_ORIGINS ?? "")
          .split(",")
          .map((origin) => origin.trim())
          .filter(Boolean),
      ],
  // Emulator clients skip App Check. Production stays off until site keys are
  // configured on pulse.everybenefits.us / studio.everybenefits.us / admin.everybenefits.us, then set
  // FUNCTIONS_ENFORCE_APP_CHECK=true.
  enforceAppCheck,
  // Auth is enforced inside the handler; Cloud Run must allow the OPTIONS preflight.
  invoker: "public" as const,
};

export const db = admin.firestore();
export const rtdb = admin.database();
export { admin };

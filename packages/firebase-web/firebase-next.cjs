/**
 * Next.js helpers so the Firebase JS SDK keeps a single @firebase/app singleton.
 *
 * pnpm does not hoist @firebase/app into @firebase/database (it is not a declared
 * dependency). Webpack then embeds two copies; getDatabase() throws
 * "Service database is not available".
 */
const fs = require("node:fs");
const path = require("node:path");

const FIREBASE_SERVER_EXTERNAL_PACKAGES = [
  "firebase",
  "firebase-admin",
  "firebase/app",
  "firebase/auth",
  "firebase/database",
  "firebase/firestore",
  "firebase/storage",
  "firebase/functions",
  "firebase/app-check",
  "@firebase/app",
  "@firebase/auth",
  "@firebase/database",
  "@firebase/firestore",
  "@firebase/storage",
  "@firebase/functions",
  "@firebase/app-check",
  "@firebase/component",
  "@firebase/util",
  "@firebase/logger",
];

function firebaseSdkNodeModules(dir) {
  const candidates = [
    path.join(dir, "node_modules/firebase"),
    path.join(process.cwd(), "node_modules/firebase"),
  ];
  for (const candidate of candidates) {
    try {
      return path.dirname(fs.realpathSync(candidate));
    } catch {
      // Keep trying other roots (turbo vs App Hosting cwd).
    }
  }
  return null;
}

/** @returns {Record<string, string>} */
function firebaseResolveAliases(dir) {
  const sdkRoot = firebaseSdkNodeModules(dir);
  /** @type {Record<string, string>} */
  const aliases = {};
  if (!sdkRoot) return aliases;
  aliases["@firebase/app"] = path.join(sdkRoot, "@firebase/app");
  aliases["@firebase/database"] = path.join(sdkRoot, "@firebase/database");
  return aliases;
}

function applyFirebaseWebpackAliases(config, dir) {
  const aliases = firebaseResolveAliases(dir);
  if (!Object.keys(aliases).length) return config;
  config.resolve ??= {};
  const prev = config.resolve.alias;
  if (Array.isArray(prev)) {
    config.resolve.alias = [
      ...prev,
      ...Object.entries(aliases).map(([name, alias]) => ({ name, alias })),
    ];
  } else {
    config.resolve.alias = { ...prev, ...aliases };
  }
  return config;
}

module.exports = {
  FIREBASE_SERVER_EXTERNAL_PACKAGES,
  firebaseResolveAliases,
  applyFirebaseWebpackAliases,
};

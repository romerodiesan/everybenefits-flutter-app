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

/**
 * Webpack accepts absolute filesystem paths. Turbopack does not — it treats
 * `/abs/path` as a server-relative import and the build dies.
 *
 * @param {string} dir Next.js project directory (apps/web, etc.)
 * @param {"webpack" | "turbopack"} kind
 * @returns {Record<string, string>}
 */
function firebaseResolveAliases(dir, kind) {
  const sdkRoot = firebaseSdkNodeModules(dir);
  /** @type {Record<string, string>} */
  const aliases = {};
  if (!sdkRoot) return aliases;
  for (const pkg of ["@firebase/app", "@firebase/database"]) {
    const abs = fs.realpathSync(path.join(sdkRoot, pkg));
    if (kind === "turbopack") {
      let rel = path.relative(dir, abs).replaceAll("\\", "/");
      if (!rel.startsWith(".")) rel = `./${rel}`;
      aliases[pkg] = rel;
    } else {
      aliases[pkg] = abs;
    }
  }
  return aliases;
}

function applyFirebaseWebpackAliases(config, dir) {
  const aliases = firebaseResolveAliases(dir, "webpack");
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

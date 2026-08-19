#!/usr/bin/env node
/**
 * Copies packages/shared into apps/functions/vendor/pulse-shared so Cloud
 * Build can resolve file:./vendor/pulse-shared without the monorepo root.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const functionsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.resolve(functionsDir, "../..");
const src = path.join(root, "packages/shared");
const dest = path.join(functionsDir, "vendor/pulse-shared");
const tsc = path.join(root, "node_modules/typescript/bin/tsc");

execSync(`node "${tsc}" -p tsconfig.json`, { cwd: src, stdio: "inherit" });

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });

const pkg = JSON.parse(fs.readFileSync(path.join(src, "package.json"), "utf8"));
delete pkg.scripts;
delete pkg.devDependencies;
fs.writeFileSync(path.join(dest, "package.json"), JSON.stringify(pkg, null, 2) + "\n");

fs.cpSync(path.join(src, "dist"), path.join(dest, "dist"), {
  recursive: true,
  filter: (srcPath) => !/\.test\.(js|d\.ts)(\.map)?$/.test(srcPath),
});

// Refresh pnpm's materialized copy of file:./vendor/pulse-shared when present.
const pnpmShared = path.join(
  functionsDir,
  "node_modules/@pulse/shared",
);
try {
  const resolved = fs.realpathSync(pnpmShared);
  if (resolved !== dest) {
    fs.rmSync(path.join(resolved, "dist"), { recursive: true, force: true });
    fs.cpSync(path.join(dest, "dist"), path.join(resolved, "dist"), {
      recursive: true,
    });
    fs.copyFileSync(
      path.join(dest, "package.json"),
      path.join(resolved, "package.json"),
    );
  }
} catch {
  // node_modules may be absent during Cloud Build before install.
}

console.log(`Synced @pulse/shared → ${dest}`);

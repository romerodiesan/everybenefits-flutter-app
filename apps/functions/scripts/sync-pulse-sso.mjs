#!/usr/bin/env node
/**
 * Copies packages/sso into apps/functions/vendor/pulse-sso so Cloud
 * Build can resolve file:./vendor/pulse-sso without the monorepo root.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const functionsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.resolve(functionsDir, "../..");
const src = path.join(root, "packages/sso");
const dest = path.join(functionsDir, "vendor/pulse-sso");
const tsc = path.join(root, "node_modules/typescript/bin/tsc");

execSync(`node "${tsc}" -p tsconfig.json`, { cwd: src, stdio: "inherit" });

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });

const pkg = JSON.parse(fs.readFileSync(path.join(src, "package.json"), "utf8"));
delete pkg.scripts;
delete pkg.devDependencies;
delete pkg.peerDependenciesMeta;
pkg.dependencies = {
  "@pulse/shared": "file:../pulse-shared",
};
pkg.peerDependencies = {
  "firebase-admin": "^14.0.0",
};
fs.writeFileSync(path.join(dest, "package.json"), JSON.stringify(pkg, null, 2) + "\n");

fs.cpSync(path.join(src, "dist"), path.join(dest, "dist"), { recursive: true });
console.log(`Synced @pulse/sso → ${dest}`);

#!/usr/bin/env node
/**
 * Fail if apps/functions/vendor/pulse-shared is out of date vs packages/shared.
 * Used in CI after a fresh build/sync expectation.
 *
 * Usage:
 *   node apps/functions/scripts/check-pulse-shared-vendor.mjs
 *
 * Rebuilds packages/shared, syncs to a temp dir (or compares after sync), then
 * diffs dist/ against vendor. Exit 1 on mismatch.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import os from "node:os";

const functionsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.resolve(functionsDir, "../..");
const src = path.join(root, "packages/shared");
const vendor = path.join(functionsDir, "vendor/pulse-shared");
const tsc = path.join(root, "node_modules/typescript/bin/tsc");

function hashTree(dir) {
  const hashes = [];
  function walk(d, rel = "") {
    if (!fs.existsSync(d)) return;
    for (const name of fs.readdirSync(d).sort()) {
      if (name === "node_modules" || name === ".DS_Store") continue;
      const full = path.join(d, name);
      const r = rel ? `${rel}/${name}` : name;
      const st = fs.statSync(full);
      if (st.isDirectory()) walk(full, r);
      else {
        const h = crypto.createHash("sha256").update(fs.readFileSync(full)).digest("hex");
        hashes.push(`${r}:${h}`);
      }
    }
  }
  walk(dir);
  return crypto.createHash("sha256").update(hashes.join("\n")).digest("hex");
}

if (!fs.existsSync(vendor)) {
  console.error("Missing vendor/pulse-shared. Run: pnpm sync:functions-shared");
  process.exit(1);
}

execSync(`node "${tsc}" -p tsconfig.json`, { cwd: src, stdio: "inherit" });

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pulse-shared-"));
const expectedDist = path.join(tmp, "dist");
fs.cpSync(path.join(src, "dist"), expectedDist, { recursive: true });

const expectedPkg = JSON.parse(fs.readFileSync(path.join(src, "package.json"), "utf8"));
delete expectedPkg.scripts;
delete expectedPkg.devDependencies;
fs.writeFileSync(
  path.join(tmp, "package.json"),
  JSON.stringify(expectedPkg, null, 2) + "\n",
);

const expectedHash = hashTree(tmp);
const vendorHash = hashTree(vendor);

fs.rmSync(tmp, { recursive: true, force: true });

if (expectedHash !== vendorHash) {
  console.error(
    "apps/functions/vendor/pulse-shared is out of date with packages/shared.\n" +
      "Run: pnpm sync:functions-shared\n" +
      `expected=${expectedHash}\nvendor=${vendorHash}`,
  );
  process.exit(1);
}

console.log("vendor/pulse-shared matches packages/shared dist ✓");

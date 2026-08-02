#!/usr/bin/env node
/**
 * Copies packages/pulse-shared into functions/vendor/pulse-shared so Cloud
 * Build can resolve file:./vendor/pulse-shared without the monorepo root.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const src = path.join(root, "packages/pulse-shared");
const dest = path.join(root, "functions/vendor/pulse-shared");

execSync("node ../../node_modules/typescript/bin/tsc -p tsconfig.json", {
  cwd: src,
  stdio: "inherit",
});

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });

const pkg = JSON.parse(fs.readFileSync(path.join(src, "package.json"), "utf8"));
delete pkg.scripts;
delete pkg.devDependencies;
fs.writeFileSync(path.join(dest, "package.json"), JSON.stringify(pkg, null, 2) + "\n");

fs.cpSync(path.join(src, "dist"), path.join(dest, "dist"), { recursive: true });
console.log(`Synced @pulse/shared → ${dest}`);

#!/usr/bin/env node
/**
 * Copies workspace packages into functions/vendor/ so Cloud Build can resolve
 * file:./vendor/* without the monorepo root.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function syncPackage(name, srcRel, destRel) {
  const src = path.join(root, srcRel);
  const dest = path.join(root, destRel);
  execSync('pnpm run build', { cwd: src, stdio: 'inherit' });
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  const pkg = JSON.parse(fs.readFileSync(path.join(src, 'package.json'), 'utf8'));
  delete pkg.scripts;
  delete pkg.devDependencies;
  delete pkg.peerDependencies;
  fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
  fs.cpSync(path.join(src, 'dist'), path.join(dest, 'dist'), { recursive: true });
  console.log(`Synced ${name} → ${dest}`);
}

syncPackage('@pulse/shared', 'packages/shared', 'apps/functions/vendor/pulse-shared');
syncPackage(
  '@pulse/insights-metrics',
  'packages/insights-metrics',
  'apps/functions/vendor/insights-metrics',
);

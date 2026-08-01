#!/usr/bin/env node
/**
 * Bulk-approve users currently waiting on approvalStatus.
 *
 * Two independent lifecycle fields on users/{uid} (not redundant):
 *
 *   approvalStatus  — onboarding gate (pending | approved | rejected)
 *                     Missing field = treated as approved (legacy).
 *                     This script only touches this field.
 *
 *   accountStatus   — account lifecycle (active | deactivated | pendingDeletion)
 *                     Missing field = treated as active.
 *                     Controlled separately via admin deactivate/reactivate.
 *                     This script never changes accountStatus.
 *
 * Admin UI:
 *   Approvals page  → approvalStatus only
 *   Users page      → both columns / filters
 *
 * Usage:
 *   node scripts/bulk-approve-users.mjs                 # dry-run pending only
 *   node scripts/bulk-approve-users.mjs --dry-run
 *   node scripts/bulk-approve-users.mjs --apply
 *   node scripts/bulk-approve-users.mjs --include-missing   # also stamp legacy (no field)
 *   node scripts/bulk-approve-users.mjs --include-rejected
 *   node scripts/bulk-approve-users.mjs --apply --include-missing --limit=50
 *
 * Env:
 *   GOOGLE_APPLICATION_CREDENTIALS  path to service account JSON
 *   GCLOUD_PROJECT / FIREBASE_PROJECT_ID  default every-benefits-us
 *   FIRESTORE_EMULATOR_HOST         if set, targets emulator (no SA needed)
 *
 * Side effect: writing approvalStatus → approved fires syncUserAutoJoinGroups
 * in production (auto-join chat groups by role).
 */

import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const functionsPkg = path.resolve(__dirname, '../apps/functions/package.json');
if (!fs.existsSync(functionsPkg)) {
  console.error('apps/functions/package.json missing.');
  process.exit(1);
}
if (
  !fs.existsSync(
    path.resolve(__dirname, '../apps/functions/node_modules/firebase-admin'),
  )
) {
  console.error(
    'firebase-admin missing. Run: pnpm --prefix apps/functions install',
  );
  process.exit(1);
}

const requireFn = createRequire(functionsPkg);
const { initializeApp, getApps, cert } = requireFn('firebase-admin/app');
const { getFirestore, FieldValue } = requireFn('firebase-admin/firestore');

const DEFAULT_PROJECT = 'every-benefits-us';
const DEFAULT_SA =
  '/Users/diesanromero/Documents/every-benefits-us-firebase-adminsdk-647hy-e905aa3d4e.json';
const BATCH_SIZE = 400;
const APPROVED_BY = 'bulk-approve-script';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const DRY_RUN = !APPLY;
const INCLUDE_REJECTED = args.includes('--include-rejected');
const INCLUDE_MISSING = args.includes('--include-missing');
const limitArg = args.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : null;
const projectArg = args.find((a) => a.startsWith('--project='));
const PROJECT_ID =
  projectArg?.split('=')[1] ||
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GCLOUD_PROJECT ||
  DEFAULT_PROJECT;
const approvedByArg = args.find((a) => a.startsWith('--approved-by='));
const approvedBy = approvedByArg?.split('=')[1] || APPROVED_BY;

function initAdmin() {
  if (getApps().length) return;
  const usingEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  if (usingEmulator) {
    initializeApp({ projectId: PROJECT_ID });
    console.log(
      `Using Firestore emulator at ${process.env.FIRESTORE_EMULATOR_HOST}`,
    );
    return;
  }
  const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || DEFAULT_SA;
  if (!fs.existsSync(saPath)) {
    throw new Error(
      `Service account not found at ${saPath}. Set GOOGLE_APPLICATION_CREDENTIALS.`,
    );
  }
  const sa = requireFn(saPath);
  initializeApp({
    credential: cert(sa),
    projectId: PROJECT_ID,
  });
}

function label(data) {
  const name =
    (typeof data.displayName === 'string' && data.displayName.trim()) ||
    (typeof data.email === 'string' && data.email.trim()) ||
    '(no name)';
  return name;
}

async function queryByApprovalStatus(db, status) {
  const snap = await db
    .collection('users')
    .where('approvalStatus', '==', status)
    .get();
  return snap.docs.filter((doc) => doc.data()?.isAnonymous !== true);
}

/** Legacy users with no approvalStatus field (Admin shows as "none"). */
async function queryMissingApproval(db) {
  const snap = await db
    .collection('users')
    .select(
      'approvalStatus',
      'accountStatus',
      'isAnonymous',
      'role',
      'email',
      'displayName',
    )
    .get();
  return snap.docs.filter((doc) => {
    const data = doc.data() || {};
    if (data.isAnonymous === true) return false;
    return data.approvalStatus == null || data.approvalStatus === '';
  });
}

async function countAccountStatuses(db) {
  const snap = await db
    .collection('users')
    .select('accountStatus', 'isAnonymous')
    .get();
  const counts = {
    nonAnonymous: 0,
    active: 0,
    deactivated: 0,
    pendingDeletion: 0,
    missingAccountStatus: 0,
  };
  for (const doc of snap.docs) {
    const data = doc.data() || {};
    if (data.isAnonymous === true) continue;
    counts.nonAnonymous += 1;
    const status = data.accountStatus;
    if (status === 'deactivated') counts.deactivated += 1;
    else if (status === 'pendingDeletion') counts.pendingDeletion += 1;
    else if (status === 'active') counts.active += 1;
    else counts.missingAccountStatus += 1;
  }
  return counts;
}

async function main() {
  if (Number.isFinite(LIMIT) && (LIMIT <= 0 || Number.isNaN(LIMIT))) {
    throw new Error(`Invalid --limit=${limitArg}`);
  }

  initAdmin();
  const db = getFirestore();

  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY-RUN (pass --apply to write)' : 'APPLY'}`);
  console.log(`Approved by: ${approvedBy}`);
  console.log(`Include rejected: ${INCLUDE_REJECTED}`);
  console.log(`Include missing (legacy): ${INCLUDE_MISSING}`);
  if (LIMIT != null) console.log(`Limit: ${LIMIT}`);
  console.log('');

  const accountCounts = await countAccountStatuses(db);
  console.log('accountStatus snapshot (non-anonymous users):');
  console.log(
    `  active=${accountCounts.active}  deactivated=${accountCounts.deactivated}  pendingDeletion=${accountCounts.pendingDeletion}  missing(treated active)=${accountCounts.missingAccountStatus}  total=${accountCounts.nonAnonymous}`,
  );
  console.log(
    '  (accountStatus is independent — this script does NOT change it)\n',
  );

  const pendingDocs = await queryByApprovalStatus(db, 'pending');
  const rejectedDocs = INCLUDE_REJECTED
    ? await queryByApprovalStatus(db, 'rejected')
    : [];
  const missingDocs = INCLUDE_MISSING ? await queryMissingApproval(db) : [];

  let targets = [...pendingDocs, ...rejectedDocs, ...missingDocs];
  if (LIMIT != null) targets = targets.slice(0, LIMIT);

  console.log(
    `Candidates: pending=${pendingDocs.length}` +
      (INCLUDE_REJECTED ? ` rejected=${rejectedDocs.length}` : '') +
      (INCLUDE_MISSING ? ` missing=${missingDocs.length}` : '') +
      ` → applying to ${targets.length}\n`,
  );

  if (targets.length === 0) {
    console.log('Nothing to approve.');
    return;
  }

  for (const doc of targets) {
    const data = doc.data() || {};
    const approval = data.approvalStatus || '(missing)';
    console.log(
      `  ${DRY_RUN ? 'WOULD APPROVE' : 'APPROVE'} ${doc.id}  [${approval}]  role=${data.role ?? '?'}  account=${data.accountStatus ?? 'active'}  ${label(data)}`,
    );
  }

  if (DRY_RUN) {
    console.log(
      `\nDry-run complete. Re-run with --apply to approve ${targets.length} user(s).`,
    );
    return;
  }

  let updated = 0;
  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const chunk = targets.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const doc of chunk) {
      batch.update(doc.ref, {
        approvalStatus: 'approved',
        approvedBy,
        approvedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    updated += chunk.length;
    console.log(`Committed ${updated}/${targets.length}`);
  }

  console.log(
    `\nDone. Approved ${updated} user(s). Auto-join groups will sync via syncUserAutoJoinGroups.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { FieldValue } from "firebase-admin/firestore";
import { ALL_ROLES, parseRole, type UserRole } from "@pulse/shared";
import { db } from "./init";

const STATS_REF = () => db.doc("platformStats/overview");

type OverviewStats = {
  totalUsers: number;
  byRole: Record<string, number>;
  pending: number;
  deactivated: number;
  pendingDeletion: number;
  orgNodes: number;
};

const emptyStats = (): OverviewStats => ({
  totalUsers: 0,
  byRole: Object.fromEntries(ALL_ROLES.map((r) => [r, 0])),
  pending: 0,
  deactivated: 0,
  pendingDeletion: 0,
  orgNodes: 0,
});

async function readStats(): Promise<OverviewStats> {
  const snap = await STATS_REF().get();
  if (!snap.exists) return emptyStats();
  const data = snap.data() ?? {};
  const byRole: Record<string, number> = {};
  for (const role of ALL_ROLES) {
    const n = Number(
      data.byRole && typeof data.byRole === "object"
        ? (data.byRole as Record<string, unknown>)[role]
        : 0,
    );
    byRole[role] = Number.isFinite(n) ? n : 0;
  }
  return {
    totalUsers: Number(data.totalUsers ?? 0) || 0,
    byRole,
    pending: Number(data.pending ?? 0) || 0,
    deactivated: Number(data.deactivated ?? 0) || 0,
    pendingDeletion: Number(data.pendingDeletion ?? 0) || 0,
    orgNodes: Number(data.orgNodes ?? 0) || 0,
  };
}

async function writeStats(stats: OverviewStats): Promise<void> {
  await STATS_REF().set(
    {
      ...stats,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function bumpUserCreated(role: UserRole, pending: boolean) {
  const stats = await readStats();
  stats.totalUsers += 1;
  stats.byRole[role] = (stats.byRole[role] ?? 0) + 1;
  if (pending) stats.pending += 1;
  await writeStats(stats);
}

export async function bumpUserRoleChange(
  fromRole: UserRole,
  toRole: UserRole,
) {
  if (fromRole === toRole) return;
  const stats = await readStats();
  stats.byRole[fromRole] = Math.max(0, (stats.byRole[fromRole] ?? 0) - 1);
  stats.byRole[toRole] = (stats.byRole[toRole] ?? 0) + 1;
  await writeStats(stats);
}

export async function bumpApprovalChange(
  from: string | undefined,
  to: "approved" | "rejected" | "pending",
) {
  const stats = await readStats();
  if (from === "pending") stats.pending = Math.max(0, stats.pending - 1);
  if (to === "pending") stats.pending += 1;
  await writeStats(stats);
}

export async function bumpAccountStatusChange(
  from: string | undefined,
  to: string,
) {
  const prev = from ?? "active";
  const stats = await readStats();
  if (prev === "deactivated") {
    stats.deactivated = Math.max(0, stats.deactivated - 1);
  }
  if (prev === "pendingDeletion") {
    stats.pendingDeletion = Math.max(0, stats.pendingDeletion - 1);
  }
  if (to === "deactivated") stats.deactivated += 1;
  if (to === "pendingDeletion") stats.pendingDeletion += 1;
  await writeStats(stats);
}

export async function bumpOrgNodeCreated() {
  const stats = await readStats();
  stats.orgNodes += 1;
  await writeStats(stats);
}

export async function getOverviewStats(): Promise<OverviewStats> {
  return readStats();
}

export function parseStoredRole(value: unknown): UserRole {
  return parseRole(value);
}

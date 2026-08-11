import type { DocumentData } from "firebase-admin/firestore";
import {
  ORG_OWNER_UIDS_CAP,
  type OrgNodeType,
} from "@pulse/shared";

/** Pure helper: ancestor path + new node id (root-first). */
export function buildOrgNodePath(
  parentPath: string[],
  newId: string,
): string[] {
  return [...parentPath, newId];
}

function stringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function stringArray(value: unknown, cap: number): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(value.map(String).map((s) => s.trim()).filter(Boolean)),
  ].slice(0, cap);
}

export function serializeOrgNode(id: string, data: DocumentData) {
  return {
    id,
    name: String(data.name ?? ""),
    type: data.type as OrgNodeType,
    depth: Number(data.depth),
    parentId:
      typeof data.parentId === "string"
        ? data.parentId
        : data.parentId === null
          ? null
          : null,
    path: Array.isArray(data.path) ? data.path.map(String) : [],
    managerUids: stringArray(data.managerUids, 50),
    ownerUids: stringArray(data.ownerUids, ORG_OWNER_UIDS_CAP),
    logoUrl: stringOrNull(data.logoUrl),
    email: stringOrNull(data.email),
    paymentsEmail: stringOrNull(data.paymentsEmail),
    npn: stringOrNull(data.npn),
    agencyLicense: stringOrNull(data.agencyLicense),
    ein: stringOrNull(data.ein),
    active: data.active !== false,
  };
}

import type { DocumentData } from "firebase-admin/firestore";
import type { OrgNodeType } from "@pulse/shared";

/** Pure helper: ancestor path + new node id (root-first). */
export function buildOrgNodePath(
  parentPath: string[],
  newId: string,
): string[] {
  return [...parentPath, newId];
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
    managerUids: Array.isArray(data.managerUids)
      ? data.managerUids.map(String)
      : [],
    active: data.active !== false,
  };
}

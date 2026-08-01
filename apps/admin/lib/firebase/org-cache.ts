import type { AdminOrgNode } from "../types";
import { listOrgSubtree as listOrgSubtreeRemote } from "./functions";

const TTL_MS = 60_000;

let cachedRoot: { at: number; nodes: AdminOrgNode[] } | null = null;
const cachedByParent = new Map<string, { at: number; nodes: AdminOrgNode[] }>();

/** Cached org tree reads to avoid refetching on every Admin page mount. */
export async function listOrgSubtreeCached(
  parentId?: string | null,
  options?: { force?: boolean },
): Promise<AdminOrgNode[]> {
  const key = parentId ?? null;
  const now = Date.now();
  if (!options?.force) {
    if (key == null && cachedRoot && now - cachedRoot.at < TTL_MS) {
      return cachedRoot.nodes;
    }
    if (key != null) {
      const hit = cachedByParent.get(key);
      if (hit && now - hit.at < TTL_MS) return hit.nodes;
    }
  }

  const nodes = await listOrgSubtreeRemote(parentId);
  if (key == null) {
    cachedRoot = { at: now, nodes };
  } else {
    cachedByParent.set(key, { at: now, nodes });
  }
  return nodes;
}

export function invalidateOrgSubtreeCache() {
  cachedRoot = null;
  cachedByParent.clear();
}

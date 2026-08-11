/**
 * Organizational hierarchy for Pulse Admin (FMO/IMO style, 7 levels).
 * Users attach to a node via `orgNodeId`; they are not nodes themselves.
 */

export const ORG_NODE_TYPES = [
  "organization",
  "division",
  "region",
  "agency",
  "sub_agency",
  "team",
  "unit",
] as const;

export type OrgNodeType = (typeof ORG_NODE_TYPES)[number];

export type OrgDepth = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const ORG_TYPE_DEPTH: Record<OrgNodeType, OrgDepth> = {
  organization: 1,
  division: 2,
  region: 3,
  agency: 4,
  sub_agency: 5,
  team: 6,
  unit: 7,
};

export const ORG_DEPTH_TYPE: Record<OrgDepth, OrgNodeType> = {
  1: "organization",
  2: "division",
  3: "region",
  4: "agency",
  5: "sub_agency",
  6: "team",
  7: "unit",
};

export const DEFAULT_ORG_ROOT_NAME = "Every Benefits";

/**
 * Org node types a user/agent may be attached to via `orgNodeId`.
 * The matrix (`organization`, e.g. Every Benefits) is itself an assignable
 * agency — not only leaf `agency` / `sub_agency` nodes.
 */
export const USER_ASSIGNABLE_ORG_TYPES = [
  "organization",
  "agency",
  "sub_agency",
] as const;

export type UserAssignableOrgType = (typeof USER_ASSIGNABLE_ORG_TYPES)[number];

export function isUserAssignableOrgType(
  type: unknown,
): type is UserAssignableOrgType {
  return (
    typeof type === "string" &&
    (USER_ASSIGNABLE_ORG_TYPES as readonly string[]).includes(type)
  );
}

export function parseOrgNodeType(value: unknown): OrgNodeType | null {
  if (typeof value !== "string") return null;
  return (ORG_NODE_TYPES as readonly string[]).includes(value)
    ? (value as OrgNodeType)
    : null;
}

export function depthForType(type: OrgNodeType): OrgDepth {
  return ORG_TYPE_DEPTH[type];
}

export function typeForDepth(depth: number): OrgNodeType | null {
  if (depth < 1 || depth > 7) return null;
  return ORG_DEPTH_TYPE[depth as OrgDepth];
}

/** Child type must be exactly parent depth + 1. */
export function isValidChildType(
  parentType: OrgNodeType,
  childType: OrgNodeType,
): boolean {
  return ORG_TYPE_DEPTH[childType] === ORG_TYPE_DEPTH[parentType] + 1;
}

export type OrgNode = {
  id: string;
  name: string;
  type: OrgNodeType;
  depth: OrgDepth;
  parentId: string | null;
  /** Ancestor ids + self, root-first. Used for subtree queries. */
  path: string[];
  managerUids: string[];
  active: boolean;
};

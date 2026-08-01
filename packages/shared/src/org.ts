/**
 * Organizational hierarchy for Pulse Admin.
 * Users attach to a node via `orgNodeId`; they are not nodes themselves.
 *
 * Live levels: organization → agency → sub_agency
 * (Division / region / team / unit are legacy; repair deactivates them.)
 */

export const ORG_NODE_TYPES = [
  "organization",
  "agency",
  "sub_agency",
] as const;

export type OrgNodeType = (typeof ORG_NODE_TYPES)[number];

/** Legacy types kept only so older Firestore docs still parse for repair/migration. */
export const LEGACY_ORG_NODE_TYPES = [
  "division",
  "region",
  "team",
  "unit",
] as const;
export type LegacyOrgNodeType = (typeof LEGACY_ORG_NODE_TYPES)[number];
export type AnyOrgNodeType = OrgNodeType | LegacyOrgNodeType;

export type OrgDepth = 1 | 2 | 3;

export const ORG_TYPE_DEPTH: Record<OrgNodeType, OrgDepth> = {
  organization: 1,
  agency: 2,
  sub_agency: 3,
};

export const ORG_DEPTH_TYPE: Record<OrgDepth, OrgNodeType> = {
  1: "organization",
  2: "agency",
  3: "sub_agency",
};

export const DEFAULT_ORG_ROOT_NAME = "Every Benefits";

export function parseOrgNodeType(value: unknown): OrgNodeType | null {
  if (typeof value !== "string") return null;
  return (ORG_NODE_TYPES as readonly string[]).includes(value)
    ? (value as OrgNodeType)
    : null;
}

export function parseAnyOrgNodeType(value: unknown): AnyOrgNodeType | null {
  if (typeof value !== "string") return null;
  if ((ORG_NODE_TYPES as readonly string[]).includes(value)) {
    return value as OrgNodeType;
  }
  if ((LEGACY_ORG_NODE_TYPES as readonly string[]).includes(value)) {
    return value as LegacyOrgNodeType;
  }
  return null;
}

export function depthForType(type: OrgNodeType): OrgDepth {
  return ORG_TYPE_DEPTH[type];
}

export function typeForDepth(depth: number): OrgNodeType | null {
  if (depth < 1 || depth > 3) return null;
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

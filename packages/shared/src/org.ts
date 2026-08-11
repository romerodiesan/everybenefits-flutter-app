/**
 * Organizational hierarchy for Pulse Admin (FMO/IMO style).
 * Users attach to a node via `orgNodeId`; they are not nodes themselves.
 *
 * Product rule: there is no separate "sub_agency" product type for new nodes.
 * A downline agency is simply `type: "agency"` under another agency (or the
 * matrix). Legacy `sub_agency` docs are still readable / migratable.
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
 * agency. Legacy `sub_agency` remains readable as assignable.
 */
export const USER_ASSIGNABLE_ORG_TYPES = ["organization", "agency"] as const;

export type UserAssignableOrgType = (typeof USER_ASSIGNABLE_ORG_TYPES)[number];

export function isUserAssignableOrgType(
  type: unknown,
): type is UserAssignableOrgType | "sub_agency" {
  return (
    type === "organization" ||
    type === "agency" ||
    type === "sub_agency" /* legacy */
  );
}

/** Cap for agency owner UID lists. */
export const ORG_OWNER_UIDS_CAP = 20;

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

/**
 * Child type rules.
 * - New `sub_agency` nodes are not creatable.
 * - `agency` may sit under organization / division / region / agency
 *   (downline agencies are still type `agency`).
 * - Other types keep the classic depth+1 rule.
 */
export function isValidChildType(
  parentType: OrgNodeType,
  childType: OrgNodeType,
): boolean {
  if (childType === "sub_agency") return false;
  if (childType === "agency") {
    return (
      parentType === "organization" ||
      parentType === "division" ||
      parentType === "region" ||
      parentType === "agency"
    );
  }
  return ORG_TYPE_DEPTH[childType] === ORG_TYPE_DEPTH[parentType] + 1;
}

const EMAIL_LIKE =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const EIN_DIGITS = /^\d{9}$/;

export type EinIssue = "empty" | "invalid";

/** Normalize EIN to XX-XXXXXXX or null when empty. */
export function validateEin(
  raw: string | null | undefined,
): { ok: true; value: string | null } | { ok: false; issue: EinIssue } {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return { ok: true, value: null };
  const digits = trimmed.replace(/\D/g, "");
  if (!EIN_DIGITS.test(digits)) return { ok: false, issue: "invalid" };
  return { ok: true, value: `${digits.slice(0, 2)}-${digits.slice(2)}` };
}

export function validateOptionalEmail(
  raw: string | null | undefined,
): { ok: true; value: string | null } | { ok: false; issue: "invalid" } {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return { ok: true, value: null };
  if (!EMAIL_LIKE.test(trimmed) || trimmed.length > 200) {
    return { ok: false, issue: "invalid" };
  }
  return { ok: true, value: trimmed.toLowerCase() };
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
  /** Agency owners — synced to role `agency_owner` on save. */
  ownerUids: string[];
  logoUrl: string | null;
  email: string | null;
  paymentsEmail: string | null;
  npn: string | null;
  agencyLicense: string | null;
  ein: string | null;
  active: boolean;
};

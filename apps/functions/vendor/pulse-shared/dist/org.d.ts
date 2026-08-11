/**
 * Organizational hierarchy for Pulse Admin (FMO/IMO style).
 * Users attach to a node via `orgNodeId`; they are not nodes themselves.
 *
 * Product rule: there is no separate "sub_agency" product type for new nodes.
 * A downline agency is simply `type: "agency"` under another agency (or the
 * matrix). Legacy `sub_agency` docs are still readable / migratable.
 */
export declare const ORG_NODE_TYPES: readonly ["organization", "division", "region", "agency", "sub_agency", "team", "unit"];
export type OrgNodeType = (typeof ORG_NODE_TYPES)[number];
export type OrgDepth = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export declare const ORG_TYPE_DEPTH: Record<OrgNodeType, OrgDepth>;
export declare const ORG_DEPTH_TYPE: Record<OrgDepth, OrgNodeType>;
export declare const DEFAULT_ORG_ROOT_NAME = "Every Benefits";
/**
 * Org node types a user/agent may be attached to via `orgNodeId`.
 * The matrix (`organization`, e.g. Every Benefits) is itself an assignable
 * agency. Legacy `sub_agency` remains readable as assignable.
 */
export declare const USER_ASSIGNABLE_ORG_TYPES: readonly ["organization", "agency"];
export type UserAssignableOrgType = (typeof USER_ASSIGNABLE_ORG_TYPES)[number];
export declare function isUserAssignableOrgType(type: unknown): type is UserAssignableOrgType | "sub_agency";
/** Cap for agency owner UID lists. */
export declare const ORG_OWNER_UIDS_CAP = 20;
export declare function parseOrgNodeType(value: unknown): OrgNodeType | null;
export declare function depthForType(type: OrgNodeType): OrgDepth;
export declare function typeForDepth(depth: number): OrgNodeType | null;
/**
 * Child type rules.
 * - New `sub_agency` nodes are not creatable.
 * - `agency` may sit under organization / division / region / agency
 *   (downline agencies are still type `agency`).
 * - Other types keep the classic depth+1 rule.
 */
export declare function isValidChildType(parentType: OrgNodeType, childType: OrgNodeType): boolean;
export type EinIssue = "empty" | "invalid";
/** Normalize EIN to XX-XXXXXXX or null when empty. */
export declare function validateEin(raw: string | null | undefined): {
    ok: true;
    value: string | null;
} | {
    ok: false;
    issue: EinIssue;
};
export declare function validateOptionalEmail(raw: string | null | undefined): {
    ok: true;
    value: string | null;
} | {
    ok: false;
    issue: "invalid";
};
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
//# sourceMappingURL=org.d.ts.map
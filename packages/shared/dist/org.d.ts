/**
 * Organizational hierarchy for Pulse Admin (FMO/IMO style, 7 levels).
 * Users attach to a node via `orgNodeId`; they are not nodes themselves.
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
 * agency — not only leaf `agency` / `sub_agency` nodes.
 */
export declare const USER_ASSIGNABLE_ORG_TYPES: readonly ["organization", "agency", "sub_agency"];
export type UserAssignableOrgType = (typeof USER_ASSIGNABLE_ORG_TYPES)[number];
export declare function isUserAssignableOrgType(type: unknown): type is UserAssignableOrgType;
export declare function parseOrgNodeType(value: unknown): OrgNodeType | null;
export declare function depthForType(type: OrgNodeType): OrgDepth;
export declare function typeForDepth(depth: number): OrgNodeType | null;
/** Child type must be exactly parent depth + 1. */
export declare function isValidChildType(parentType: OrgNodeType, childType: OrgNodeType): boolean;
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
//# sourceMappingURL=org.d.ts.map
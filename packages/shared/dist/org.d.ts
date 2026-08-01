/**
 * Organizational hierarchy for Pulse Admin.
 * Users attach to a node via `orgNodeId`; they are not nodes themselves.
 *
 * Live levels: organization → agency → sub_agency
 * (Division / region / team / unit are legacy; repair deactivates them.)
 */
export declare const ORG_NODE_TYPES: readonly ["organization", "agency", "sub_agency"];
export type OrgNodeType = (typeof ORG_NODE_TYPES)[number];
/** Legacy types kept only so older Firestore docs still parse for repair/migration. */
export declare const LEGACY_ORG_NODE_TYPES: readonly ["division", "region", "team", "unit"];
export type LegacyOrgNodeType = (typeof LEGACY_ORG_NODE_TYPES)[number];
export type AnyOrgNodeType = OrgNodeType | LegacyOrgNodeType;
export type OrgDepth = 1 | 2 | 3;
export declare const ORG_TYPE_DEPTH: Record<OrgNodeType, OrgDepth>;
export declare const ORG_DEPTH_TYPE: Record<OrgDepth, OrgNodeType>;
export declare const DEFAULT_ORG_ROOT_NAME = "Every Benefits";
export declare function parseOrgNodeType(value: unknown): OrgNodeType | null;
export declare function parseAnyOrgNodeType(value: unknown): AnyOrgNodeType | null;
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

"use strict";
/**
 * Organizational hierarchy for Pulse Admin (FMO/IMO style).
 * Users attach to a node via `orgNodeId`; they are not nodes themselves.
 *
 * Product rule: there is no separate "sub_agency" product type for new nodes.
 * A downline agency is simply `type: "agency"` under another agency (or the
 * matrix). Legacy `sub_agency` docs are still readable / migratable.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ORG_OWNER_UIDS_CAP = exports.USER_ASSIGNABLE_ORG_TYPES = exports.DEFAULT_ORG_ROOT_NAME = exports.ORG_DEPTH_TYPE = exports.ORG_TYPE_DEPTH = exports.ORG_NODE_TYPES = void 0;
exports.isUserAssignableOrgType = isUserAssignableOrgType;
exports.parseOrgNodeType = parseOrgNodeType;
exports.depthForType = depthForType;
exports.typeForDepth = typeForDepth;
exports.isValidChildType = isValidChildType;
exports.validateEin = validateEin;
exports.validateOptionalEmail = validateOptionalEmail;
exports.ORG_NODE_TYPES = [
    "organization",
    "division",
    "region",
    "agency",
    "sub_agency",
    "team",
    "unit",
];
exports.ORG_TYPE_DEPTH = {
    organization: 1,
    division: 2,
    region: 3,
    agency: 4,
    sub_agency: 5,
    team: 6,
    unit: 7,
};
exports.ORG_DEPTH_TYPE = {
    1: "organization",
    2: "division",
    3: "region",
    4: "agency",
    5: "sub_agency",
    6: "team",
    7: "unit",
};
exports.DEFAULT_ORG_ROOT_NAME = "Every Benefits";
/**
 * Org node types a user/agent may be attached to via `orgNodeId`.
 * The matrix (`organization`, e.g. Every Benefits) is itself an assignable
 * agency. Legacy `sub_agency` remains readable as assignable.
 */
exports.USER_ASSIGNABLE_ORG_TYPES = ["organization", "agency"];
function isUserAssignableOrgType(type) {
    return (type === "organization" ||
        type === "agency" ||
        type === "sub_agency" /* legacy */);
}
/** Cap for agency owner UID lists. */
exports.ORG_OWNER_UIDS_CAP = 20;
function parseOrgNodeType(value) {
    if (typeof value !== "string")
        return null;
    return exports.ORG_NODE_TYPES.includes(value)
        ? value
        : null;
}
function depthForType(type) {
    return exports.ORG_TYPE_DEPTH[type];
}
function typeForDepth(depth) {
    if (depth < 1 || depth > 7)
        return null;
    return exports.ORG_DEPTH_TYPE[depth];
}
/**
 * Child type rules.
 * - New `sub_agency` nodes are not creatable.
 * - `agency` may sit under organization / division / region / agency
 *   (downline agencies are still type `agency`).
 * - Other types keep the classic depth+1 rule.
 */
function isValidChildType(parentType, childType) {
    if (childType === "sub_agency")
        return false;
    if (childType === "agency") {
        return (parentType === "organization" ||
            parentType === "division" ||
            parentType === "region" ||
            parentType === "agency");
    }
    return exports.ORG_TYPE_DEPTH[childType] === exports.ORG_TYPE_DEPTH[parentType] + 1;
}
const EMAIL_LIKE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const EIN_DIGITS = /^\d{9}$/;
/** Normalize EIN to XX-XXXXXXX or null when empty. */
function validateEin(raw) {
    const trimmed = String(raw ?? "").trim();
    if (!trimmed)
        return { ok: true, value: null };
    const digits = trimmed.replace(/\D/g, "");
    if (!EIN_DIGITS.test(digits))
        return { ok: false, issue: "invalid" };
    return { ok: true, value: `${digits.slice(0, 2)}-${digits.slice(2)}` };
}
function validateOptionalEmail(raw) {
    const trimmed = String(raw ?? "").trim();
    if (!trimmed)
        return { ok: true, value: null };
    if (!EMAIL_LIKE.test(trimmed) || trimmed.length > 200) {
        return { ok: false, issue: "invalid" };
    }
    return { ok: true, value: trimmed.toLowerCase() };
}

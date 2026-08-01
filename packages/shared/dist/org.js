"use strict";
/**
 * Organizational hierarchy for Pulse Admin.
 * Users attach to a node via `orgNodeId`; they are not nodes themselves.
 *
 * Live levels: organization → agency → sub_agency
 * (Division / region / team / unit are legacy; repair deactivates them.)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ORG_ROOT_NAME = exports.ORG_DEPTH_TYPE = exports.ORG_TYPE_DEPTH = exports.LEGACY_ORG_NODE_TYPES = exports.ORG_NODE_TYPES = void 0;
exports.parseOrgNodeType = parseOrgNodeType;
exports.parseAnyOrgNodeType = parseAnyOrgNodeType;
exports.depthForType = depthForType;
exports.typeForDepth = typeForDepth;
exports.isValidChildType = isValidChildType;
exports.ORG_NODE_TYPES = [
    "organization",
    "agency",
    "sub_agency",
];
/** Legacy types kept only so older Firestore docs still parse for repair/migration. */
exports.LEGACY_ORG_NODE_TYPES = [
    "division",
    "region",
    "team",
    "unit",
];
exports.ORG_TYPE_DEPTH = {
    organization: 1,
    agency: 2,
    sub_agency: 3,
};
exports.ORG_DEPTH_TYPE = {
    1: "organization",
    2: "agency",
    3: "sub_agency",
};
exports.DEFAULT_ORG_ROOT_NAME = "Every Benefits";
function parseOrgNodeType(value) {
    if (typeof value !== "string")
        return null;
    return exports.ORG_NODE_TYPES.includes(value)
        ? value
        : null;
}
function parseAnyOrgNodeType(value) {
    if (typeof value !== "string")
        return null;
    if (exports.ORG_NODE_TYPES.includes(value)) {
        return value;
    }
    if (exports.LEGACY_ORG_NODE_TYPES.includes(value)) {
        return value;
    }
    return null;
}
function depthForType(type) {
    return exports.ORG_TYPE_DEPTH[type];
}
function typeForDepth(depth) {
    if (depth < 1 || depth > 3)
        return null;
    return exports.ORG_DEPTH_TYPE[depth];
}
/** Child type must be exactly parent depth + 1. */
function isValidChildType(parentType, childType) {
    return exports.ORG_TYPE_DEPTH[childType] === exports.ORG_TYPE_DEPTH[parentType] + 1;
}

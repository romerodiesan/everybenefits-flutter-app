"use strict";
/**
 * Organizational hierarchy for Pulse Admin (FMO/IMO style, 7 levels).
 * Users attach to a node via `orgNodeId`; they are not nodes themselves.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ORG_ROOT_NAME = exports.ORG_DEPTH_TYPE = exports.ORG_TYPE_DEPTH = exports.ORG_NODE_TYPES = void 0;
exports.parseOrgNodeType = parseOrgNodeType;
exports.depthForType = depthForType;
exports.typeForDepth = typeForDepth;
exports.isValidChildType = isValidChildType;
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
/** Child type must be exactly parent depth + 1. */
function isValidChildType(parentType, childType) {
    return exports.ORG_TYPE_DEPTH[childType] === exports.ORG_TYPE_DEPTH[parentType] + 1;
}

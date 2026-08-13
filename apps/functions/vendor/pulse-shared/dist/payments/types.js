"use strict";
/**
 * Override Management domain — distribution participants and economics.
 * Independent of Pulse Admin `orgNodes` (ops tree).
 *
 * Participants are only agencies and agents. A "sub-agency" is an agency
 * that is downline of another agency via a business relationship.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAN_SLOT_ROLES = exports.PAY_MODES = exports.COMPENSATION_TIER_KINDS = exports.RELATIONSHIP_SOURCES = exports.OVERRIDE_RUN_STATUSES = exports.STATEMENT_SOURCES = exports.CARRIER_MARKETS = exports.CARRIER_RATE_UNITS = exports.RATE_UNITS = exports.RELATIONSHIP_TYPES = exports.PARTICIPANT_TYPES = void 0;
exports.normalizeParticipantType = normalizeParticipantType;
exports.deriveRelationshipType = deriveRelationshipType;
exports.wouldCreateRelationshipCycle = wouldCreateRelationshipCycle;
exports.PARTICIPANT_TYPES = ["agency", "agent"];
/** Derived from upline.type + downline.type — not chosen freely in UI. */
exports.RELATIONSHIP_TYPES = [
    "agency_agency",
    "agency_agent",
    "agent_agent",
];
exports.RATE_UNITS = ["pmpm", "flat", "percent"];
/** Units allowed on carrier state intake (commission / override). */
exports.CARRIER_RATE_UNITS = ["pmpm", "flat", "percent"];
exports.CARRIER_MARKETS = ["aca", "medicare", "life"];
exports.STATEMENT_SOURCES = ["carrier", "fmo", "manual"];
exports.OVERRIDE_RUN_STATUSES = [
    "pending",
    "running",
    "completed",
    "failed",
];
/** How a business relationship was created. */
exports.RELATIONSHIP_SOURCES = ["manual", "org_hierarchy"];
/** Named PMPM **override** level templates (not commission; not volume thresholds). */
exports.COMPENSATION_TIER_KINDS = ["agency", "agent", "generic"];
/** Remittance routing — does not change override spread math. */
exports.PAY_MODES = ["direct", "through_agency"];
exports.PLAN_SLOT_ROLES = [
    "agency_root",
    "agency_child",
    "agent_default",
    "agent_group",
    "agent_override",
];
/** Map legacy participant type strings onto the current enum. */
function normalizeParticipantType(value) {
    if (value === "agency" || value === "agent")
        return value;
    if (value === "sub_agency")
        return "agency";
    return null;
}
/**
 * Derive relationship type from participant types.
 * Returns null if the pair is invalid (e.g. agent → agency).
 */
function deriveRelationshipType(uplineType, downlineType) {
    if (uplineType === "agency" && downlineType === "agency") {
        return "agency_agency";
    }
    if (uplineType === "agency" && downlineType === "agent") {
        return "agency_agent";
    }
    if (uplineType === "agent" && downlineType === "agent") {
        return "agent_agent";
    }
    return null;
}
/**
 * True if adding upline→downline would create a cycle
 * (downline is already an ancestor of upline).
 */
function wouldCreateRelationshipCycle(uplineId, downlineId, relationships) {
    if (uplineId === downlineId)
        return true;
    // Walk upline from the proposed upline; if we hit downline, cycle.
    let current = uplineId;
    const visited = new Set();
    for (let i = 0; i < 64; i++) {
        if (visited.has(current))
            return true;
        visited.add(current);
        const edge = relationships.find((r) => r.active !== false && r.downlineParticipantId === current);
        if (!edge)
            return false;
        if (edge.uplineParticipantId === downlineId)
            return true;
        current = edge.uplineParticipantId;
    }
    return true;
}

"use strict";
/**
 * Commission module domain types (ADR-008).
 * Identity = Pulse orgNodes + users (PartyRef). No paymentsParticipants sync.
 * Streams: commission + override (both first-class).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMMISSION_ISSUE_SEVERITIES = exports.COMMISSION_TRANSACTION_TYPES = exports.COMMISSION_STREAMS = void 0;
exports.emptyCommissionRunTotals = emptyCommissionRunTotals;
exports.partyRefKey = partyRefKey;
exports.COMMISSION_STREAMS = ["commission", "override"];
exports.COMMISSION_TRANSACTION_TYPES = [
    "COMMISSION",
    "OVERRIDE",
    "BONUS",
    "ADJUSTMENT",
    "CHARGEBACK",
    "RETROACTIVE",
    "OTHER",
];
exports.COMMISSION_ISSUE_SEVERITIES = [
    "INFO",
    "WARNING",
    "ERROR",
    "BLOCKING",
];
function emptyCommissionRunTotals() {
    return {
        receivedCents: 0,
        expectedCents: 0,
        varianceCents: 0,
        downstreamCents: 0,
        retainedCents: 0,
        payableAgenciesCents: 0,
        payableAgentsCents: 0,
        commissionCents: 0,
        overrideCents: 0,
    };
}
function partyRefKey(ref) {
    return ref.kind === "agency"
        ? `agency:${ref.orgNodeId}`
        : `agent:${ref.userId}`;
}

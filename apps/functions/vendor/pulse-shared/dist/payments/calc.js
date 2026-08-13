"use strict";
/**
 * Pure override distribution engine.
 *
 * Rule: each upline earns (their contract level − downline level) × member months,
 * subject to optional retention on the relationship edge.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRelationshipActive = isRelationshipActive;
exports.resolveContractRate = resolveContractRate;
exports.resolveCarrierStateRate = resolveCarrierStateRate;
exports.buildUplineChain = buildUplineChain;
exports.allocateLineOverrides = allocateLineOverrides;
exports.roundMoney = roundMoney;
exports.reconcileLine = reconcileLine;
exports.runOverrideCalculation = runOverrideCalculation;
function inDateRange(from, to, asOf) {
    if (asOf < from)
        return false;
    if (to && asOf > to)
        return false;
    return true;
}
function scopeMatches(scopes, scope) {
    if (scopes.carrierIds.length > 0 &&
        scope.carrierId &&
        !scopes.carrierIds.includes(scope.carrierId)) {
        return false;
    }
    if (scopes.states.length > 0 &&
        scope.state &&
        !scopes.states.includes(scope.state)) {
        return false;
    }
    if (scopes.productCodes.length > 0 &&
        scope.productCode &&
        !scopes.productCodes.includes(scope.productCode)) {
        return false;
    }
    return true;
}
function isRelationshipActive(rel, scope) {
    if (!rel.active)
        return false;
    if (!inDateRange(rel.effectiveFrom, rel.effectiveTo, scope.asOf)) {
        return false;
    }
    return scopeMatches(rel, scope);
}
function resolveContractRate(terms, participantId, scope) {
    const candidates = terms.filter((term) => {
        if (!term.active || term.participantId !== participantId)
            return false;
        if (!inDateRange(term.effectiveFrom, term.effectiveTo, scope.asOf)) {
            return false;
        }
        if (term.rateUnit !== "pmpm")
            return false;
        if (term.carrierId &&
            scope.carrierId &&
            term.carrierId !== scope.carrierId) {
            return false;
        }
        return scopeMatches({
            carrierIds: term.carrierId ? [term.carrierId] : [],
            states: term.states,
            productCodes: term.productCodes,
        }, scope);
    });
    if (candidates.length === 0)
        return null;
    // Prefer most specific (has carrierId), then latest effectiveFrom.
    candidates.sort((a, b) => {
        const spec = Number(Boolean(b.carrierId)) - Number(Boolean(a.carrierId));
        if (spec !== 0)
            return spec;
        return b.effectiveFrom.localeCompare(a.effectiveFrom);
    });
    return candidates[0].rate;
}
/**
 * Resolve carrier override intake for a state from carrierStateRates.
 * Uses overrideRate when unit is pmpm or flat (dollar amount for the override
 * stack; both multiply by member months in allocateLineOverrides).
 * Percent is catalog-only for the calc engine in v1.
 */
function resolveCarrierStateRate(rates, carrierId, state, _asOf) {
    if (!carrierId || !state)
        return null;
    const stateCode = state.trim().toUpperCase();
    const candidates = rates.filter((r) => {
        if (!r.active || r.carrierId !== carrierId)
            return false;
        if (r.state.toUpperCase() !== stateCode)
            return false;
        return (r.overrideRateUnit === "pmpm" || r.overrideRateUnit === "flat");
    });
    if (candidates.length === 0)
        return null;
    // Prefer pmpm when multiple active rows somehow match.
    candidates.sort((a, b) => {
        const rank = (u) => (u === "pmpm" ? 0 : 1);
        return rank(a.overrideRateUnit) - rank(b.overrideRateUnit);
    });
    return candidates[0].overrideRate;
}
/**
 * Walk upline from writing producer using relationships where
 * downlineParticipantId === current.
 */
function buildUplineChain(writingProducerId, relationships, scope, maxDepth = 32) {
    const chain = [];
    let current = writingProducerId;
    const visited = new Set([current]);
    for (let i = 0; i < maxDepth; i++) {
        const edge = relationships.find((rel) => rel.downlineParticipantId === current &&
            isRelationshipActive(rel, scope));
        if (!edge)
            break;
        if (visited.has(edge.uplineParticipantId))
            break;
        chain.push(edge);
        visited.add(edge.uplineParticipantId);
        current = edge.uplineParticipantId;
    }
    return chain;
}
function allocateLineOverrides(args) {
    const producerId = args.line.writingProducerParticipantId;
    if (!producerId)
        return [];
    const asOf = args.line.productionDate ??
        new Date().toISOString().slice(0, 10);
    const scope = {
        carrierId: args.line.carrierId,
        state: args.line.state,
        productCode: args.line.productCode,
        asOf,
    };
    const writingLevel = resolveContractRate(args.terms, producerId, scope);
    if (writingLevel == null)
        return [];
    const fromCatalog = resolveCarrierStateRate(args.carrierStateRates ?? [], args.line.carrierId, args.line.state, asOf);
    const carrierRate = args.line.carrierRate ??
        fromCatalog ??
        args.defaultCarrierRate ??
        null;
    if (carrierRate == null)
        return [];
    const chain = buildUplineChain(producerId, args.relationships, scope);
    if (chain.length === 0)
        return [];
    const mm = args.line.memberMonths;
    const out = [];
    let lowerLevel = writingLevel;
    for (const edge of chain) {
        const uplineLevel = resolveContractRate(args.terms, edge.uplineParticipantId, scope);
        if (uplineLevel == null)
            break;
        // Cap at carrier rate so we never allocate above available spread.
        const cappedUpline = Math.min(uplineLevel, carrierRate);
        const cappedLower = Math.min(lowerLevel, carrierRate);
        let rateDelta = cappedUpline - cappedLower;
        if (rateDelta < 0)
            rateDelta = 0;
        const retained = rateDelta * (edge.retentionFraction ?? 0);
        const payableDelta = rateDelta - retained;
        const amount = roundMoney(payableDelta * mm);
        if (amount !== 0 || rateDelta > 0) {
            out.push({
                statementLineId: args.line.id,
                participantId: edge.uplineParticipantId,
                amount,
                memberMonths: mm,
                rateDelta: payableDelta,
                uplineLevel: cappedUpline,
                downlineLevel: cappedLower,
                carrierRate,
                writingProducerLevel: writingLevel,
            });
        }
        lowerLevel = uplineLevel;
        if (lowerLevel >= carrierRate)
            break;
    }
    return out;
}
function roundMoney(n) {
    return Math.round(n * 100) / 100;
}
function reconcileLine(args) {
    const expectedTotal = roundMoney(args.allocations.reduce((sum, a) => sum + a.amount, 0));
    const received = roundMoney(args.receivedOverrideAmount);
    // Per-participant expected; received is attributed at line level only in v1.
    const items = args.allocations.map((a) => ({
        statementLineId: args.statementLineId,
        participantId: a.participantId,
        expectedAmount: roundMoney(a.amount),
        receivedAmount: 0,
        difference: roundMoney(a.amount),
    }));
    items.push({
        statementLineId: args.statementLineId,
        participantId: null,
        expectedAmount: expectedTotal,
        receivedAmount: received,
        difference: roundMoney(expectedTotal - received),
    });
    return items;
}
function runOverrideCalculation(args) {
    const allocations = [];
    const reconciliation = [];
    for (const line of args.lines) {
        const lineAllocs = allocateLineOverrides({
            line,
            relationships: args.relationships,
            terms: args.terms,
            defaultCarrierRate: args.defaultCarrierRate,
            carrierStateRates: args.carrierStateRates,
        });
        allocations.push(...lineAllocs);
        reconciliation.push(...reconcileLine({
            statementLineId: line.id,
            receivedOverrideAmount: line.receivedOverrideAmount,
            allocations: lineAllocs,
        }));
    }
    const expectedTotal = roundMoney(allocations.reduce((s, a) => s + a.amount, 0));
    const receivedTotal = roundMoney(args.lines.reduce((s, l) => s + l.receivedOverrideAmount, 0));
    return {
        allocations,
        reconciliation,
        expectedTotal,
        receivedTotal,
        differenceTotal: roundMoney(expectedTotal - receivedTotal),
    };
}

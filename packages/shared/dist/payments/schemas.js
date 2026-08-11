"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importStatementInputSchema = exports.statementImportLineSchema = exports.carrierStateRateInputSchema = exports.carrierInputSchema = exports.contractTermInputSchema = exports.businessRelationshipInputSchema = exports.paymentsParticipantInputSchema = exports.overrideRunSchema = exports.reconciliationItemSchema = exports.overrideAllocationSchema = exports.statementLineSchema = exports.statementSchema = exports.carrierStateRateSchema = exports.carrierSchema = exports.contractTermSchema = exports.businessRelationshipSchema = exports.paymentsParticipantSchema = exports.overrideRunStatusSchema = exports.statementSourceSchema = exports.carrierMarketSchema = exports.carrierRateUnitSchema = exports.rateUnitSchema = exports.relationshipTypeSchema = exports.participantTypeSchema = void 0;
const zod_1 = require("zod");
const types_1 = require("./types");
exports.participantTypeSchema = zod_1.z.enum(types_1.PARTICIPANT_TYPES);
exports.relationshipTypeSchema = zod_1.z.enum(types_1.RELATIONSHIP_TYPES);
exports.rateUnitSchema = zod_1.z.enum(types_1.RATE_UNITS);
exports.carrierRateUnitSchema = zod_1.z.enum(types_1.CARRIER_RATE_UNITS);
exports.carrierMarketSchema = zod_1.z.enum(types_1.CARRIER_MARKETS);
exports.statementSourceSchema = zod_1.z.enum(types_1.STATEMENT_SOURCES);
exports.overrideRunStatusSchema = zod_1.z.enum(types_1.OVERRIDE_RUN_STATUSES);
exports.paymentsParticipantSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    type: exports.participantTypeSchema,
    userId: zod_1.z.string().nullable(),
    npn: zod_1.z.string().nullable(),
    linkedOrgNodeId: zod_1.z.string().nullable(),
    active: zod_1.z.boolean(),
    createdAt: zod_1.z.string().optional(),
    updatedAt: zod_1.z.string().optional(),
});
exports.businessRelationshipSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    uplineParticipantId: zod_1.z.string().min(1),
    downlineParticipantId: zod_1.z.string().min(1),
    relationshipType: exports.relationshipTypeSchema,
    effectiveFrom: zod_1.z.string().min(1),
    effectiveTo: zod_1.z.string().nullable(),
    carrierIds: zod_1.z.array(zod_1.z.string()),
    states: zod_1.z.array(zod_1.z.string()),
    productCodes: zod_1.z.array(zod_1.z.string()),
    retentionFraction: zod_1.z.number().min(0).max(1).default(0),
    notes: zod_1.z.string().nullable(),
    active: zod_1.z.boolean(),
});
exports.contractTermSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    participantId: zod_1.z.string().min(1),
    carrierId: zod_1.z.string().nullable(),
    states: zod_1.z.array(zod_1.z.string()),
    productCodes: zod_1.z.array(zod_1.z.string()),
    rate: zod_1.z.number(),
    rateUnit: exports.rateUnitSchema,
    effectiveFrom: zod_1.z.string().min(1),
    effectiveTo: zod_1.z.string().nullable(),
    active: zod_1.z.boolean(),
});
exports.carrierSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    code: zod_1.z.string().min(1),
    market: exports.carrierMarketSchema,
    active: zod_1.z.boolean(),
});
exports.carrierStateRateSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    carrierId: zod_1.z.string().min(1),
    state: zod_1.z.string().min(2).max(2),
    commissionRate: zod_1.z.number(),
    commissionRateUnit: exports.carrierRateUnitSchema,
    overrideRate: zod_1.z.number(),
    overrideRateUnit: exports.carrierRateUnitSchema,
    active: zod_1.z.boolean(),
});
exports.statementSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    source: exports.statementSourceSchema,
    carrierId: zod_1.z.string().nullable(),
    fmoParticipantId: zod_1.z.string().nullable(),
    periodStart: zod_1.z.string().min(1),
    periodEnd: zod_1.z.string().min(1),
    label: zod_1.z.string().min(1),
    importedAt: zod_1.z.string().min(1),
    importedBy: zod_1.z.string().min(1),
    lineCount: zod_1.z.number().int().nonnegative(),
    status: zod_1.z.enum(["draft", "imported", "reconciled"]),
});
exports.statementLineSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    statementId: zod_1.z.string().min(1),
    writingProducerParticipantId: zod_1.z.string().nullable(),
    writingProducerNpn: zod_1.z.string().nullable(),
    writingProducerName: zod_1.z.string().nullable(),
    carrierId: zod_1.z.string().nullable(),
    state: zod_1.z.string().nullable(),
    productCode: zod_1.z.string().nullable(),
    memberMonths: zod_1.z.number().nonnegative(),
    receivedOverrideAmount: zod_1.z.number(),
    carrierRate: zod_1.z.number().nullable(),
    productionDate: zod_1.z.string().nullable(),
    externalRef: zod_1.z.string().nullable(),
});
exports.overrideAllocationSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    runId: zod_1.z.string().min(1),
    statementLineId: zod_1.z.string().min(1),
    participantId: zod_1.z.string().min(1),
    amount: zod_1.z.number(),
    memberMonths: zod_1.z.number(),
    rateDelta: zod_1.z.number(),
    uplineLevel: zod_1.z.number(),
    downlineLevel: zod_1.z.number(),
    carrierRate: zod_1.z.number(),
    writingProducerLevel: zod_1.z.number(),
});
exports.reconciliationItemSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    runId: zod_1.z.string().min(1),
    statementLineId: zod_1.z.string().min(1),
    participantId: zod_1.z.string().nullable(),
    expectedAmount: zod_1.z.number(),
    receivedAmount: zod_1.z.number(),
    difference: zod_1.z.number(),
});
exports.overrideRunSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    statementId: zod_1.z.string().min(1),
    status: exports.overrideRunStatusSchema,
    startedAt: zod_1.z.string().min(1),
    completedAt: zod_1.z.string().nullable(),
    error: zod_1.z.string().nullable(),
    allocationCount: zod_1.z.number().int().nonnegative(),
    expectedTotal: zod_1.z.number(),
    receivedTotal: zod_1.z.number(),
    differenceTotal: zod_1.z.number(),
    createdBy: zod_1.z.string().min(1),
});
/** Input for creating/updating a participant (id optional on create). */
exports.paymentsParticipantInputSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    type: exports.participantTypeSchema,
    userId: zod_1.z.string().nullable().optional().default(null),
    npn: zod_1.z.string().nullable().optional().default(null),
    linkedOrgNodeId: zod_1.z.string().nullable().optional().default(null),
    active: zod_1.z.boolean().optional().default(true),
});
/** relationshipType is derived server-side; client may omit it. */
exports.businessRelationshipInputSchema = zod_1.z.object({
    uplineParticipantId: zod_1.z.string().min(1),
    downlineParticipantId: zod_1.z.string().min(1),
    relationshipType: exports.relationshipTypeSchema.optional(),
    effectiveFrom: zod_1.z.string().min(1),
    effectiveTo: zod_1.z.string().nullable().optional().default(null),
    carrierIds: zod_1.z.array(zod_1.z.string()).optional().default([]),
    states: zod_1.z.array(zod_1.z.string()).optional().default([]),
    productCodes: zod_1.z.array(zod_1.z.string()).optional().default([]),
    retentionFraction: zod_1.z.number().min(0).max(1).optional().default(0),
    notes: zod_1.z.string().nullable().optional().default(null),
    active: zod_1.z.boolean().optional().default(true),
});
exports.contractTermInputSchema = exports.contractTermSchema
    .omit({ id: true })
    .extend({
    carrierId: zod_1.z.string().nullable().optional().default(null),
    states: zod_1.z.array(zod_1.z.string()).optional().default([]),
    productCodes: zod_1.z.array(zod_1.z.string()).optional().default([]),
    rateUnit: exports.rateUnitSchema.optional().default("pmpm"),
    effectiveTo: zod_1.z.string().nullable().optional().default(null),
    active: zod_1.z.boolean().optional().default(true),
});
exports.carrierInputSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    code: zod_1.z.string().min(1),
    market: exports.carrierMarketSchema,
    active: zod_1.z.boolean().optional().default(true),
});
exports.carrierStateRateInputSchema = zod_1.z.object({
    carrierId: zod_1.z.string().min(1),
    state: zod_1.z
        .string()
        .trim()
        .transform((s) => s.toUpperCase())
        .pipe(zod_1.z.string().length(2)),
    commissionRate: zod_1.z.number(),
    commissionRateUnit: exports.carrierRateUnitSchema.optional().default("flat"),
    overrideRate: zod_1.z.number(),
    overrideRateUnit: exports.carrierRateUnitSchema.optional().default("flat"),
    active: zod_1.z.boolean().optional().default(true),
});
/** Normalized CSV/JSON line for statement import (v1). */
exports.statementImportLineSchema = zod_1.z.object({
    writingProducerParticipantId: zod_1.z.string().nullable().optional().default(null),
    writingProducerNpn: zod_1.z.string().nullable().optional().default(null),
    writingProducerName: zod_1.z.string().nullable().optional().default(null),
    carrierId: zod_1.z.string().nullable().optional().default(null),
    state: zod_1.z.string().nullable().optional().default(null),
    productCode: zod_1.z.string().nullable().optional().default(null),
    memberMonths: zod_1.z.number().nonnegative(),
    receivedOverrideAmount: zod_1.z.number().default(0),
    carrierRate: zod_1.z.number().nullable().optional().default(null),
    productionDate: zod_1.z.string().nullable().optional().default(null),
    externalRef: zod_1.z.string().nullable().optional().default(null),
});
exports.importStatementInputSchema = zod_1.z.object({
    source: exports.statementSourceSchema.default("manual"),
    carrierId: zod_1.z.string().nullable().optional().default(null),
    fmoParticipantId: zod_1.z.string().nullable().optional().default(null),
    periodStart: zod_1.z.string().min(1),
    periodEnd: zod_1.z.string().min(1),
    label: zod_1.z.string().min(1),
    lines: zod_1.z.array(exports.statementImportLineSchema).min(1),
});

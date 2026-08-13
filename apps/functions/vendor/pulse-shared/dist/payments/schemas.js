"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentsOverviewSchema = exports.importStatementInputSchema = exports.statementImportLineSchema = exports.carrierStateRateInputSchema = exports.importCarrierStateRatesInputSchema = exports.carrierStateRateImportRowSchema = exports.carrierInputSchema = exports.applyCompensationPlanInputSchema = exports.planAssignmentInputSchema = exports.compensationPlanInputSchema = exports.agentRateGroupInputSchema = exports.compensationTierInputSchema = exports.contractTermInputSchema = exports.businessRelationshipInputSchema = exports.paymentsParticipantInputSchema = exports.overrideRunSchema = exports.reconciliationItemSchema = exports.overrideAllocationSchema = exports.statementLineSchema = exports.statementSchema = exports.carrierStateRateSchema = exports.carrierSchema = exports.paymentRoutingSchema = exports.planAssignmentSchema = exports.compensationPlanSchema = exports.compensationPlanSlotSchema = exports.agentRateGroupSchema = exports.compensationTierSchema = exports.contractTermSchema = exports.businessRelationshipSchema = exports.paymentsParticipantSchema = exports.carrierCodeSchema = exports.planSlotRoleSchema = exports.payModeSchema = exports.compensationTierKindSchema = exports.overrideRunStatusSchema = exports.statementSourceSchema = exports.carrierMarketSchema = exports.carrierRateUnitSchema = exports.rateUnitSchema = exports.relationshipSourceSchema = exports.relationshipTypeSchema = exports.participantTypeSchema = void 0;
exports.normalizeCarrierCode = normalizeCarrierCode;
exports.normalizeCarrierRateUnit = normalizeCarrierRateUnit;
exports.sanitizeCarrierStateRateImportRow = sanitizeCarrierStateRateImportRow;
const zod_1 = require("zod");
const types_1 = require("./types");
exports.participantTypeSchema = zod_1.z.enum(types_1.PARTICIPANT_TYPES);
exports.relationshipTypeSchema = zod_1.z.enum(types_1.RELATIONSHIP_TYPES);
exports.relationshipSourceSchema = zod_1.z.enum(types_1.RELATIONSHIP_SOURCES);
exports.rateUnitSchema = zod_1.z.enum(types_1.RATE_UNITS);
exports.carrierRateUnitSchema = zod_1.z.enum(types_1.CARRIER_RATE_UNITS);
exports.carrierMarketSchema = zod_1.z.enum(types_1.CARRIER_MARKETS);
exports.statementSourceSchema = zod_1.z.enum(types_1.STATEMENT_SOURCES);
exports.overrideRunStatusSchema = zod_1.z.enum(types_1.OVERRIDE_RUN_STATUSES);
exports.compensationTierKindSchema = zod_1.z.enum(types_1.COMPENSATION_TIER_KINDS);
exports.payModeSchema = zod_1.z.enum(types_1.PAY_MODES);
exports.planSlotRoleSchema = zod_1.z.enum(types_1.PLAN_SLOT_ROLES);
/** Exactly four digits, stored as string (e.g. "0123"). */
exports.carrierCodeSchema = zod_1.z
    .string()
    .trim()
    .regex(/^\d{4}$/, "Carrier code must be exactly 4 digits");
/**
 * Coerce Excel/JSON values to a 4-digit carrier code string.
 * Numbers like 1001 → "1001"; rejects padding invention for short values.
 */
function normalizeCarrierCode(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
        if (!Number.isInteger(value) || value < 0 || value > 9999)
            return null;
        const s = String(value);
        return /^\d{1,4}$/.test(s) && s.length === 4 ? s : null;
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        // Excel sometimes serializes as "1001.0"
        const asInt = trimmed.match(/^(\d{4})(?:\.0+)?$/);
        if (asInt)
            return asInt[1];
        return /^\d{4}$/.test(trimmed) ? trimmed : null;
    }
    return null;
}
function emptyToUndefined(value) {
    if (value == null)
        return undefined;
    if (typeof value === "string" && value.trim() === "")
        return undefined;
    return value;
}
function asTrimmedString(value) {
    if (value == null)
        return value;
    return String(value).trim();
}
const RATE_UNIT_ALIASES = {
    pmpm: "pmpm",
    "pm/pm": "pmpm",
    pm: "pmpm",
    pmpy: "pmpm",
    flat: "flat",
    fixed: "flat",
    dollar: "flat",
    dollars: "flat",
    usd: "flat",
    $: "flat",
    percent: "percent",
    percentage: "percent",
    pct: "percent",
    "%": "percent",
};
/** Map spreadsheet unit labels onto pmpm | flat | percent. */
function normalizeCarrierRateUnit(value) {
    if (value == null)
        return null;
    if (typeof value === "number")
        return null;
    const raw = String(value).trim().toLowerCase();
    if (!raw)
        return null;
    return RATE_UNIT_ALIASES[raw] ?? null;
}
function looksLikeNumber(value) {
    if (typeof value === "number")
        return Number.isFinite(value);
    if (typeof value !== "string")
        return false;
    const s = value.trim().replace(/,/g, "");
    return s !== "" && /^-?\d+(\.\d+)?$/.test(s);
}
/**
 * Fix common spreadsheet mistakes: swapped rate/unit columns, missing unit
 * (inherit from the other rate), case/aliases.
 */
function sanitizeCarrierStateRateImportRow(row) {
    const next = { ...row };
    // Swapped commission rate ↔ unit
    if (looksLikeNumber(next.commission_unit) &&
        normalizeCarrierRateUnit(next.commission_rate)) {
        const unit = next.commission_rate;
        next.commission_rate = next.commission_unit;
        next.commission_unit = unit;
    }
    // Swapped override rate ↔ unit
    if (looksLikeNumber(next.override_unit) &&
        normalizeCarrierRateUnit(next.override_rate)) {
        const unit = next.override_rate;
        next.override_rate = next.override_unit;
        next.override_unit = unit;
    }
    const commissionUnit = normalizeCarrierRateUnit(next.commission_unit) ??
        normalizeCarrierRateUnit(next.override_unit) ??
        "pmpm";
    const overrideUnit = normalizeCarrierRateUnit(next.override_unit) ?? commissionUnit;
    next.commission_unit = commissionUnit;
    next.override_unit = overrideUnit;
    return next;
}
function asNormalizedUnit(value) {
    return normalizeCarrierRateUnit(value) ?? asTrimmedString(value);
}
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
    source: exports.relationshipSourceSchema.default("manual"),
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
    sourcePlanId: zod_1.z.string().nullable().optional(),
    sourceAssignmentId: zod_1.z.string().nullable().optional(),
});
exports.compensationTierSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    rate: zod_1.z.number(),
    rateUnit: exports.rateUnitSchema,
    kind: exports.compensationTierKindSchema,
    active: zod_1.z.boolean(),
    createdAt: zod_1.z.string().optional(),
    updatedAt: zod_1.z.string().optional(),
});
exports.agentRateGroupSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    memberParticipantIds: zod_1.z.array(zod_1.z.string()),
    active: zod_1.z.boolean(),
    createdAt: zod_1.z.string().optional(),
    updatedAt: zod_1.z.string().optional(),
});
exports.compensationPlanSlotSchema = zod_1.z
    .object({
    role: exports.planSlotRoleSchema,
    tierId: zod_1.z.string().nullable().optional().default(null),
    rate: zod_1.z.number().nullable().optional().default(null),
    rateUnit: exports.rateUnitSchema.optional().default("pmpm"),
    agentRateGroupId: zod_1.z.string().nullable().optional().default(null),
    participantIds: zod_1.z.array(zod_1.z.string()).optional().default([]),
})
    .superRefine((slot, ctx) => {
    if (slot.tierId == null && slot.rate == null) {
        ctx.addIssue({
            code: "custom",
            message: "Each slot needs a tierId or rate.",
            path: ["tierId"],
        });
    }
    if (slot.role === "agent_group" && !slot.agentRateGroupId) {
        ctx.addIssue({
            code: "custom",
            message: "agent_group slots require agentRateGroupId.",
            path: ["agentRateGroupId"],
        });
    }
    if (slot.role === "agent_override" &&
        (!slot.participantIds || slot.participantIds.length === 0)) {
        ctx.addIssue({
            code: "custom",
            message: "agent_override slots require participantIds.",
            path: ["participantIds"],
        });
    }
});
exports.compensationPlanSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    carrierIds: zod_1.z.array(zod_1.z.string()),
    slots: zod_1.z.array(exports.compensationPlanSlotSchema).min(1),
    payModeDefault: exports.payModeSchema,
    retentionFractionDefault: zod_1.z.number().min(0).max(1),
    effectiveFrom: zod_1.z.string().min(1),
    effectiveTo: zod_1.z.string().nullable(),
    active: zod_1.z.boolean(),
    createdAt: zod_1.z.string().optional(),
    updatedAt: zod_1.z.string().optional(),
});
exports.planAssignmentSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    planId: zod_1.z.string().min(1),
    agencyParticipantIds: zod_1.z.array(zod_1.z.string()),
    includeDescendantAgencies: zod_1.z.boolean(),
    agentParticipantIds: zod_1.z.array(zod_1.z.string()),
    payMode: exports.payModeSchema.nullable(),
    retentionFraction: zod_1.z.number().min(0).max(1).nullable(),
    agentPayModeOverrides: zod_1.z.array(zod_1.z.object({
        participantId: zod_1.z.string().min(1),
        payMode: exports.payModeSchema,
    })),
    effectiveFrom: zod_1.z.string().nullable(),
    active: zod_1.z.boolean(),
    createdAt: zod_1.z.string().optional(),
    updatedAt: zod_1.z.string().optional(),
});
exports.paymentRoutingSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    participantId: zod_1.z.string().min(1),
    payMode: exports.payModeSchema,
    payeeParticipantId: zod_1.z.string().min(1),
    planId: zod_1.z.string().nullable(),
    assignmentId: zod_1.z.string().nullable(),
    updatedAt: zod_1.z.string().optional(),
});
exports.carrierSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    code: exports.carrierCodeSchema,
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
    source: exports.relationshipSourceSchema.optional().default("manual"),
    active: zod_1.z.boolean().optional().default(true),
});
exports.contractTermInputSchema = exports.contractTermSchema
    .omit({ id: true })
    .extend({
    carrierId: zod_1.z.string().min(1),
    states: zod_1.z.array(zod_1.z.string()).optional().default([]),
    productCodes: zod_1.z.array(zod_1.z.string()).optional().default([]),
    rateUnit: exports.rateUnitSchema.optional().default("pmpm"),
    effectiveTo: zod_1.z.string().nullable().optional().default(null),
    active: zod_1.z.boolean().optional().default(true),
    sourcePlanId: zod_1.z.string().nullable().optional().default(null),
    sourceAssignmentId: zod_1.z.string().nullable().optional().default(null),
});
exports.compensationTierInputSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    rate: zod_1.z.number(),
    rateUnit: exports.rateUnitSchema.optional().default("pmpm"),
    kind: exports.compensationTierKindSchema.optional().default("generic"),
    active: zod_1.z.boolean().optional().default(true),
});
exports.agentRateGroupInputSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    memberParticipantIds: zod_1.z.array(zod_1.z.string()).optional().default([]),
    active: zod_1.z.boolean().optional().default(true),
});
exports.compensationPlanInputSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    carrierIds: zod_1.z.array(zod_1.z.string()).optional().default([]),
    slots: zod_1.z.array(exports.compensationPlanSlotSchema).min(1),
    payModeDefault: exports.payModeSchema.optional().default("through_agency"),
    retentionFractionDefault: zod_1.z.number().min(0).max(1).optional().default(0),
    effectiveFrom: zod_1.z.string().min(1),
    effectiveTo: zod_1.z.string().nullable().optional().default(null),
    active: zod_1.z.boolean().optional().default(true),
});
exports.planAssignmentInputSchema = zod_1.z.object({
    planId: zod_1.z.string().min(1),
    agencyParticipantIds: zod_1.z.array(zod_1.z.string()).optional().default([]),
    includeDescendantAgencies: zod_1.z.boolean().optional().default(true),
    agentParticipantIds: zod_1.z.array(zod_1.z.string()).optional().default([]),
    payMode: exports.payModeSchema.nullable().optional().default(null),
    retentionFraction: zod_1.z.number().min(0).max(1).nullable().optional().default(null),
    agentPayModeOverrides: zod_1.z
        .array(zod_1.z.object({
        participantId: zod_1.z.string().min(1),
        payMode: exports.payModeSchema,
    }))
        .optional()
        .default([]),
    effectiveFrom: zod_1.z.string().nullable().optional().default(null),
    active: zod_1.z.boolean().optional().default(true),
});
exports.applyCompensationPlanInputSchema = zod_1.z.object({
    planId: zod_1.z.string().min(1),
    /** Optional; when omitted a new assignment is created from these fields. */
    assignmentId: zod_1.z.string().nullable().optional().default(null),
    agencyParticipantIds: zod_1.z.array(zod_1.z.string()).optional().default([]),
    includeDescendantAgencies: zod_1.z.boolean().optional().default(true),
    agentParticipantIds: zod_1.z.array(zod_1.z.string()).optional().default([]),
    /** Override plan.carrierIds for this apply; empty = plan carriers or error. */
    carrierIds: zod_1.z.array(zod_1.z.string()).optional().default([]),
    payMode: exports.payModeSchema.nullable().optional().default(null),
    retentionFraction: zod_1.z.number().min(0).max(1).nullable().optional().default(null),
    agentPayModeOverrides: zod_1.z
        .array(zod_1.z.object({
        participantId: zod_1.z.string().min(1),
        payMode: exports.payModeSchema,
    }))
        .optional()
        .default([]),
    effectiveFrom: zod_1.z.string().nullable().optional().default(null),
});
exports.carrierInputSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    code: exports.carrierCodeSchema,
    market: exports.carrierMarketSchema,
    active: zod_1.z.boolean().optional().default(true),
});
exports.carrierStateRateImportRowSchema = zod_1.z.preprocess((raw) => {
    if (!raw || typeof raw !== "object")
        return raw;
    return sanitizeCarrierStateRateImportRow(raw);
}, zod_1.z.object({
    carrier_code: zod_1.z.preprocess((v) => normalizeCarrierCode(v) ?? v, exports.carrierCodeSchema),
    carrier_name: zod_1.z.preprocess(asTrimmedString, zod_1.z.string().min(1)),
    state: zod_1.z.preprocess(asTrimmedString, zod_1.z
        .string()
        .transform((s) => s.toUpperCase())
        .pipe(zod_1.z.string().length(2))),
    commission_rate: zod_1.z.coerce.number(),
    commission_unit: zod_1.z.preprocess(asNormalizedUnit, exports.carrierRateUnitSchema),
    override_rate: zod_1.z.coerce.number(),
    override_unit: zod_1.z.preprocess(asNormalizedUnit, exports.carrierRateUnitSchema),
    active: zod_1.z.preprocess(emptyToUndefined, zod_1.z
        .union([
        zod_1.z.boolean(),
        zod_1.z.enum(["true", "false", "TRUE", "FALSE", "1", "0", "yes", "no"]),
    ])
        .optional()
        .transform((v) => {
        if (v === undefined)
            return true;
        if (typeof v === "boolean")
            return v;
        const s = v.toLowerCase();
        return s === "true" || s === "1" || s === "yes";
    })),
    market: zod_1.z.preprocess((v) => {
        const cleared = emptyToUndefined(v);
        if (cleared === undefined)
            return undefined;
        const s = asTrimmedString(cleared);
        return typeof s === "string" ? s.toLowerCase() : s;
    }, exports.carrierMarketSchema.optional().default("aca")),
}));
exports.importCarrierStateRatesInputSchema = zod_1.z.object({
    rows: zod_1.z.array(exports.carrierStateRateImportRowSchema).min(1).max(5000),
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
exports.paymentsOverviewSchema = zod_1.z.object({
    carriers: zod_1.z.object({ active: zod_1.z.number().int().nonnegative() }),
    statements: zod_1.z.object({
        total: zod_1.z.number().int().nonnegative(),
        imported: zod_1.z.number().int().nonnegative(),
    }),
});

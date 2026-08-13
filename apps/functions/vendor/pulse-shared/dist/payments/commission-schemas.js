"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commissionPartySummarySchema = exports.commissionSettingsSchema = exports.commissionRuleSchema = exports.commissionImportProfileSchema = exports.setAgencyPayModeInputSchema = exports.getAgencyPayModeInputSchema = exports.agencyPayModeSchema = exports.listCommissionPartiesInputSchema = exports.getCommissionRunInputSchema = exports.listCommissionRunsInputSchema = exports.createCommissionRunInputSchema = exports.commissionRunSchema = exports.commissionRunTotalsSchema = exports.moneyCentsSchema = exports.partyRefSchema = exports.commissionRunStatusSchema = exports.commissionIssueSeveritySchema = exports.commissionTransactionTypeSchema = exports.commissionStreamSchema = void 0;
const zod_1 = require("zod");
const commission_status_1 = require("./commission-status");
const types_1 = require("./types");
exports.commissionStreamSchema = zod_1.z.enum(["commission", "override"]);
exports.commissionTransactionTypeSchema = zod_1.z.enum([
    "COMMISSION",
    "OVERRIDE",
    "BONUS",
    "ADJUSTMENT",
    "CHARGEBACK",
    "RETROACTIVE",
    "OTHER",
]);
exports.commissionIssueSeveritySchema = zod_1.z.enum([
    "INFO",
    "WARNING",
    "ERROR",
    "BLOCKING",
]);
exports.commissionRunStatusSchema = zod_1.z.enum(commission_status_1.COMMISSION_RUN_STATUSES);
exports.partyRefSchema = zod_1.z.discriminatedUnion("kind", [
    zod_1.z.object({
        kind: zod_1.z.literal("agency"),
        orgNodeId: zod_1.z.string().min(1),
    }),
    zod_1.z.object({
        kind: zod_1.z.literal("agent"),
        userId: zod_1.z.string().min(1),
    }),
]);
exports.moneyCentsSchema = zod_1.z.number().int();
exports.commissionRunTotalsSchema = zod_1.z.object({
    receivedCents: exports.moneyCentsSchema,
    expectedCents: exports.moneyCentsSchema,
    varianceCents: exports.moneyCentsSchema,
    downstreamCents: exports.moneyCentsSchema,
    retainedCents: exports.moneyCentsSchema,
    payableAgenciesCents: exports.moneyCentsSchema,
    payableAgentsCents: exports.moneyCentsSchema,
    commissionCents: exports.moneyCentsSchema,
    overrideCents: exports.moneyCentsSchema,
});
exports.commissionRunSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    periodStart: zod_1.z.string().min(1),
    periodEnd: zod_1.z.string().min(1),
    status: exports.commissionRunStatusSchema,
    createdBy: zod_1.z.string().min(1),
    createdAt: zod_1.z.string().optional(),
    updatedAt: zod_1.z.string().optional(),
    fileCount: zod_1.z.number().int().nonnegative(),
    transactionCount: zod_1.z.number().int().nonnegative(),
    carrierIds: zod_1.z.array(zod_1.z.string()),
    upstreamOrganizationIds: zod_1.z.array(zod_1.z.string()),
    totals: exports.commissionRunTotalsSchema,
    errorCount: zod_1.z.number().int().nonnegative(),
    warningCount: zod_1.z.number().int().nonnegative(),
    blockingIssueCount: zod_1.z.number().int().nonnegative(),
    statementCount: zod_1.z.number().int().nonnegative(),
    approvedBy: zod_1.z.string().nullable(),
    approvedAt: zod_1.z.string().nullable(),
    publishedAt: zod_1.z.string().nullable(),
    completedAt: zod_1.z.string().nullable(),
});
exports.createCommissionRunInputSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(200),
    periodStart: zod_1.z.string().min(1),
    periodEnd: zod_1.z.string().min(1),
});
exports.listCommissionRunsInputSchema = zod_1.z.object({
    limit: zod_1.z.number().int().min(1).max(100).optional().default(50),
    cursor: zod_1.z.string().nullable().optional().default(null),
    status: exports.commissionRunStatusSchema.optional(),
});
exports.getCommissionRunInputSchema = zod_1.z.object({
    runId: zod_1.z.string().min(1),
});
exports.listCommissionPartiesInputSchema = zod_1.z.object({
    kind: zod_1.z.enum(["agency", "agent", "all"]).optional().default("all"),
    query: zod_1.z.string().optional().default(""),
    limit: zod_1.z.number().int().min(1).max(200).optional().default(50),
    cursor: zod_1.z.string().nullable().optional().default(null),
});
exports.agencyPayModeSchema = zod_1.z.object({
    orgNodeId: zod_1.z.string().min(1),
    payMode: zod_1.z.enum(types_1.PAY_MODES),
    updatedAt: zod_1.z.string().optional(),
    updatedBy: zod_1.z.string().optional(),
});
exports.getAgencyPayModeInputSchema = zod_1.z.object({
    orgNodeId: zod_1.z.string().min(1),
});
exports.setAgencyPayModeInputSchema = zod_1.z.object({
    orgNodeId: zod_1.z.string().min(1),
    payMode: zod_1.z.enum(types_1.PAY_MODES),
});
exports.commissionImportProfileSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().nullable(),
    upstreamOrganizationId: zod_1.z.string().nullable(),
    carrierId: zod_1.z.string().nullable(),
    headerMappings: zod_1.z.array(zod_1.z.object({
        sourceHeader: zod_1.z.string().min(1),
        targetField: zod_1.z.string().min(1),
    })),
    dateFormat: zod_1.z.string().nullable(),
    currencyFormat: zod_1.z.string().nullable(),
    requiredColumns: zod_1.z.array(zod_1.z.string()),
    ignoredColumns: zod_1.z.array(zod_1.z.string()),
    active: zod_1.z.boolean(),
    createdAt: zod_1.z.string().optional(),
    updatedAt: zod_1.z.string().optional(),
});
exports.commissionRuleSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    stream: exports.commissionStreamSchema,
    carrierId: zod_1.z.string().nullable(),
    productId: zod_1.z.string().nullable(),
    state: zod_1.z.string().nullable(),
    party: exports.partyRefSchema.nullable(),
    rate: zod_1.z.number(),
    rateUnit: zod_1.z.enum(types_1.RATE_UNITS),
    effectiveFrom: zod_1.z.string().min(1),
    effectiveTo: zod_1.z.string().nullable(),
    active: zod_1.z.boolean(),
    currentVersionId: zod_1.z.string().nullable(),
    createdAt: zod_1.z.string().optional(),
    updatedAt: zod_1.z.string().optional(),
});
exports.commissionSettingsSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    absoluteToleranceCents: zod_1.z.number().int().nonnegative(),
    percentageTolerance: zod_1.z.number().nonnegative(),
    defaultPayMode: zod_1.z.enum(types_1.PAY_MODES),
    roundingMode: zod_1.z.literal("half_away_from_zero"),
    updatedAt: zod_1.z.string().optional(),
});
exports.commissionPartySummarySchema = zod_1.z.object({
    ref: exports.partyRefSchema,
    name: zod_1.z.string(),
    npn: zod_1.z.string().nullable(),
    parentOrgNodeId: zod_1.z.string().nullable(),
    active: zod_1.z.boolean(),
});

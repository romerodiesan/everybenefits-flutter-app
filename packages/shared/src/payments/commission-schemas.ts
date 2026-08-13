import { z } from "zod";
import { COMMISSION_RUN_STATUSES } from "./commission-status";
import { PAY_MODES, RATE_UNITS } from "./types";

export const commissionStreamSchema = z.enum(["commission", "override"]);

export const commissionTransactionTypeSchema = z.enum([
  "COMMISSION",
  "OVERRIDE",
  "BONUS",
  "ADJUSTMENT",
  "CHARGEBACK",
  "RETROACTIVE",
  "OTHER",
]);

export const commissionIssueSeveritySchema = z.enum([
  "INFO",
  "WARNING",
  "ERROR",
  "BLOCKING",
]);

export const commissionRunStatusSchema = z.enum(COMMISSION_RUN_STATUSES);

export const partyRefSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("agency"),
    orgNodeId: z.string().min(1),
  }),
  z.object({
    kind: z.literal("agent"),
    userId: z.string().min(1),
  }),
]);

export const moneyCentsSchema = z.number().int();

export const commissionRunTotalsSchema = z.object({
  receivedCents: moneyCentsSchema,
  expectedCents: moneyCentsSchema,
  varianceCents: moneyCentsSchema,
  downstreamCents: moneyCentsSchema,
  retainedCents: moneyCentsSchema,
  payableAgenciesCents: moneyCentsSchema,
  payableAgentsCents: moneyCentsSchema,
  commissionCents: moneyCentsSchema,
  overrideCents: moneyCentsSchema,
});

export const commissionRunSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  status: commissionRunStatusSchema,
  createdBy: z.string().min(1),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  fileCount: z.number().int().nonnegative(),
  transactionCount: z.number().int().nonnegative(),
  carrierIds: z.array(z.string()),
  upstreamOrganizationIds: z.array(z.string()),
  totals: commissionRunTotalsSchema,
  errorCount: z.number().int().nonnegative(),
  warningCount: z.number().int().nonnegative(),
  blockingIssueCount: z.number().int().nonnegative(),
  statementCount: z.number().int().nonnegative(),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
  publishedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
});

export const createCommissionRunInputSchema = z.object({
  name: z.string().min(1).max(200),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
});

export const listCommissionRunsInputSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(50),
  cursor: z.string().nullable().optional().default(null),
  status: commissionRunStatusSchema.optional(),
});

export const getCommissionRunInputSchema = z.object({
  runId: z.string().min(1),
});

export const listCommissionPartiesInputSchema = z.object({
  kind: z.enum(["agency", "agent", "all"]).optional().default("all"),
  query: z.string().optional().default(""),
  limit: z.number().int().min(1).max(200).optional().default(50),
  cursor: z.string().nullable().optional().default(null),
});

export const agencyPayModeSchema = z.object({
  orgNodeId: z.string().min(1),
  payMode: z.enum(PAY_MODES),
  updatedAt: z.string().optional(),
  updatedBy: z.string().optional(),
});

export const getAgencyPayModeInputSchema = z.object({
  orgNodeId: z.string().min(1),
});

export const setAgencyPayModeInputSchema = z.object({
  orgNodeId: z.string().min(1),
  payMode: z.enum(PAY_MODES),
});

export const commissionImportProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  upstreamOrganizationId: z.string().nullable(),
  carrierId: z.string().nullable(),
  headerMappings: z.array(
    z.object({
      sourceHeader: z.string().min(1),
      targetField: z.string().min(1),
    }),
  ),
  dateFormat: z.string().nullable(),
  currencyFormat: z.string().nullable(),
  requiredColumns: z.array(z.string()),
  ignoredColumns: z.array(z.string()),
  active: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const commissionRuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  stream: commissionStreamSchema,
  carrierId: z.string().nullable(),
  productId: z.string().nullable(),
  state: z.string().nullable(),
  party: partyRefSchema.nullable(),
  rate: z.number(),
  rateUnit: z.enum(RATE_UNITS),
  effectiveFrom: z.string().min(1),
  effectiveTo: z.string().nullable(),
  active: z.boolean(),
  currentVersionId: z.string().nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const commissionSettingsSchema = z.object({
  id: z.string().min(1),
  absoluteToleranceCents: z.number().int().nonnegative(),
  percentageTolerance: z.number().nonnegative(),
  defaultPayMode: z.enum(PAY_MODES),
  roundingMode: z.literal("half_away_from_zero"),
  updatedAt: z.string().optional(),
});

export const commissionPartySummarySchema = z.object({
  ref: partyRefSchema,
  name: z.string(),
  npn: z.string().nullable(),
  parentOrgNodeId: z.string().nullable(),
  active: z.boolean(),
});

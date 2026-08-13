import { z } from "zod";
import {
  PARTICIPANT_TYPES,
  RATE_UNITS,
  CARRIER_RATE_UNITS,
  RELATIONSHIP_TYPES,
  RELATIONSHIP_SOURCES,
  STATEMENT_SOURCES,
  OVERRIDE_RUN_STATUSES,
  CARRIER_MARKETS,
  COMPENSATION_TIER_KINDS,
  PAY_MODES,
  PLAN_SLOT_ROLES,
} from "./types";

export const participantTypeSchema = z.enum(PARTICIPANT_TYPES);
export const relationshipTypeSchema = z.enum(RELATIONSHIP_TYPES);
export const relationshipSourceSchema = z.enum(RELATIONSHIP_SOURCES);
export const rateUnitSchema = z.enum(RATE_UNITS);
export const carrierRateUnitSchema = z.enum(CARRIER_RATE_UNITS);
export const carrierMarketSchema = z.enum(CARRIER_MARKETS);
export const statementSourceSchema = z.enum(STATEMENT_SOURCES);
export const overrideRunStatusSchema = z.enum(OVERRIDE_RUN_STATUSES);
export const compensationTierKindSchema = z.enum(COMPENSATION_TIER_KINDS);
export const payModeSchema = z.enum(PAY_MODES);
export const planSlotRoleSchema = z.enum(PLAN_SLOT_ROLES);

/** Exactly four digits, stored as string (e.g. "0123"). */
export const carrierCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{4}$/, "Carrier code must be exactly 4 digits");

/**
 * Coerce Excel/JSON values to a 4-digit carrier code string.
 * Numbers like 1001 → "1001"; rejects padding invention for short values.
 */
export function normalizeCarrierCode(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (!Number.isInteger(value) || value < 0 || value > 9999) return null;
    const s = String(value);
    return /^\d{1,4}$/.test(s) && s.length === 4 ? s : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    // Excel sometimes serializes as "1001.0"
    const asInt = trimmed.match(/^(\d{4})(?:\.0+)?$/);
    if (asInt) return asInt[1]!;
    return /^\d{4}$/.test(trimmed) ? trimmed : null;
  }
  return null;
}

function emptyToUndefined(value: unknown): unknown {
  if (value == null) return undefined;
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
}

function asTrimmedString(value: unknown): unknown {
  if (value == null) return value;
  return String(value).trim();
}

const RATE_UNIT_ALIASES: Record<string, "pmpm" | "flat" | "percent"> = {
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
export function normalizeCarrierRateUnit(
  value: unknown,
): "pmpm" | "flat" | "percent" | null {
  if (value == null) return null;
  if (typeof value === "number") return null;
  const raw = String(value).trim().toLowerCase();
  if (!raw) return null;
  return RATE_UNIT_ALIASES[raw] ?? null;
}

function looksLikeNumber(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "string") return false;
  const s = value.trim().replace(/,/g, "");
  return s !== "" && /^-?\d+(\.\d+)?$/.test(s);
}

/**
 * Fix common spreadsheet mistakes: swapped rate/unit columns, missing unit
 * (inherit from the other rate), case/aliases.
 */
export function sanitizeCarrierStateRateImportRow(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...row };

  // Swapped commission rate ↔ unit
  if (
    looksLikeNumber(next.commission_unit) &&
    normalizeCarrierRateUnit(next.commission_rate)
  ) {
    const unit = next.commission_rate;
    next.commission_rate = next.commission_unit;
    next.commission_unit = unit;
  }
  // Swapped override rate ↔ unit
  if (
    looksLikeNumber(next.override_unit) &&
    normalizeCarrierRateUnit(next.override_rate)
  ) {
    const unit = next.override_rate;
    next.override_rate = next.override_unit;
    next.override_unit = unit;
  }

  const commissionUnit =
    normalizeCarrierRateUnit(next.commission_unit) ??
    normalizeCarrierRateUnit(next.override_unit) ??
    "pmpm";
  const overrideUnit =
    normalizeCarrierRateUnit(next.override_unit) ?? commissionUnit;

  next.commission_unit = commissionUnit;
  next.override_unit = overrideUnit;
  return next;
}

function asNormalizedUnit(value: unknown): unknown {
  return normalizeCarrierRateUnit(value) ?? asTrimmedString(value);
}

export const paymentsParticipantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: participantTypeSchema,
  userId: z.string().nullable(),
  npn: z.string().nullable(),
  linkedOrgNodeId: z.string().nullable(),
  active: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const businessRelationshipSchema = z.object({
  id: z.string().min(1),
  uplineParticipantId: z.string().min(1),
  downlineParticipantId: z.string().min(1),
  relationshipType: relationshipTypeSchema,
  effectiveFrom: z.string().min(1),
  effectiveTo: z.string().nullable(),
  carrierIds: z.array(z.string()),
  states: z.array(z.string()),
  productCodes: z.array(z.string()),
  retentionFraction: z.number().min(0).max(1).default(0),
  notes: z.string().nullable(),
  source: relationshipSourceSchema.default("manual"),
  active: z.boolean(),
});

export const contractTermSchema = z.object({
  id: z.string().min(1),
  participantId: z.string().min(1),
  carrierId: z.string().nullable(),
  states: z.array(z.string()),
  productCodes: z.array(z.string()),
  rate: z.number(),
  rateUnit: rateUnitSchema,
  effectiveFrom: z.string().min(1),
  effectiveTo: z.string().nullable(),
  active: z.boolean(),
  sourcePlanId: z.string().nullable().optional(),
  sourceAssignmentId: z.string().nullable().optional(),
});

export const compensationTierSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  rate: z.number(),
  rateUnit: rateUnitSchema,
  kind: compensationTierKindSchema,
  active: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const agentRateGroupSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  memberParticipantIds: z.array(z.string()),
  active: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const compensationPlanSlotSchema = z
  .object({
    role: planSlotRoleSchema,
    tierId: z.string().nullable().optional().default(null),
    rate: z.number().nullable().optional().default(null),
    rateUnit: rateUnitSchema.optional().default("pmpm"),
    agentRateGroupId: z.string().nullable().optional().default(null),
    participantIds: z.array(z.string()).optional().default([]),
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
    if (
      slot.role === "agent_override" &&
      (!slot.participantIds || slot.participantIds.length === 0)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "agent_override slots require participantIds.",
        path: ["participantIds"],
      });
    }
  });

export const compensationPlanSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  carrierIds: z.array(z.string()),
  slots: z.array(compensationPlanSlotSchema).min(1),
  payModeDefault: payModeSchema,
  retentionFractionDefault: z.number().min(0).max(1),
  effectiveFrom: z.string().min(1),
  effectiveTo: z.string().nullable(),
  active: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const planAssignmentSchema = z.object({
  id: z.string().min(1),
  planId: z.string().min(1),
  agencyParticipantIds: z.array(z.string()),
  includeDescendantAgencies: z.boolean(),
  agentParticipantIds: z.array(z.string()),
  payMode: payModeSchema.nullable(),
  retentionFraction: z.number().min(0).max(1).nullable(),
  agentPayModeOverrides: z.array(
    z.object({
      participantId: z.string().min(1),
      payMode: payModeSchema,
    }),
  ),
  effectiveFrom: z.string().nullable(),
  active: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const paymentRoutingSchema = z.object({
  id: z.string().min(1),
  participantId: z.string().min(1),
  payMode: payModeSchema,
  payeeParticipantId: z.string().min(1),
  planId: z.string().nullable(),
  assignmentId: z.string().nullable(),
  updatedAt: z.string().optional(),
});

export const carrierSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  code: carrierCodeSchema,
  market: carrierMarketSchema,
  active: z.boolean(),
});

export const carrierStateRateSchema = z.object({
  id: z.string().min(1),
  carrierId: z.string().min(1),
  state: z.string().min(2).max(2),
  commissionRate: z.number(),
  commissionRateUnit: carrierRateUnitSchema,
  overrideRate: z.number(),
  overrideRateUnit: carrierRateUnitSchema,
  active: z.boolean(),
});

export const statementSchema = z.object({
  id: z.string().min(1),
  source: statementSourceSchema,
  carrierId: z.string().nullable(),
  fmoParticipantId: z.string().nullable(),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  label: z.string().min(1),
  importedAt: z.string().min(1),
  importedBy: z.string().min(1),
  lineCount: z.number().int().nonnegative(),
  status: z.enum(["draft", "imported", "reconciled"]),
});

export const statementLineSchema = z.object({
  id: z.string().min(1),
  statementId: z.string().min(1),
  writingProducerParticipantId: z.string().nullable(),
  writingProducerNpn: z.string().nullable(),
  writingProducerName: z.string().nullable(),
  carrierId: z.string().nullable(),
  state: z.string().nullable(),
  productCode: z.string().nullable(),
  memberMonths: z.number().nonnegative(),
  receivedOverrideAmount: z.number(),
  carrierRate: z.number().nullable(),
  productionDate: z.string().nullable(),
  externalRef: z.string().nullable(),
});

export const overrideAllocationSchema = z.object({
  id: z.string().min(1),
  runId: z.string().min(1),
  statementLineId: z.string().min(1),
  participantId: z.string().min(1),
  amount: z.number(),
  memberMonths: z.number(),
  rateDelta: z.number(),
  uplineLevel: z.number(),
  downlineLevel: z.number(),
  carrierRate: z.number(),
  writingProducerLevel: z.number(),
});

export const reconciliationItemSchema = z.object({
  id: z.string().min(1),
  runId: z.string().min(1),
  statementLineId: z.string().min(1),
  participantId: z.string().nullable(),
  expectedAmount: z.number(),
  receivedAmount: z.number(),
  difference: z.number(),
});

export const overrideRunSchema = z.object({
  id: z.string().min(1),
  statementId: z.string().min(1),
  status: overrideRunStatusSchema,
  startedAt: z.string().min(1),
  completedAt: z.string().nullable(),
  error: z.string().nullable(),
  allocationCount: z.number().int().nonnegative(),
  expectedTotal: z.number(),
  receivedTotal: z.number(),
  differenceTotal: z.number(),
  createdBy: z.string().min(1),
});

/** Input for creating/updating a participant (id optional on create). */
export const paymentsParticipantInputSchema = z.object({
  name: z.string().min(1),
  type: participantTypeSchema,
  userId: z.string().nullable().optional().default(null),
  npn: z.string().nullable().optional().default(null),
  linkedOrgNodeId: z.string().nullable().optional().default(null),
  active: z.boolean().optional().default(true),
});

/** relationshipType is derived server-side; client may omit it. */
export const businessRelationshipInputSchema = z.object({
  uplineParticipantId: z.string().min(1),
  downlineParticipantId: z.string().min(1),
  relationshipType: relationshipTypeSchema.optional(),
  effectiveFrom: z.string().min(1),
  effectiveTo: z.string().nullable().optional().default(null),
  carrierIds: z.array(z.string()).optional().default([]),
  states: z.array(z.string()).optional().default([]),
  productCodes: z.array(z.string()).optional().default([]),
  retentionFraction: z.number().min(0).max(1).optional().default(0),
  notes: z.string().nullable().optional().default(null),
  source: relationshipSourceSchema.optional().default("manual"),
  active: z.boolean().optional().default(true),
});

export const contractTermInputSchema = contractTermSchema
  .omit({ id: true })
  .extend({
    carrierId: z.string().min(1),
    states: z.array(z.string()).optional().default([]),
    productCodes: z.array(z.string()).optional().default([]),
    rateUnit: rateUnitSchema.optional().default("pmpm"),
    effectiveTo: z.string().nullable().optional().default(null),
    active: z.boolean().optional().default(true),
    sourcePlanId: z.string().nullable().optional().default(null),
    sourceAssignmentId: z.string().nullable().optional().default(null),
  });

export const compensationTierInputSchema = z.object({
  name: z.string().min(1),
  rate: z.number(),
  rateUnit: rateUnitSchema.optional().default("pmpm"),
  kind: compensationTierKindSchema.optional().default("generic"),
  active: z.boolean().optional().default(true),
});

export const agentRateGroupInputSchema = z.object({
  name: z.string().min(1),
  memberParticipantIds: z.array(z.string()).optional().default([]),
  active: z.boolean().optional().default(true),
});

export const compensationPlanInputSchema = z.object({
  name: z.string().min(1),
  carrierIds: z.array(z.string()).optional().default([]),
  slots: z.array(compensationPlanSlotSchema).min(1),
  payModeDefault: payModeSchema.optional().default("through_agency"),
  retentionFractionDefault: z.number().min(0).max(1).optional().default(0),
  effectiveFrom: z.string().min(1),
  effectiveTo: z.string().nullable().optional().default(null),
  active: z.boolean().optional().default(true),
});

export const planAssignmentInputSchema = z.object({
  planId: z.string().min(1),
  agencyParticipantIds: z.array(z.string()).optional().default([]),
  includeDescendantAgencies: z.boolean().optional().default(true),
  agentParticipantIds: z.array(z.string()).optional().default([]),
  payMode: payModeSchema.nullable().optional().default(null),
  retentionFraction: z.number().min(0).max(1).nullable().optional().default(null),
  agentPayModeOverrides: z
    .array(
      z.object({
        participantId: z.string().min(1),
        payMode: payModeSchema,
      }),
    )
    .optional()
    .default([]),
  effectiveFrom: z.string().nullable().optional().default(null),
  active: z.boolean().optional().default(true),
});

export const applyCompensationPlanInputSchema = z.object({
  planId: z.string().min(1),
  /** Optional; when omitted a new assignment is created from these fields. */
  assignmentId: z.string().nullable().optional().default(null),
  agencyParticipantIds: z.array(z.string()).optional().default([]),
  includeDescendantAgencies: z.boolean().optional().default(true),
  agentParticipantIds: z.array(z.string()).optional().default([]),
  /** Override plan.carrierIds for this apply; empty = plan carriers or error. */
  carrierIds: z.array(z.string()).optional().default([]),
  payMode: payModeSchema.nullable().optional().default(null),
  retentionFraction: z.number().min(0).max(1).nullable().optional().default(null),
  agentPayModeOverrides: z
    .array(
      z.object({
        participantId: z.string().min(1),
        payMode: payModeSchema,
      }),
    )
    .optional()
    .default([]),
  effectiveFrom: z.string().nullable().optional().default(null),
});

export const carrierInputSchema = z.object({
  name: z.string().min(1),
  code: carrierCodeSchema,
  market: carrierMarketSchema,
  active: z.boolean().optional().default(true),
});

export const carrierStateRateImportRowSchema = z.preprocess(
  (raw) => {
    if (!raw || typeof raw !== "object") return raw;
    return sanitizeCarrierStateRateImportRow(raw as Record<string, unknown>);
  },
  z.object({
    carrier_code: z.preprocess(
      (v) => normalizeCarrierCode(v) ?? v,
      carrierCodeSchema,
    ),
    carrier_name: z.preprocess(asTrimmedString, z.string().min(1)),
    state: z.preprocess(
      asTrimmedString,
      z
        .string()
        .transform((s) => s.toUpperCase())
        .pipe(z.string().length(2)),
    ),
    commission_rate: z.coerce.number(),
    commission_unit: z.preprocess(asNormalizedUnit, carrierRateUnitSchema),
    override_rate: z.coerce.number(),
    override_unit: z.preprocess(asNormalizedUnit, carrierRateUnitSchema),
    active: z.preprocess(
      emptyToUndefined,
      z
        .union([
          z.boolean(),
          z.enum(["true", "false", "TRUE", "FALSE", "1", "0", "yes", "no"]),
        ])
        .optional()
        .transform((v) => {
          if (v === undefined) return true;
          if (typeof v === "boolean") return v;
          const s = v.toLowerCase();
          return s === "true" || s === "1" || s === "yes";
        }),
    ),
    market: z.preprocess(
      (v) => {
        const cleared = emptyToUndefined(v);
        if (cleared === undefined) return undefined;
        const s = asTrimmedString(cleared);
        return typeof s === "string" ? s.toLowerCase() : s;
      },
      carrierMarketSchema.optional().default("aca"),
    ),
  }),
);

export const importCarrierStateRatesInputSchema = z.object({
  rows: z.array(carrierStateRateImportRowSchema).min(1).max(5000),
});

export const carrierStateRateInputSchema = z.object({
  carrierId: z.string().min(1),
  state: z
    .string()
    .trim()
    .transform((s) => s.toUpperCase())
    .pipe(z.string().length(2)),
  commissionRate: z.number(),
  commissionRateUnit: carrierRateUnitSchema.optional().default("flat"),
  overrideRate: z.number(),
  overrideRateUnit: carrierRateUnitSchema.optional().default("flat"),
  active: z.boolean().optional().default(true),
});

/** Normalized CSV/JSON line for statement import (v1). */
export const statementImportLineSchema = z.object({
  writingProducerParticipantId: z.string().nullable().optional().default(null),
  writingProducerNpn: z.string().nullable().optional().default(null),
  writingProducerName: z.string().nullable().optional().default(null),
  carrierId: z.string().nullable().optional().default(null),
  state: z.string().nullable().optional().default(null),
  productCode: z.string().nullable().optional().default(null),
  memberMonths: z.number().nonnegative(),
  receivedOverrideAmount: z.number().default(0),
  carrierRate: z.number().nullable().optional().default(null),
  productionDate: z.string().nullable().optional().default(null),
  externalRef: z.string().nullable().optional().default(null),
});

export const importStatementInputSchema = z.object({
  source: statementSourceSchema.default("manual"),
  carrierId: z.string().nullable().optional().default(null),
  fmoParticipantId: z.string().nullable().optional().default(null),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  label: z.string().min(1),
  lines: z.array(statementImportLineSchema).min(1),
});

export const paymentsOverviewSchema = z.object({
  carriers: z.object({ active: z.number().int().nonnegative() }),
  statements: z.object({
    total: z.number().int().nonnegative(),
    imported: z.number().int().nonnegative(),
  }),
});

export type PaymentsParticipantInput = z.infer<
  typeof paymentsParticipantInputSchema
>;
export type BusinessRelationshipInput = z.infer<
  typeof businessRelationshipInputSchema
>;
export type ContractTermInput = z.infer<typeof contractTermInputSchema>;
export type CarrierInput = z.infer<typeof carrierInputSchema>;
export type CarrierStateRateInput = z.infer<typeof carrierStateRateInputSchema>;
export type CarrierStateRateImportRow = z.infer<
  typeof carrierStateRateImportRowSchema
>;
export type ImportCarrierStateRatesInput = z.infer<
  typeof importCarrierStateRatesInputSchema
>;
export type ImportStatementInput = z.infer<typeof importStatementInputSchema>;
export type PaymentsOverviewDto = z.infer<typeof paymentsOverviewSchema>;
export type CompensationTierInput = z.infer<typeof compensationTierInputSchema>;
export type AgentRateGroupInput = z.infer<typeof agentRateGroupInputSchema>;
export type CompensationPlanInput = z.infer<typeof compensationPlanInputSchema>;
export type PlanAssignmentInput = z.infer<typeof planAssignmentInputSchema>;
export type ApplyCompensationPlanInput = z.infer<
  typeof applyCompensationPlanInputSchema
>;

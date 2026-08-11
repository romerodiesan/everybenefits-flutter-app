import { z } from "zod";
import {
  PARTICIPANT_TYPES,
  RATE_UNITS,
  CARRIER_RATE_UNITS,
  RELATIONSHIP_TYPES,
  STATEMENT_SOURCES,
  OVERRIDE_RUN_STATUSES,
  CARRIER_MARKETS,
} from "./types";

export const participantTypeSchema = z.enum(PARTICIPANT_TYPES);
export const relationshipTypeSchema = z.enum(RELATIONSHIP_TYPES);
export const rateUnitSchema = z.enum(RATE_UNITS);
export const carrierRateUnitSchema = z.enum(CARRIER_RATE_UNITS);
export const carrierMarketSchema = z.enum(CARRIER_MARKETS);
export const statementSourceSchema = z.enum(STATEMENT_SOURCES);
export const overrideRunStatusSchema = z.enum(OVERRIDE_RUN_STATUSES);

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
});

export const carrierSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  code: z.string().min(1),
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
  active: z.boolean().optional().default(true),
});

export const contractTermInputSchema = contractTermSchema
  .omit({ id: true })
  .extend({
    carrierId: z.string().nullable().optional().default(null),
    states: z.array(z.string()).optional().default([]),
    productCodes: z.array(z.string()).optional().default([]),
    rateUnit: rateUnitSchema.optional().default("pmpm"),
    effectiveTo: z.string().nullable().optional().default(null),
    active: z.boolean().optional().default(true),
  });

export const carrierInputSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  market: carrierMarketSchema,
  active: z.boolean().optional().default(true),
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

export type PaymentsParticipantInput = z.infer<
  typeof paymentsParticipantInputSchema
>;
export type BusinessRelationshipInput = z.infer<
  typeof businessRelationshipInputSchema
>;
export type ContractTermInput = z.infer<typeof contractTermInputSchema>;
export type CarrierInput = z.infer<typeof carrierInputSchema>;
export type CarrierStateRateInput = z.infer<typeof carrierStateRateInputSchema>;
export type ImportStatementInput = z.infer<typeof importStatementInputSchema>;

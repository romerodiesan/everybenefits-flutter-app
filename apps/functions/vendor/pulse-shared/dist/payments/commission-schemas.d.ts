import { z } from "zod";
export declare const commissionStreamSchema: z.ZodEnum<{
    commission: "commission";
    override: "override";
}>;
export declare const commissionTransactionTypeSchema: z.ZodEnum<{
    COMMISSION: "COMMISSION";
    OVERRIDE: "OVERRIDE";
    BONUS: "BONUS";
    ADJUSTMENT: "ADJUSTMENT";
    CHARGEBACK: "CHARGEBACK";
    RETROACTIVE: "RETROACTIVE";
    OTHER: "OTHER";
}>;
export declare const commissionIssueSeveritySchema: z.ZodEnum<{
    INFO: "INFO";
    WARNING: "WARNING";
    ERROR: "ERROR";
    BLOCKING: "BLOCKING";
}>;
export declare const commissionRunStatusSchema: z.ZodEnum<{
    DRAFT: "DRAFT";
    FILES_UPLOADED: "FILES_UPLOADED";
    PARSING: "PARSING";
    NORMALIZED: "NORMALIZED";
    VALIDATING: "VALIDATING";
    NEEDS_REVIEW: "NEEDS_REVIEW";
    READY_TO_CALCULATE: "READY_TO_CALCULATE";
    CALCULATING: "CALCULATING";
    CALCULATED: "CALCULATED";
    APPROVED: "APPROVED";
    STATEMENTS_GENERATED: "STATEMENTS_GENERATED";
    PUBLISHED: "PUBLISHED";
    NOTIFICATIONS_SENT: "NOTIFICATIONS_SENT";
    COMPLETED: "COMPLETED";
    FAILED: "FAILED";
    CANCELLED: "CANCELLED";
}>;
export declare const partyRefSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    kind: z.ZodLiteral<"agency">;
    orgNodeId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    kind: z.ZodLiteral<"agent">;
    userId: z.ZodString;
}, z.core.$strip>], "kind">;
export declare const moneyCentsSchema: z.ZodNumber;
export declare const commissionRunTotalsSchema: z.ZodObject<{
    receivedCents: z.ZodNumber;
    expectedCents: z.ZodNumber;
    varianceCents: z.ZodNumber;
    downstreamCents: z.ZodNumber;
    retainedCents: z.ZodNumber;
    payableAgenciesCents: z.ZodNumber;
    payableAgentsCents: z.ZodNumber;
    commissionCents: z.ZodNumber;
    overrideCents: z.ZodNumber;
}, z.core.$strip>;
export declare const commissionRunSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    periodStart: z.ZodString;
    periodEnd: z.ZodString;
    status: z.ZodEnum<{
        DRAFT: "DRAFT";
        FILES_UPLOADED: "FILES_UPLOADED";
        PARSING: "PARSING";
        NORMALIZED: "NORMALIZED";
        VALIDATING: "VALIDATING";
        NEEDS_REVIEW: "NEEDS_REVIEW";
        READY_TO_CALCULATE: "READY_TO_CALCULATE";
        CALCULATING: "CALCULATING";
        CALCULATED: "CALCULATED";
        APPROVED: "APPROVED";
        STATEMENTS_GENERATED: "STATEMENTS_GENERATED";
        PUBLISHED: "PUBLISHED";
        NOTIFICATIONS_SENT: "NOTIFICATIONS_SENT";
        COMPLETED: "COMPLETED";
        FAILED: "FAILED";
        CANCELLED: "CANCELLED";
    }>;
    createdBy: z.ZodString;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
    fileCount: z.ZodNumber;
    transactionCount: z.ZodNumber;
    carrierIds: z.ZodArray<z.ZodString>;
    upstreamOrganizationIds: z.ZodArray<z.ZodString>;
    totals: z.ZodObject<{
        receivedCents: z.ZodNumber;
        expectedCents: z.ZodNumber;
        varianceCents: z.ZodNumber;
        downstreamCents: z.ZodNumber;
        retainedCents: z.ZodNumber;
        payableAgenciesCents: z.ZodNumber;
        payableAgentsCents: z.ZodNumber;
        commissionCents: z.ZodNumber;
        overrideCents: z.ZodNumber;
    }, z.core.$strip>;
    errorCount: z.ZodNumber;
    warningCount: z.ZodNumber;
    blockingIssueCount: z.ZodNumber;
    statementCount: z.ZodNumber;
    approvedBy: z.ZodNullable<z.ZodString>;
    approvedAt: z.ZodNullable<z.ZodString>;
    publishedAt: z.ZodNullable<z.ZodString>;
    completedAt: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export declare const createCommissionRunInputSchema: z.ZodObject<{
    name: z.ZodString;
    periodStart: z.ZodString;
    periodEnd: z.ZodString;
}, z.core.$strip>;
export declare const listCommissionRunsInputSchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    cursor: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    status: z.ZodOptional<z.ZodEnum<{
        DRAFT: "DRAFT";
        FILES_UPLOADED: "FILES_UPLOADED";
        PARSING: "PARSING";
        NORMALIZED: "NORMALIZED";
        VALIDATING: "VALIDATING";
        NEEDS_REVIEW: "NEEDS_REVIEW";
        READY_TO_CALCULATE: "READY_TO_CALCULATE";
        CALCULATING: "CALCULATING";
        CALCULATED: "CALCULATED";
        APPROVED: "APPROVED";
        STATEMENTS_GENERATED: "STATEMENTS_GENERATED";
        PUBLISHED: "PUBLISHED";
        NOTIFICATIONS_SENT: "NOTIFICATIONS_SENT";
        COMPLETED: "COMPLETED";
        FAILED: "FAILED";
        CANCELLED: "CANCELLED";
    }>>;
}, z.core.$strip>;
export declare const getCommissionRunInputSchema: z.ZodObject<{
    runId: z.ZodString;
}, z.core.$strip>;
export declare const listCommissionPartiesInputSchema: z.ZodObject<{
    kind: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        agent: "agent";
        agency: "agency";
        all: "all";
    }>>>;
    query: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    cursor: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
}, z.core.$strip>;
export declare const agencyPayModeSchema: z.ZodObject<{
    orgNodeId: z.ZodString;
    payMode: z.ZodEnum<{
        direct: "direct";
        through_agency: "through_agency";
    }>;
    updatedAt: z.ZodOptional<z.ZodString>;
    updatedBy: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const getAgencyPayModeInputSchema: z.ZodObject<{
    orgNodeId: z.ZodString;
}, z.core.$strip>;
export declare const setAgencyPayModeInputSchema: z.ZodObject<{
    orgNodeId: z.ZodString;
    payMode: z.ZodEnum<{
        direct: "direct";
        through_agency: "through_agency";
    }>;
}, z.core.$strip>;
export declare const commissionImportProfileSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    upstreamOrganizationId: z.ZodNullable<z.ZodString>;
    carrierId: z.ZodNullable<z.ZodString>;
    headerMappings: z.ZodArray<z.ZodObject<{
        sourceHeader: z.ZodString;
        targetField: z.ZodString;
    }, z.core.$strip>>;
    dateFormat: z.ZodNullable<z.ZodString>;
    currencyFormat: z.ZodNullable<z.ZodString>;
    requiredColumns: z.ZodArray<z.ZodString>;
    ignoredColumns: z.ZodArray<z.ZodString>;
    active: z.ZodBoolean;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const commissionRuleSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    stream: z.ZodEnum<{
        commission: "commission";
        override: "override";
    }>;
    carrierId: z.ZodNullable<z.ZodString>;
    productId: z.ZodNullable<z.ZodString>;
    state: z.ZodNullable<z.ZodString>;
    party: z.ZodNullable<z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"agency">;
        orgNodeId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        kind: z.ZodLiteral<"agent">;
        userId: z.ZodString;
    }, z.core.$strip>], "kind">>;
    rate: z.ZodNumber;
    rateUnit: z.ZodEnum<{
        flat: "flat";
        pmpm: "pmpm";
        percent: "percent";
    }>;
    effectiveFrom: z.ZodString;
    effectiveTo: z.ZodNullable<z.ZodString>;
    active: z.ZodBoolean;
    currentVersionId: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const commissionSettingsSchema: z.ZodObject<{
    id: z.ZodString;
    absoluteToleranceCents: z.ZodNumber;
    percentageTolerance: z.ZodNumber;
    defaultPayMode: z.ZodEnum<{
        direct: "direct";
        through_agency: "through_agency";
    }>;
    roundingMode: z.ZodLiteral<"half_away_from_zero">;
    updatedAt: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const commissionPartySummarySchema: z.ZodObject<{
    ref: z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"agency">;
        orgNodeId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        kind: z.ZodLiteral<"agent">;
        userId: z.ZodString;
    }, z.core.$strip>], "kind">;
    name: z.ZodString;
    npn: z.ZodNullable<z.ZodString>;
    parentOrgNodeId: z.ZodNullable<z.ZodString>;
    active: z.ZodBoolean;
}, z.core.$strip>;
//# sourceMappingURL=commission-schemas.d.ts.map
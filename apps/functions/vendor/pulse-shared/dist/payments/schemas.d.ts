import { z } from "zod";
export declare const participantTypeSchema: z.ZodEnum<{
    agent: "agent";
    agency: "agency";
}>;
export declare const relationshipTypeSchema: z.ZodEnum<{
    agency_agency: "agency_agency";
    agency_agent: "agency_agent";
    agent_agent: "agent_agent";
}>;
export declare const rateUnitSchema: z.ZodEnum<{
    flat: "flat";
    pmpm: "pmpm";
    percent: "percent";
}>;
export declare const carrierRateUnitSchema: z.ZodEnum<{
    flat: "flat";
    percent: "percent";
}>;
export declare const carrierMarketSchema: z.ZodEnum<{
    aca: "aca";
    medicare: "medicare";
    life: "life";
}>;
export declare const statementSourceSchema: z.ZodEnum<{
    carrier: "carrier";
    fmo: "fmo";
    manual: "manual";
}>;
export declare const overrideRunStatusSchema: z.ZodEnum<{
    pending: "pending";
    running: "running";
    completed: "completed";
    failed: "failed";
}>;
export declare const paymentsParticipantSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodEnum<{
        agent: "agent";
        agency: "agency";
    }>;
    userId: z.ZodNullable<z.ZodString>;
    npn: z.ZodNullable<z.ZodString>;
    linkedOrgNodeId: z.ZodNullable<z.ZodString>;
    active: z.ZodBoolean;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const businessRelationshipSchema: z.ZodObject<{
    id: z.ZodString;
    uplineParticipantId: z.ZodString;
    downlineParticipantId: z.ZodString;
    relationshipType: z.ZodEnum<{
        agency_agency: "agency_agency";
        agency_agent: "agency_agent";
        agent_agent: "agent_agent";
    }>;
    effectiveFrom: z.ZodString;
    effectiveTo: z.ZodNullable<z.ZodString>;
    carrierIds: z.ZodArray<z.ZodString>;
    states: z.ZodArray<z.ZodString>;
    productCodes: z.ZodArray<z.ZodString>;
    retentionFraction: z.ZodDefault<z.ZodNumber>;
    notes: z.ZodNullable<z.ZodString>;
    active: z.ZodBoolean;
}, z.core.$strip>;
export declare const contractTermSchema: z.ZodObject<{
    id: z.ZodString;
    participantId: z.ZodString;
    carrierId: z.ZodNullable<z.ZodString>;
    states: z.ZodArray<z.ZodString>;
    productCodes: z.ZodArray<z.ZodString>;
    rate: z.ZodNumber;
    rateUnit: z.ZodEnum<{
        flat: "flat";
        pmpm: "pmpm";
        percent: "percent";
    }>;
    effectiveFrom: z.ZodString;
    effectiveTo: z.ZodNullable<z.ZodString>;
    active: z.ZodBoolean;
}, z.core.$strip>;
export declare const carrierSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    code: z.ZodString;
    market: z.ZodEnum<{
        aca: "aca";
        medicare: "medicare";
        life: "life";
    }>;
    active: z.ZodBoolean;
}, z.core.$strip>;
export declare const carrierStateRateSchema: z.ZodObject<{
    id: z.ZodString;
    carrierId: z.ZodString;
    state: z.ZodString;
    commissionRate: z.ZodNumber;
    commissionRateUnit: z.ZodEnum<{
        flat: "flat";
        percent: "percent";
    }>;
    overrideRate: z.ZodNumber;
    overrideRateUnit: z.ZodEnum<{
        flat: "flat";
        percent: "percent";
    }>;
    active: z.ZodBoolean;
}, z.core.$strip>;
export declare const statementSchema: z.ZodObject<{
    id: z.ZodString;
    source: z.ZodEnum<{
        carrier: "carrier";
        fmo: "fmo";
        manual: "manual";
    }>;
    carrierId: z.ZodNullable<z.ZodString>;
    fmoParticipantId: z.ZodNullable<z.ZodString>;
    periodStart: z.ZodString;
    periodEnd: z.ZodString;
    label: z.ZodString;
    importedAt: z.ZodString;
    importedBy: z.ZodString;
    lineCount: z.ZodNumber;
    status: z.ZodEnum<{
        draft: "draft";
        imported: "imported";
        reconciled: "reconciled";
    }>;
}, z.core.$strip>;
export declare const statementLineSchema: z.ZodObject<{
    id: z.ZodString;
    statementId: z.ZodString;
    writingProducerParticipantId: z.ZodNullable<z.ZodString>;
    writingProducerNpn: z.ZodNullable<z.ZodString>;
    writingProducerName: z.ZodNullable<z.ZodString>;
    carrierId: z.ZodNullable<z.ZodString>;
    state: z.ZodNullable<z.ZodString>;
    productCode: z.ZodNullable<z.ZodString>;
    memberMonths: z.ZodNumber;
    receivedOverrideAmount: z.ZodNumber;
    carrierRate: z.ZodNullable<z.ZodNumber>;
    productionDate: z.ZodNullable<z.ZodString>;
    externalRef: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export declare const overrideAllocationSchema: z.ZodObject<{
    id: z.ZodString;
    runId: z.ZodString;
    statementLineId: z.ZodString;
    participantId: z.ZodString;
    amount: z.ZodNumber;
    memberMonths: z.ZodNumber;
    rateDelta: z.ZodNumber;
    uplineLevel: z.ZodNumber;
    downlineLevel: z.ZodNumber;
    carrierRate: z.ZodNumber;
    writingProducerLevel: z.ZodNumber;
}, z.core.$strip>;
export declare const reconciliationItemSchema: z.ZodObject<{
    id: z.ZodString;
    runId: z.ZodString;
    statementLineId: z.ZodString;
    participantId: z.ZodNullable<z.ZodString>;
    expectedAmount: z.ZodNumber;
    receivedAmount: z.ZodNumber;
    difference: z.ZodNumber;
}, z.core.$strip>;
export declare const overrideRunSchema: z.ZodObject<{
    id: z.ZodString;
    statementId: z.ZodString;
    status: z.ZodEnum<{
        pending: "pending";
        running: "running";
        completed: "completed";
        failed: "failed";
    }>;
    startedAt: z.ZodString;
    completedAt: z.ZodNullable<z.ZodString>;
    error: z.ZodNullable<z.ZodString>;
    allocationCount: z.ZodNumber;
    expectedTotal: z.ZodNumber;
    receivedTotal: z.ZodNumber;
    differenceTotal: z.ZodNumber;
    createdBy: z.ZodString;
}, z.core.$strip>;
/** Input for creating/updating a participant (id optional on create). */
export declare const paymentsParticipantInputSchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodEnum<{
        agent: "agent";
        agency: "agency";
    }>;
    userId: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    npn: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    linkedOrgNodeId: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    active: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
/** relationshipType is derived server-side; client may omit it. */
export declare const businessRelationshipInputSchema: z.ZodObject<{
    uplineParticipantId: z.ZodString;
    downlineParticipantId: z.ZodString;
    relationshipType: z.ZodOptional<z.ZodEnum<{
        agency_agency: "agency_agency";
        agency_agent: "agency_agent";
        agent_agent: "agent_agent";
    }>>;
    effectiveFrom: z.ZodString;
    effectiveTo: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    carrierIds: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    states: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    productCodes: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    retentionFraction: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    notes: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    active: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const contractTermInputSchema: z.ZodObject<{
    effectiveFrom: z.ZodString;
    participantId: z.ZodString;
    rate: z.ZodNumber;
    carrierId: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    states: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    productCodes: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    rateUnit: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        flat: "flat";
        pmpm: "pmpm";
        percent: "percent";
    }>>>;
    effectiveTo: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    active: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const carrierInputSchema: z.ZodObject<{
    name: z.ZodString;
    code: z.ZodString;
    market: z.ZodEnum<{
        aca: "aca";
        medicare: "medicare";
        life: "life";
    }>;
    active: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const carrierStateRateInputSchema: z.ZodObject<{
    carrierId: z.ZodString;
    state: z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>, z.ZodString>;
    commissionRate: z.ZodNumber;
    commissionRateUnit: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        flat: "flat";
        percent: "percent";
    }>>>;
    overrideRate: z.ZodNumber;
    overrideRateUnit: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        flat: "flat";
        percent: "percent";
    }>>>;
    active: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
/** Normalized CSV/JSON line for statement import (v1). */
export declare const statementImportLineSchema: z.ZodObject<{
    writingProducerParticipantId: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    writingProducerNpn: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    writingProducerName: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    carrierId: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    state: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    productCode: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    memberMonths: z.ZodNumber;
    receivedOverrideAmount: z.ZodDefault<z.ZodNumber>;
    carrierRate: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    productionDate: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    externalRef: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
}, z.core.$strip>;
export declare const importStatementInputSchema: z.ZodObject<{
    source: z.ZodDefault<z.ZodEnum<{
        carrier: "carrier";
        fmo: "fmo";
        manual: "manual";
    }>>;
    carrierId: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    fmoParticipantId: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    periodStart: z.ZodString;
    periodEnd: z.ZodString;
    label: z.ZodString;
    lines: z.ZodArray<z.ZodObject<{
        writingProducerParticipantId: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        writingProducerNpn: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        writingProducerName: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        carrierId: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        state: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        productCode: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        memberMonths: z.ZodNumber;
        receivedOverrideAmount: z.ZodDefault<z.ZodNumber>;
        carrierRate: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
        productionDate: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        externalRef: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type PaymentsParticipantInput = z.infer<typeof paymentsParticipantInputSchema>;
export type BusinessRelationshipInput = z.infer<typeof businessRelationshipInputSchema>;
export type ContractTermInput = z.infer<typeof contractTermInputSchema>;
export type CarrierInput = z.infer<typeof carrierInputSchema>;
export type CarrierStateRateInput = z.infer<typeof carrierStateRateInputSchema>;
export type ImportStatementInput = z.infer<typeof importStatementInputSchema>;
//# sourceMappingURL=schemas.d.ts.map
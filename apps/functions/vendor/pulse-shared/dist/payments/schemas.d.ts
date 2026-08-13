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
export declare const relationshipSourceSchema: z.ZodEnum<{
    manual: "manual";
    org_hierarchy: "org_hierarchy";
}>;
export declare const rateUnitSchema: z.ZodEnum<{
    flat: "flat";
    pmpm: "pmpm";
    percent: "percent";
}>;
export declare const carrierRateUnitSchema: z.ZodEnum<{
    flat: "flat";
    pmpm: "pmpm";
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
export declare const compensationTierKindSchema: z.ZodEnum<{
    agent: "agent";
    agency: "agency";
    generic: "generic";
}>;
export declare const payModeSchema: z.ZodEnum<{
    direct: "direct";
    through_agency: "through_agency";
}>;
export declare const planSlotRoleSchema: z.ZodEnum<{
    agency_root: "agency_root";
    agency_child: "agency_child";
    agent_default: "agent_default";
    agent_group: "agent_group";
    agent_override: "agent_override";
}>;
/** Exactly four digits, stored as string (e.g. "0123"). */
export declare const carrierCodeSchema: z.ZodString;
/**
 * Coerce Excel/JSON values to a 4-digit carrier code string.
 * Numbers like 1001 → "1001"; rejects padding invention for short values.
 */
export declare function normalizeCarrierCode(value: unknown): string | null;
/** Map spreadsheet unit labels onto pmpm | flat | percent. */
export declare function normalizeCarrierRateUnit(value: unknown): "pmpm" | "flat" | "percent" | null;
/**
 * Fix common spreadsheet mistakes: swapped rate/unit columns, missing unit
 * (inherit from the other rate), case/aliases.
 */
export declare function sanitizeCarrierStateRateImportRow(row: Record<string, unknown>): Record<string, unknown>;
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
    source: z.ZodDefault<z.ZodEnum<{
        manual: "manual";
        org_hierarchy: "org_hierarchy";
    }>>;
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
    sourcePlanId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    sourceAssignmentId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const compensationTierSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    rate: z.ZodNumber;
    rateUnit: z.ZodEnum<{
        flat: "flat";
        pmpm: "pmpm";
        percent: "percent";
    }>;
    kind: z.ZodEnum<{
        agent: "agent";
        agency: "agency";
        generic: "generic";
    }>;
    active: z.ZodBoolean;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const agentRateGroupSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    memberParticipantIds: z.ZodArray<z.ZodString>;
    active: z.ZodBoolean;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const compensationPlanSlotSchema: z.ZodObject<{
    role: z.ZodEnum<{
        agency_root: "agency_root";
        agency_child: "agency_child";
        agent_default: "agent_default";
        agent_group: "agent_group";
        agent_override: "agent_override";
    }>;
    tierId: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    rate: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    rateUnit: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        flat: "flat";
        pmpm: "pmpm";
        percent: "percent";
    }>>>;
    agentRateGroupId: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    participantIds: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
}, z.core.$strip>;
export declare const compensationPlanSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    carrierIds: z.ZodArray<z.ZodString>;
    slots: z.ZodArray<z.ZodObject<{
        role: z.ZodEnum<{
            agency_root: "agency_root";
            agency_child: "agency_child";
            agent_default: "agent_default";
            agent_group: "agent_group";
            agent_override: "agent_override";
        }>;
        tierId: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        rate: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
        rateUnit: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            flat: "flat";
            pmpm: "pmpm";
            percent: "percent";
        }>>>;
        agentRateGroupId: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        participantIds: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    }, z.core.$strip>>;
    payModeDefault: z.ZodEnum<{
        direct: "direct";
        through_agency: "through_agency";
    }>;
    retentionFractionDefault: z.ZodNumber;
    effectiveFrom: z.ZodString;
    effectiveTo: z.ZodNullable<z.ZodString>;
    active: z.ZodBoolean;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const planAssignmentSchema: z.ZodObject<{
    id: z.ZodString;
    planId: z.ZodString;
    agencyParticipantIds: z.ZodArray<z.ZodString>;
    includeDescendantAgencies: z.ZodBoolean;
    agentParticipantIds: z.ZodArray<z.ZodString>;
    payMode: z.ZodNullable<z.ZodEnum<{
        direct: "direct";
        through_agency: "through_agency";
    }>>;
    retentionFraction: z.ZodNullable<z.ZodNumber>;
    agentPayModeOverrides: z.ZodArray<z.ZodObject<{
        participantId: z.ZodString;
        payMode: z.ZodEnum<{
            direct: "direct";
            through_agency: "through_agency";
        }>;
    }, z.core.$strip>>;
    effectiveFrom: z.ZodNullable<z.ZodString>;
    active: z.ZodBoolean;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const paymentRoutingSchema: z.ZodObject<{
    id: z.ZodString;
    participantId: z.ZodString;
    payMode: z.ZodEnum<{
        direct: "direct";
        through_agency: "through_agency";
    }>;
    payeeParticipantId: z.ZodString;
    planId: z.ZodNullable<z.ZodString>;
    assignmentId: z.ZodNullable<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
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
        pmpm: "pmpm";
        percent: "percent";
    }>;
    overrideRate: z.ZodNumber;
    overrideRateUnit: z.ZodEnum<{
        flat: "flat";
        pmpm: "pmpm";
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
    source: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        manual: "manual";
        org_hierarchy: "org_hierarchy";
    }>>>;
    active: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const contractTermInputSchema: z.ZodObject<{
    effectiveFrom: z.ZodString;
    participantId: z.ZodString;
    rate: z.ZodNumber;
    carrierId: z.ZodString;
    states: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    productCodes: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    rateUnit: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        flat: "flat";
        pmpm: "pmpm";
        percent: "percent";
    }>>>;
    effectiveTo: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    active: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    sourcePlanId: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    sourceAssignmentId: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
}, z.core.$strip>;
export declare const compensationTierInputSchema: z.ZodObject<{
    name: z.ZodString;
    rate: z.ZodNumber;
    rateUnit: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        flat: "flat";
        pmpm: "pmpm";
        percent: "percent";
    }>>>;
    kind: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        agent: "agent";
        agency: "agency";
        generic: "generic";
    }>>>;
    active: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const agentRateGroupInputSchema: z.ZodObject<{
    name: z.ZodString;
    memberParticipantIds: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    active: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const compensationPlanInputSchema: z.ZodObject<{
    name: z.ZodString;
    carrierIds: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    slots: z.ZodArray<z.ZodObject<{
        role: z.ZodEnum<{
            agency_root: "agency_root";
            agency_child: "agency_child";
            agent_default: "agent_default";
            agent_group: "agent_group";
            agent_override: "agent_override";
        }>;
        tierId: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        rate: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
        rateUnit: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            flat: "flat";
            pmpm: "pmpm";
            percent: "percent";
        }>>>;
        agentRateGroupId: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        participantIds: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    }, z.core.$strip>>;
    payModeDefault: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        direct: "direct";
        through_agency: "through_agency";
    }>>>;
    retentionFractionDefault: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    effectiveFrom: z.ZodString;
    effectiveTo: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    active: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const planAssignmentInputSchema: z.ZodObject<{
    planId: z.ZodString;
    agencyParticipantIds: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    includeDescendantAgencies: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    agentParticipantIds: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    payMode: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodEnum<{
        direct: "direct";
        through_agency: "through_agency";
    }>>>>;
    retentionFraction: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    agentPayModeOverrides: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        participantId: z.ZodString;
        payMode: z.ZodEnum<{
            direct: "direct";
            through_agency: "through_agency";
        }>;
    }, z.core.$strip>>>>;
    effectiveFrom: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    active: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const applyCompensationPlanInputSchema: z.ZodObject<{
    planId: z.ZodString;
    assignmentId: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    agencyParticipantIds: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    includeDescendantAgencies: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    agentParticipantIds: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    carrierIds: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    payMode: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodEnum<{
        direct: "direct";
        through_agency: "through_agency";
    }>>>>;
    retentionFraction: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    agentPayModeOverrides: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        participantId: z.ZodString;
        payMode: z.ZodEnum<{
            direct: "direct";
            through_agency: "through_agency";
        }>;
    }, z.core.$strip>>>>;
    effectiveFrom: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
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
export declare const carrierStateRateImportRowSchema: z.ZodPreprocess<z.ZodObject<{
    carrier_code: z.ZodPreprocess<z.ZodString>;
    carrier_name: z.ZodPreprocess<z.ZodString>;
    state: z.ZodPreprocess<z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>, z.ZodString>>;
    commission_rate: z.ZodCoercedNumber<unknown>;
    commission_unit: z.ZodPreprocess<z.ZodEnum<{
        flat: "flat";
        pmpm: "pmpm";
        percent: "percent";
    }>>;
    override_rate: z.ZodCoercedNumber<unknown>;
    override_unit: z.ZodPreprocess<z.ZodEnum<{
        flat: "flat";
        pmpm: "pmpm";
        percent: "percent";
    }>>;
    active: z.ZodPreprocess<z.ZodPipe<z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodEnum<{
        0: "0";
        1: "1";
        true: "true";
        false: "false";
        TRUE: "TRUE";
        FALSE: "FALSE";
        yes: "yes";
        no: "no";
    }>]>>, z.ZodTransform<boolean, boolean | "0" | "1" | "true" | "false" | "TRUE" | "FALSE" | "yes" | "no" | undefined>>>;
    market: z.ZodPreprocess<z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        aca: "aca";
        medicare: "medicare";
        life: "life";
    }>>>>;
}, z.core.$strip>>;
export declare const importCarrierStateRatesInputSchema: z.ZodObject<{
    rows: z.ZodArray<z.ZodPreprocess<z.ZodObject<{
        carrier_code: z.ZodPreprocess<z.ZodString>;
        carrier_name: z.ZodPreprocess<z.ZodString>;
        state: z.ZodPreprocess<z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>, z.ZodString>>;
        commission_rate: z.ZodCoercedNumber<unknown>;
        commission_unit: z.ZodPreprocess<z.ZodEnum<{
            flat: "flat";
            pmpm: "pmpm";
            percent: "percent";
        }>>;
        override_rate: z.ZodCoercedNumber<unknown>;
        override_unit: z.ZodPreprocess<z.ZodEnum<{
            flat: "flat";
            pmpm: "pmpm";
            percent: "percent";
        }>>;
        active: z.ZodPreprocess<z.ZodPipe<z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodEnum<{
            0: "0";
            1: "1";
            true: "true";
            false: "false";
            TRUE: "TRUE";
            FALSE: "FALSE";
            yes: "yes";
            no: "no";
        }>]>>, z.ZodTransform<boolean, boolean | "0" | "1" | "true" | "false" | "TRUE" | "FALSE" | "yes" | "no" | undefined>>>;
        market: z.ZodPreprocess<z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            aca: "aca";
            medicare: "medicare";
            life: "life";
        }>>>>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const carrierStateRateInputSchema: z.ZodObject<{
    carrierId: z.ZodString;
    state: z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>, z.ZodString>;
    commissionRate: z.ZodNumber;
    commissionRateUnit: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        flat: "flat";
        pmpm: "pmpm";
        percent: "percent";
    }>>>;
    overrideRate: z.ZodNumber;
    overrideRateUnit: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        flat: "flat";
        pmpm: "pmpm";
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
export declare const paymentsOverviewSchema: z.ZodObject<{
    carriers: z.ZodObject<{
        active: z.ZodNumber;
    }, z.core.$strip>;
    statements: z.ZodObject<{
        total: z.ZodNumber;
        imported: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>;
export type PaymentsParticipantInput = z.infer<typeof paymentsParticipantInputSchema>;
export type BusinessRelationshipInput = z.infer<typeof businessRelationshipInputSchema>;
export type ContractTermInput = z.infer<typeof contractTermInputSchema>;
export type CarrierInput = z.infer<typeof carrierInputSchema>;
export type CarrierStateRateInput = z.infer<typeof carrierStateRateInputSchema>;
export type CarrierStateRateImportRow = z.infer<typeof carrierStateRateImportRowSchema>;
export type ImportCarrierStateRatesInput = z.infer<typeof importCarrierStateRatesInputSchema>;
export type ImportStatementInput = z.infer<typeof importStatementInputSchema>;
export type PaymentsOverviewDto = z.infer<typeof paymentsOverviewSchema>;
export type CompensationTierInput = z.infer<typeof compensationTierInputSchema>;
export type AgentRateGroupInput = z.infer<typeof agentRateGroupInputSchema>;
export type CompensationPlanInput = z.infer<typeof compensationPlanInputSchema>;
export type PlanAssignmentInput = z.infer<typeof planAssignmentInputSchema>;
export type ApplyCompensationPlanInput = z.infer<typeof applyCompensationPlanInputSchema>;
//# sourceMappingURL=schemas.d.ts.map
/**
 * Commission module domain types (ADR-008).
 * Identity = Pulse orgNodes + users (PartyRef). No paymentsParticipants sync.
 * Streams: commission + override (both first-class).
 */
import type { MoneyCents } from "./money";
import type { CommissionRunStatus } from "./commission-status";
import type { PayMode, RateUnit } from "./types";
export declare const COMMISSION_STREAMS: readonly ["commission", "override"];
export type CommissionStream = (typeof COMMISSION_STREAMS)[number];
export declare const COMMISSION_TRANSACTION_TYPES: readonly ["COMMISSION", "OVERRIDE", "BONUS", "ADJUSTMENT", "CHARGEBACK", "RETROACTIVE", "OTHER"];
export type CommissionTransactionType = (typeof COMMISSION_TRANSACTION_TYPES)[number];
export declare const COMMISSION_ISSUE_SEVERITIES: readonly ["INFO", "WARNING", "ERROR", "BLOCKING"];
export type CommissionIssueSeverity = (typeof COMMISSION_ISSUE_SEVERITIES)[number];
export type PartyRef = {
    kind: "agency";
    orgNodeId: string;
} | {
    kind: "agent";
    userId: string;
};
export type CommissionPartySummary = {
    ref: PartyRef;
    name: string;
    npn: string | null;
    /** For agents: home agency orgNodeId. For agencies: parentId. */
    parentOrgNodeId: string | null;
    active: boolean;
    /** Present when listing agencies: eligible agents under this org node. */
    agentCount?: number;
    /** Present when listing agencies: statement remittance mode. */
    payMode?: PayMode;
    /** True when payMode comes from commissionSettings default. */
    payModeIsDefault?: boolean;
};
export type CommissionRunTotals = {
    receivedCents: MoneyCents | number;
    expectedCents: MoneyCents | number;
    varianceCents: MoneyCents | number;
    downstreamCents: MoneyCents | number;
    retainedCents: MoneyCents | number;
    payableAgenciesCents: MoneyCents | number;
    payableAgentsCents: MoneyCents | number;
    commissionCents: MoneyCents | number;
    overrideCents: MoneyCents | number;
};
export type CommissionRun = {
    id: string;
    name: string;
    periodStart: string;
    periodEnd: string;
    status: CommissionRunStatus;
    createdBy: string;
    createdAt?: string;
    updatedAt?: string;
    fileCount: number;
    transactionCount: number;
    carrierIds: string[];
    upstreamOrganizationIds: string[];
    totals: CommissionRunTotals;
    errorCount: number;
    warningCount: number;
    blockingIssueCount: number;
    statementCount: number;
    approvedBy: string | null;
    approvedAt: string | null;
    publishedAt: string | null;
    completedAt: string | null;
};
export type CommissionSourceFile = {
    id: string;
    runId: string;
    filename: string;
    byteSize: number;
    format: "csv" | "xlsx";
    storagePath: string;
    importProfileId: string | null;
    upstreamOrganizationId: string | null;
    carrierId: string | null;
    status: "uploaded" | "detecting" | "mapped" | "parsing" | "normalized" | "failed";
    rowCount: number;
    errorCount: number;
    contentFingerprint: string | null;
    createdAt?: string;
    updatedAt?: string;
};
export type CommissionImportProfile = {
    id: string;
    name: string;
    description: string | null;
    upstreamOrganizationId: string | null;
    carrierId: string | null;
    headerMappings: Array<{
        sourceHeader: string;
        targetField: string;
    }>;
    dateFormat: string | null;
    currencyFormat: string | null;
    requiredColumns: string[];
    ignoredColumns: string[];
    active: boolean;
    createdAt?: string;
    updatedAt?: string;
};
export type CommissionTransaction = {
    id: string;
    runId: string;
    sourceFileId: string;
    sourceRowNumber: number;
    fingerprint: string;
    carrierId: string | null;
    upstreamOrganizationId: string | null;
    policyNumber: string | null;
    memberId: string | null;
    memberName: string | null;
    agentUserId: string | null;
    agencyOrgNodeId: string | null;
    externalAgentId: string | null;
    externalAgencyId: string | null;
    productId: string | null;
    productName: string | null;
    effectiveDate: string | null;
    transactionDate: string | null;
    statementPeriod: string | null;
    transactionType: CommissionTransactionType;
    stream: CommissionStream;
    receivedCents: MoneyCents | number;
    expectedCents: MoneyCents | number | null;
    varianceCents: MoneyCents | number | null;
    downstreamCents: MoneyCents | number | null;
    retainedCents: MoneyCents | number | null;
    calculationMethod: string | null;
    status: "pending" | "valid" | "invalid" | "resolved" | "ignored";
    validationIssueIds: string[];
};
export type CommissionRule = {
    id: string;
    name: string;
    stream: CommissionStream;
    carrierId: string | null;
    productId: string | null;
    state: string | null;
    party: PartyRef | null;
    rate: number;
    rateUnit: RateUnit;
    effectiveFrom: string;
    effectiveTo: string | null;
    active: boolean;
    currentVersionId: string | null;
    createdAt?: string;
    updatedAt?: string;
};
export type CommissionRuleVersion = {
    id: string;
    ruleId: string;
    version: number;
    snapshot: Record<string, unknown>;
    createdAt?: string;
    createdBy: string;
};
export type CommissionValidationIssue = {
    id: string;
    runId: string;
    transactionId: string | null;
    sourceFileId: string | null;
    severity: CommissionIssueSeverity;
    code: string;
    message: string;
    receivedValue: string | null;
    expectedValue: string | null;
    suggestedAction: string | null;
    resolved: boolean;
    resolvedBy: string | null;
    resolvedAt: string | null;
    resolutionNote: string | null;
};
export type CommissionCalculation = {
    id: string;
    runId: string;
    version: number;
    status: "running" | "succeeded" | "failed";
    ruleVersionIds: string[];
    hierarchySnapshot: unknown;
    totals: CommissionRunTotals;
    startedAt?: string;
    completedAt?: string | null;
    error: string | null;
    createdBy: string;
};
export type CommissionAllocation = {
    id: string;
    runId: string;
    calculationId: string;
    transactionId: string;
    stream: CommissionStream;
    party: PartyRef;
    amountCents: MoneyCents | number;
    breakdown: Record<string, unknown>;
};
export type CommissionStatement = {
    id: string;
    runId: string;
    calculationId: string;
    recipient: PartyRef;
    periodStart: string;
    periodEnd: string;
    grossCommissionCents: MoneyCents | number;
    overrideCents: MoneyCents | number;
    adjustmentCents: MoneyCents | number;
    chargebackCents: MoneyCents | number;
    netCents: MoneyCents | number;
    currentVersionId: string | null;
    publishedAt: string | null;
    createdAt?: string;
};
export type CommissionStatementVersion = {
    id: string;
    statementId: string;
    version: number;
    reason: string | null;
    pdfStoragePath: string | null;
    xlsxStoragePath: string | null;
    csvStoragePath: string | null;
    generatedAt?: string;
    generatedBy: string;
};
export type CommissionNotification = {
    id: string;
    runId: string;
    statementId: string;
    recipientUserId: string;
    status: "pending" | "sent" | "failed";
    attempts: number;
    sentAt: string | null;
    lastError: string | null;
};
export type CommissionAuditEvent = {
    id: string;
    runId: string | null;
    timestamp?: string;
    userId: string | null;
    action: string;
    entityType: string;
    entityId: string | null;
    before: unknown;
    after: unknown;
    metadata: Record<string, unknown> | null;
};
export type CommissionSettings = {
    id: string;
    absoluteToleranceCents: number;
    percentageTolerance: number;
    defaultPayMode: PayMode;
    roundingMode: "half_away_from_zero";
    updatedAt?: string;
};
/** Agency-level remittance config keyed by orgNodeId (ADR-008). */
export type AgencyPayMode = {
    orgNodeId: string;
    payMode: PayMode;
    updatedAt?: string;
    updatedBy?: string;
};
export declare function emptyCommissionRunTotals(): CommissionRunTotals;
export declare function partyRefKey(ref: PartyRef): string;
//# sourceMappingURL=commission-types.d.ts.map
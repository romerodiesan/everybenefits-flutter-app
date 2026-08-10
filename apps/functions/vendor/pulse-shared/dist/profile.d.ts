/**
 * Shared profile field validation / normalization for Pulse clients.
 */
/** True when license profile fields are required for this role/permission set. */
export declare function requiresLicenseProfile(roleOrPermissions: string | readonly string[] | null | undefined): boolean;
/** True when the string looks like an email used as a display name. */
export declare function looksLikeEmailName(value: string): boolean;
/**
 * Title-cases a person name when it is ALL CAPS or all lowercase.
 * Leaves mixed-case names alone (preserves intentional casing like McDonald).
 */
export declare function normalizePersonName(raw: string): string;
export type DisplayNameIssue = "empty" | "too_short" | "need_last_name" | "email_as_name";
export declare function validateDisplayName(raw: string): {
    ok: true;
    value: string;
} | {
    ok: false;
    issue: DisplayNameIssue;
};
export type NpnIssue = "empty" | "invalid";
export declare function validateNpn(raw: string | null | undefined): {
    ok: true;
    value: string;
} | {
    ok: false;
    issue: NpnIssue;
};
export declare function validateUsState(raw: string): string | null;
export declare function validateUsZip(raw: string): string | null;
export type ApprovalStatus = "pending" | "approved" | "rejected";
export declare function parseApprovalStatus(value: unknown): ApprovalStatus | null;
/**
 * Legacy users (no approvalStatus field) are treated as approved.
 * Only newly registered users are written with `pending`.
 */
export declare function isUserApproved(approvalStatus: unknown): boolean;
export type ProfileCompletenessInput = {
    isAnonymous?: boolean;
    role: string;
    displayName: string | null | undefined;
    profileCompleted?: boolean;
    npn?: string | null;
    addressStreet?: string | null;
    addressCity?: string | null;
    addressState?: string | null;
    addressZip?: string | null;
};
/** Temporary remediation: force incomplete / invalid profiles back to the form. */
export declare function needsProfileCompletion(input: ProfileCompletenessInput): boolean;
/** Display name for UI chrome (profile / chats / forums). */
export declare function headlineName(profile: {
    displayName: string | null;
    email: string | null;
    isAnonymous: boolean;
}): string;
/** Compose a US mailing address string from structured fields. */
export declare function composeUsAddress(parts: {
    street?: string | null;
    apt?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
}): string | null;
//# sourceMappingURL=profile.d.ts.map
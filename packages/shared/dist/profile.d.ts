/**
 * Shared profile field validation / normalization for Pulse clients.
 */
/** Public bio on `users/{uid}` / `publicProfiles/{uid}`. */
export declare const PUBLIC_BIO_MAX = 280;
export { APPEARANCE_ACCENTS, APPEARANCE_ACCENT_HEX, PROFILE_BADGE_ICONS, PROFILE_BADGE_ICON_MAX, PROFILE_BADGE_TEXT_MAX, appearanceAccentFrom, isAppearanceAccent, isProfileBadgeIcon, parseAppearanceAccent, parseBadgeColorToken, parseProfileBadgeConfig, parsePublicProfileBadge, resolveBadgeBackgroundColor, sanitizeProfileBadgeInput, toPublicProfileBadge, type AppearanceAccent, type ProfileBadgeConfig, type ProfileBadgeIcon, type PublicProfileBadge, } from "./profile-badge";
/** True when license profile fields are required for this role/permission set. */
export declare function requiresLicenseProfile(roleOrPermissions: string | readonly string[] | null | undefined): boolean;
/** True when the string looks like an email used as a display name. */
export declare function looksLikeEmailName(value: string): boolean;
/**
 * Title-cases a person name when it is ALL CAPS or all lowercase.
 * Leaves mixed-case names alone (preserves intentional casing like McDonald).
 */
export declare function normalizePersonName(raw: string): string;
/** Last token is family name; everything before is given name (allows middle initials). */
export declare function splitDisplayName(raw: string): {
    givenName: string;
    familyName: string;
};
export declare function composeDisplayName(givenName: string, familyName: string): string;
/** Fold accents and lowercase for Firestore search keys. */
export declare function foldSearchText(raw: string): string;
/**
 * Edge prefixes for `array-contains` search ("gar" → Gabriela Garrido).
 * Accent-insensitive; strips punctuation.
 */
export declare function edgeSearchPrefixes(raw: string, minLen?: number, maxLen?: number): string[];
/**
 * Search tokens for Firestore `array-contains` (name parts + email local-part).
 * Stores edge prefixes so partial typing works at 10k+ users without a full scan.
 */
export declare function nameSearchTokens(displayName: string | null | undefined, email?: string | null, username?: string | null): string[];
/** Normalize a user-typed query token for `nameTokens` lookup. */
export declare function normalizeSearchQueryToken(raw: string): string;
/** Fields to keep in sync whenever displayName / email changes. */
export declare function displayNameSearchFields(displayName: string | null | undefined, email?: string | null, username?: string | null): {
    displayName: string | null;
    displayNameLower: string | null;
    nameTokens: string[];
};
/** Full user search index payload (name + emailLower + username tokens). */
export declare function userSearchIndexFields(displayName: string | null | undefined, email?: string | null, username?: string | null): {
    displayName: string | null;
    displayNameLower: string | null;
    emailLower: string | null;
    nameTokens: string[];
};
export type DisplayNameIssue = "empty" | "too_short" | "need_last_name" | "email_as_name";
export declare function validateGivenName(raw: string): {
    ok: true;
    value: string;
} | {
    ok: false;
    issue: DisplayNameIssue;
};
export declare function validateFamilyName(raw: string): {
    ok: true;
    value: string;
} | {
    ok: false;
    issue: DisplayNameIssue;
};
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
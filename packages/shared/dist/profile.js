"use strict";
/**
 * Shared profile field validation / normalization for Pulse clients.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPublicProfileBadge = exports.sanitizeProfileBadgeInput = exports.resolveBadgeBackgroundColor = exports.parsePublicProfileBadge = exports.parseProfileBadgeConfig = exports.parseBadgeColorToken = exports.parseAppearanceAccent = exports.isProfileBadgeIcon = exports.isAppearanceAccent = exports.appearanceAccentFrom = exports.PROFILE_BADGE_TEXT_MAX = exports.PROFILE_BADGE_ICON_MAX = exports.PROFILE_BADGE_ICONS = exports.APPEARANCE_ACCENT_HEX = exports.APPEARANCE_ACCENTS = exports.PUBLIC_BIO_MAX = void 0;
exports.requiresLicenseProfile = requiresLicenseProfile;
exports.looksLikeEmailName = looksLikeEmailName;
exports.normalizePersonName = normalizePersonName;
exports.splitDisplayName = splitDisplayName;
exports.composeDisplayName = composeDisplayName;
exports.foldSearchText = foldSearchText;
exports.edgeSearchPrefixes = edgeSearchPrefixes;
exports.nameSearchTokens = nameSearchTokens;
exports.normalizeSearchQueryToken = normalizeSearchQueryToken;
exports.displayNameSearchFields = displayNameSearchFields;
exports.userSearchIndexFields = userSearchIndexFields;
exports.validateGivenName = validateGivenName;
exports.validateFamilyName = validateFamilyName;
exports.validateDisplayName = validateDisplayName;
exports.validateNpn = validateNpn;
exports.validateUsState = validateUsState;
exports.validateUsZip = validateUsZip;
exports.parseApprovalStatus = parseApprovalStatus;
exports.isUserApproved = isUserApproved;
exports.needsProfileCompletion = needsProfileCompletion;
exports.headlineName = headlineName;
exports.composeUsAddress = composeUsAddress;
/** Public bio on `users/{uid}` / `publicProfiles/{uid}`. */
exports.PUBLIC_BIO_MAX = 280;
var profile_badge_1 = require("./profile-badge");
Object.defineProperty(exports, "APPEARANCE_ACCENTS", { enumerable: true, get: function () { return profile_badge_1.APPEARANCE_ACCENTS; } });
Object.defineProperty(exports, "APPEARANCE_ACCENT_HEX", { enumerable: true, get: function () { return profile_badge_1.APPEARANCE_ACCENT_HEX; } });
Object.defineProperty(exports, "PROFILE_BADGE_ICONS", { enumerable: true, get: function () { return profile_badge_1.PROFILE_BADGE_ICONS; } });
Object.defineProperty(exports, "PROFILE_BADGE_ICON_MAX", { enumerable: true, get: function () { return profile_badge_1.PROFILE_BADGE_ICON_MAX; } });
Object.defineProperty(exports, "PROFILE_BADGE_TEXT_MAX", { enumerable: true, get: function () { return profile_badge_1.PROFILE_BADGE_TEXT_MAX; } });
Object.defineProperty(exports, "appearanceAccentFrom", { enumerable: true, get: function () { return profile_badge_1.appearanceAccentFrom; } });
Object.defineProperty(exports, "isAppearanceAccent", { enumerable: true, get: function () { return profile_badge_1.isAppearanceAccent; } });
Object.defineProperty(exports, "isProfileBadgeIcon", { enumerable: true, get: function () { return profile_badge_1.isProfileBadgeIcon; } });
Object.defineProperty(exports, "parseAppearanceAccent", { enumerable: true, get: function () { return profile_badge_1.parseAppearanceAccent; } });
Object.defineProperty(exports, "parseBadgeColorToken", { enumerable: true, get: function () { return profile_badge_1.parseBadgeColorToken; } });
Object.defineProperty(exports, "parseProfileBadgeConfig", { enumerable: true, get: function () { return profile_badge_1.parseProfileBadgeConfig; } });
Object.defineProperty(exports, "parsePublicProfileBadge", { enumerable: true, get: function () { return profile_badge_1.parsePublicProfileBadge; } });
Object.defineProperty(exports, "resolveBadgeBackgroundColor", { enumerable: true, get: function () { return profile_badge_1.resolveBadgeBackgroundColor; } });
Object.defineProperty(exports, "sanitizeProfileBadgeInput", { enumerable: true, get: function () { return profile_badge_1.sanitizeProfileBadgeInput; } });
Object.defineProperty(exports, "toPublicProfileBadge", { enumerable: true, get: function () { return profile_badge_1.toPublicProfileBadge; } });
const permissions_1 = require("./permissions");
const EMAIL_LIKE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const NPN_DIGITS = /^\d{7,9}$/;
const NAME_LETTERS = /[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g;
/** True when license profile fields are required for this role/permission set. */
function requiresLicenseProfile(roleOrPermissions) {
    return (0, permissions_1.hasPermission)((0, permissions_1.resolvePermissionSet)(roleOrPermissions), "license.profile.required");
}
/** True when the string looks like an email used as a display name. */
function looksLikeEmailName(value) {
    return EMAIL_LIKE.test(value.trim());
}
function letterCount(part) {
    return part.replace(NAME_LETTERS, "").length;
}
/**
 * Title-cases a person name when it is ALL CAPS or all lowercase.
 * Leaves mixed-case names alone (preserves intentional casing like McDonald).
 */
function normalizePersonName(raw) {
    const trimmed = raw.trim().replace(/\s+/g, " ");
    if (!trimmed)
        return "";
    const letters = trimmed.replace(NAME_LETTERS, "");
    if (!letters)
        return trimmed;
    const allUpper = letters === letters.toUpperCase();
    const allLower = letters === letters.toLowerCase();
    if (!allUpper && !allLower)
        return trimmed;
    return trimmed
        .split(" ")
        .map((word) => {
        if (!word)
            return word;
        const lower = word.toLocaleLowerCase("en-US");
        return lower.charAt(0).toLocaleUpperCase("en-US") + lower.slice(1);
    })
        .join(" ");
}
/** Last token is family name; everything before is given name (allows middle initials). */
function splitDisplayName(raw) {
    const value = normalizePersonName(raw);
    const parts = value.split(" ").filter(Boolean);
    if (parts.length === 0)
        return { givenName: "", familyName: "" };
    if (parts.length === 1)
        return { givenName: parts[0], familyName: "" };
    return {
        givenName: parts.slice(0, -1).join(" "),
        familyName: parts[parts.length - 1],
    };
}
function composeDisplayName(givenName, familyName) {
    return normalizePersonName([givenName.trim(), familyName.trim()].filter(Boolean).join(" "));
}
const SEARCH_PREFIX_MIN = 2;
const SEARCH_PREFIX_MAX_LEN = 40;
const SEARCH_TOKEN_CAP = 120;
/** Fold accents and lowercase for Firestore search keys. */
function foldSearchText(raw) {
    return raw
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .toLowerCase();
}
/**
 * Edge prefixes for `array-contains` search ("gar" → Gabriela Garrido).
 * Accent-insensitive; strips punctuation.
 */
function edgeSearchPrefixes(raw, minLen = SEARCH_PREFIX_MIN, maxLen = SEARCH_PREFIX_MAX_LEN) {
    const cleaned = foldSearchText(raw).replace(/[^a-z0-9]/g, "");
    if (!cleaned)
        return [];
    if (cleaned.length < minLen)
        return [cleaned];
    const out = [];
    const end = Math.min(cleaned.length, maxLen);
    for (let i = minLen; i <= end; i++) {
        out.push(cleaned.slice(0, i));
    }
    return out;
}
/**
 * Search tokens for Firestore `array-contains` (name parts + email local-part).
 * Stores edge prefixes so partial typing works at 10k+ users without a full scan.
 */
function nameSearchTokens(displayName, email, username) {
    const tokens = new Set();
    const addWord = (word) => {
        for (const prefix of edgeSearchPrefixes(word)) {
            tokens.add(prefix);
            if (tokens.size >= SEARCH_TOKEN_CAP)
                return;
        }
    };
    for (const part of String(displayName ?? "")
        .trim()
        .split(/\s+/)) {
        if (!part)
            continue;
        addWord(part);
        if (tokens.size >= SEARCH_TOKEN_CAP)
            break;
    }
    if (email && tokens.size < SEARCH_TOKEN_CAP) {
        const lower = String(email).trim().toLowerCase();
        if (lower) {
            const local = lower.split("@")[0] ?? "";
            addWord(local);
            // Allow typing into the full address from the start (mggl2804@gmai…).
            const emailKey = foldSearchText(lower).replace(/[^a-z0-9@.]/g, "");
            for (let i = SEARCH_PREFIX_MIN; i <= Math.min(emailKey.length, SEARCH_PREFIX_MAX_LEN); i++) {
                tokens.add(emailKey.slice(0, i));
                if (tokens.size >= SEARCH_TOKEN_CAP)
                    break;
            }
        }
    }
    if (username && tokens.size < SEARCH_TOKEN_CAP) {
        addWord(String(username).trim().toLowerCase());
    }
    return [...tokens];
}
/** Normalize a user-typed query token for `nameTokens` lookup. */
function normalizeSearchQueryToken(raw) {
    return foldSearchText(raw).replace(/[^a-z0-9@.]/g, "");
}
/** Fields to keep in sync whenever displayName / email changes. */
function displayNameSearchFields(displayName, email, username) {
    const trimmed = typeof displayName === "string" ? displayName.trim() || null : null;
    return {
        displayName: trimmed,
        displayNameLower: trimmed ? foldSearchText(trimmed) : null,
        nameTokens: nameSearchTokens(trimmed, email, username),
    };
}
/** Full user search index payload (name + emailLower + username tokens). */
function userSearchIndexFields(displayName, email, username) {
    const emailTrimmed = typeof email === "string" ? email.trim() || null : null;
    const usernameTrimmed = typeof username === "string" ? username.trim().toLowerCase() || null : null;
    return {
        ...displayNameSearchFields(displayName, emailTrimmed, usernameTrimmed),
        emailLower: emailTrimmed ? foldSearchText(emailTrimmed) : null,
    };
}
function validateGivenName(raw) {
    const value = normalizePersonName(raw);
    if (!value)
        return { ok: false, issue: "empty" };
    if (looksLikeEmailName(value))
        return { ok: false, issue: "email_as_name" };
    const parts = value.split(" ").filter(Boolean);
    // First token needs 2+ letters; later tokens may be middle initials (e.g. "A").
    if (letterCount(parts[0]) < 2)
        return { ok: false, issue: "too_short" };
    for (const part of parts.slice(1)) {
        if (letterCount(part) < 1)
            return { ok: false, issue: "too_short" };
    }
    return { ok: true, value };
}
function validateFamilyName(raw) {
    const value = normalizePersonName(raw);
    if (!value)
        return { ok: false, issue: "need_last_name" };
    const parts = value.split(" ").filter(Boolean);
    if (parts.some((part) => letterCount(part) < 2)) {
        return { ok: false, issue: "too_short" };
    }
    return { ok: true, value };
}
function validateDisplayName(raw) {
    const normalized = normalizePersonName(raw);
    if (!normalized)
        return { ok: false, issue: "empty" };
    if (looksLikeEmailName(normalized)) {
        return { ok: false, issue: "email_as_name" };
    }
    const { givenName, familyName } = splitDisplayName(normalized);
    if (!familyName)
        return { ok: false, issue: "need_last_name" };
    const given = validateGivenName(givenName);
    if (!given.ok)
        return given;
    const family = validateFamilyName(familyName);
    if (!family.ok)
        return family;
    return {
        ok: true,
        value: composeDisplayName(given.value, family.value),
    };
}
function validateNpn(raw) {
    const digits = String(raw ?? "").replace(/\D/g, "");
    if (!digits)
        return { ok: false, issue: "empty" };
    if (!NPN_DIGITS.test(digits))
        return { ok: false, issue: "invalid" };
    return { ok: true, value: digits };
}
function validateUsState(raw) {
    const v = raw.trim().toUpperCase();
    return /^[A-Z]{2}$/.test(v) ? v : null;
}
function validateUsZip(raw) {
    const v = raw.trim();
    return /^\d{5}(-\d{4})?$/.test(v) ? v : null;
}
function parseApprovalStatus(value) {
    if (value === "pending" || value === "approved" || value === "rejected") {
        return value;
    }
    return null;
}
/**
 * Legacy users (no approvalStatus field) are treated as approved.
 * Only newly registered users are written with `pending`.
 */
function isUserApproved(approvalStatus) {
    const status = parseApprovalStatus(approvalStatus);
    if (status === null)
        return true;
    return status === "approved";
}
/** Temporary remediation: force incomplete / invalid profiles back to the form. */
function needsProfileCompletion(input) {
    if (input.isAnonymous)
        return false;
    const name = validateDisplayName(String(input.displayName ?? ""));
    if (!name.ok)
        return true;
    if (requiresLicenseProfile(input.role)) {
        if (!validateNpn(input.npn).ok)
            return true;
        if (!String(input.addressStreet ?? "").trim())
            return true;
        if (!String(input.addressCity ?? "").trim())
            return true;
        if (!validateUsState(String(input.addressState ?? "")))
            return true;
        if (!validateUsZip(String(input.addressZip ?? "")))
            return true;
    }
    return input.profileCompleted === false;
}
/** Display name for UI chrome (profile / chats / forums). */
function headlineName(profile) {
    if (profile.displayName?.trim())
        return profile.displayName.trim();
    if (profile.email)
        return profile.email;
    return "User";
}
/** Compose a US mailing address string from structured fields. */
function composeUsAddress(parts) {
    const s = parts.street?.trim() ?? "";
    const a = parts.apt?.trim() ?? "";
    const c = parts.city?.trim() ?? "";
    const st = (parts.state?.trim() ?? "").toUpperCase();
    const z = parts.zip?.trim() ?? "";
    const line1 = [s, a].filter(Boolean).join(", ");
    const stateZip = [st, z].filter(Boolean).join(" ");
    const line2 = [c, stateZip].filter(Boolean).join(", ");
    if (!line1 && !line2)
        return null;
    if (!line1)
        return line2;
    if (!line2)
        return line1;
    return `${line1}\n${line2}`;
}

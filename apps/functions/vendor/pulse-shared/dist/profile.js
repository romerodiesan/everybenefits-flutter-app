"use strict";
/**
 * Shared profile field validation / normalization for Pulse clients.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.requiresLicenseProfile = requiresLicenseProfile;
exports.looksLikeEmailName = looksLikeEmailName;
exports.normalizePersonName = normalizePersonName;
exports.validateDisplayName = validateDisplayName;
exports.validateNpn = validateNpn;
exports.validateUsState = validateUsState;
exports.validateUsZip = validateUsZip;
exports.parseApprovalStatus = parseApprovalStatus;
exports.isUserApproved = isUserApproved;
exports.needsProfileCompletion = needsProfileCompletion;
exports.headlineName = headlineName;
exports.composeUsAddress = composeUsAddress;
const permissions_1 = require("./permissions");
const EMAIL_LIKE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const NPN_DIGITS = /^\d{7,9}$/;
/** True when license profile fields are required for this role/permission set. */
function requiresLicenseProfile(roleOrPermissions) {
    return (0, permissions_1.hasPermission)((0, permissions_1.resolvePermissionSet)(roleOrPermissions), "license.profile.required");
}
/** True when the string looks like an email used as a display name. */
function looksLikeEmailName(value) {
    return EMAIL_LIKE.test(value.trim());
}
/**
 * Title-cases a person name when it is ALL CAPS or all lowercase.
 * Leaves mixed-case names alone (preserves intentional casing like McDonald).
 */
function normalizePersonName(raw) {
    const trimmed = raw.trim().replace(/\s+/g, " ");
    if (!trimmed)
        return "";
    const letters = trimmed.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, "");
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
function validateDisplayName(raw) {
    const value = normalizePersonName(raw);
    if (!value)
        return { ok: false, issue: "empty" };
    if (looksLikeEmailName(value))
        return { ok: false, issue: "email_as_name" };
    const parts = value.split(" ").filter(Boolean);
    if (parts.length < 2)
        return { ok: false, issue: "need_last_name" };
    if (parts.some((p) => p.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, "").length < 2)) {
        return { ok: false, issue: "too_short" };
    }
    return { ok: true, value };
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
    return profile.isAnonymous ? "Guest" : "User";
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

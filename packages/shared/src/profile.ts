/**
 * Shared profile field validation / normalization for Pulse clients.
 */

import { hasPermission, resolvePermissionSet } from "./permissions";

const EMAIL_LIKE =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const NPN_DIGITS = /^\d{7,9}$/;
const NAME_LETTERS = /[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g;

/** True when license profile fields are required for this role/permission set. */
export function requiresLicenseProfile(
  roleOrPermissions: string | readonly string[] | null | undefined,
): boolean {
  return hasPermission(
    resolvePermissionSet(roleOrPermissions),
    "license.profile.required",
  );
}

/** True when the string looks like an email used as a display name. */
export function looksLikeEmailName(value: string): boolean {
  return EMAIL_LIKE.test(value.trim());
}

function letterCount(part: string): number {
  return part.replace(NAME_LETTERS, "").length;
}

/**
 * Title-cases a person name when it is ALL CAPS or all lowercase.
 * Leaves mixed-case names alone (preserves intentional casing like McDonald).
 */
export function normalizePersonName(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  const letters = trimmed.replace(NAME_LETTERS, "");
  if (!letters) return trimmed;
  const allUpper = letters === letters.toUpperCase();
  const allLower = letters === letters.toLowerCase();
  if (!allUpper && !allLower) return trimmed;
  return trimmed
    .split(" ")
    .map((word) => {
      if (!word) return word;
      const lower = word.toLocaleLowerCase("en-US");
      return lower.charAt(0).toLocaleUpperCase("en-US") + lower.slice(1);
    })
    .join(" ");
}

/** Last token is family name; everything before is given name (allows middle initials). */
export function splitDisplayName(raw: string): {
  givenName: string;
  familyName: string;
} {
  const value = normalizePersonName(raw);
  const parts = value.split(" ").filter(Boolean);
  if (parts.length === 0) return { givenName: "", familyName: "" };
  if (parts.length === 1) return { givenName: parts[0]!, familyName: "" };
  return {
    givenName: parts.slice(0, -1).join(" "),
    familyName: parts[parts.length - 1]!,
  };
}

export function composeDisplayName(
  givenName: string,
  familyName: string,
): string {
  return normalizePersonName(
    [givenName.trim(), familyName.trim()].filter(Boolean).join(" "),
  );
}

const SEARCH_PREFIX_MIN = 2;
const SEARCH_PREFIX_MAX_LEN = 40;
const SEARCH_TOKEN_CAP = 120;

/** Fold accents and lowercase for Firestore search keys. */
export function foldSearchText(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

/**
 * Edge prefixes for `array-contains` search ("gar" → Gabriela Garrido).
 * Accent-insensitive; strips punctuation.
 */
export function edgeSearchPrefixes(
  raw: string,
  minLen = SEARCH_PREFIX_MIN,
  maxLen = SEARCH_PREFIX_MAX_LEN,
): string[] {
  const cleaned = foldSearchText(raw).replace(/[^a-z0-9]/g, "");
  if (!cleaned) return [];
  if (cleaned.length < minLen) return [cleaned];
  const out: string[] = [];
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
export function nameSearchTokens(
  displayName: string | null | undefined,
  email?: string | null,
): string[] {
  const tokens = new Set<string>();
  const addWord = (word: string) => {
    for (const prefix of edgeSearchPrefixes(word)) {
      tokens.add(prefix);
      if (tokens.size >= SEARCH_TOKEN_CAP) return;
    }
  };

  for (const part of String(displayName ?? "")
    .trim()
    .split(/\s+/)) {
    if (!part) continue;
    addWord(part);
    if (tokens.size >= SEARCH_TOKEN_CAP) break;
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
        if (tokens.size >= SEARCH_TOKEN_CAP) break;
      }
    }
  }

  return [...tokens];
}

/** Normalize a user-typed query token for `nameTokens` lookup. */
export function normalizeSearchQueryToken(raw: string): string {
  return foldSearchText(raw).replace(/[^a-z0-9@.]/g, "");
}

/** Fields to keep in sync whenever displayName / email changes. */
export function displayNameSearchFields(
  displayName: string | null | undefined,
  email?: string | null,
): {
  displayName: string | null;
  displayNameLower: string | null;
  nameTokens: string[];
} {
  const trimmed =
    typeof displayName === "string" ? displayName.trim() || null : null;
  return {
    displayName: trimmed,
    displayNameLower: trimmed ? foldSearchText(trimmed) : null,
    nameTokens: nameSearchTokens(trimmed, email),
  };
}

/** Full user search index payload (name + emailLower). */
export function userSearchIndexFields(
  displayName: string | null | undefined,
  email?: string | null,
): {
  displayName: string | null;
  displayNameLower: string | null;
  emailLower: string | null;
  nameTokens: string[];
} {
  const emailTrimmed =
    typeof email === "string" ? email.trim() || null : null;
  return {
    ...displayNameSearchFields(displayName, emailTrimmed),
    emailLower: emailTrimmed ? foldSearchText(emailTrimmed) : null,
  };
}

export type DisplayNameIssue =
  | "empty"
  | "too_short"
  | "need_last_name"
  | "email_as_name";

export function validateGivenName(
  raw: string,
): { ok: true; value: string } | { ok: false; issue: DisplayNameIssue } {
  const value = normalizePersonName(raw);
  if (!value) return { ok: false, issue: "empty" };
  if (looksLikeEmailName(value)) return { ok: false, issue: "email_as_name" };
  const parts = value.split(" ").filter(Boolean);
  // First token needs 2+ letters; later tokens may be middle initials (e.g. "A").
  if (letterCount(parts[0]!) < 2) return { ok: false, issue: "too_short" };
  for (const part of parts.slice(1)) {
    if (letterCount(part) < 1) return { ok: false, issue: "too_short" };
  }
  return { ok: true, value };
}

export function validateFamilyName(
  raw: string,
): { ok: true; value: string } | { ok: false; issue: DisplayNameIssue } {
  const value = normalizePersonName(raw);
  if (!value) return { ok: false, issue: "need_last_name" };
  const parts = value.split(" ").filter(Boolean);
  if (parts.some((part) => letterCount(part) < 2)) {
    return { ok: false, issue: "too_short" };
  }
  return { ok: true, value };
}

export function validateDisplayName(
  raw: string,
): { ok: true; value: string } | { ok: false; issue: DisplayNameIssue } {
  const normalized = normalizePersonName(raw);
  if (!normalized) return { ok: false, issue: "empty" };
  if (looksLikeEmailName(normalized)) {
    return { ok: false, issue: "email_as_name" };
  }
  const { givenName, familyName } = splitDisplayName(normalized);
  if (!familyName) return { ok: false, issue: "need_last_name" };
  const given = validateGivenName(givenName);
  if (!given.ok) return given;
  const family = validateFamilyName(familyName);
  if (!family.ok) return family;
  return {
    ok: true,
    value: composeDisplayName(given.value, family.value),
  };
}

export type NpnIssue = "empty" | "invalid";

export function validateNpn(
  raw: string | null | undefined,
): { ok: true; value: string } | { ok: false; issue: NpnIssue } {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return { ok: false, issue: "empty" };
  if (!NPN_DIGITS.test(digits)) return { ok: false, issue: "invalid" };
  return { ok: true, value: digits };
}

export function validateUsState(raw: string): string | null {
  const v = raw.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(v) ? v : null;
}

export function validateUsZip(raw: string): string | null {
  const v = raw.trim();
  return /^\d{5}(-\d{4})?$/.test(v) ? v : null;
}

export type ApprovalStatus = "pending" | "approved" | "rejected";

export function parseApprovalStatus(value: unknown): ApprovalStatus | null {
  if (value === "pending" || value === "approved" || value === "rejected") {
    return value;
  }
  return null;
}

/**
 * Legacy users (no approvalStatus field) are treated as approved.
 * Only newly registered users are written with `pending`.
 */
export function isUserApproved(approvalStatus: unknown): boolean {
  const status = parseApprovalStatus(approvalStatus);
  if (status === null) return true;
  return status === "approved";
}

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
export function needsProfileCompletion(input: ProfileCompletenessInput): boolean {
  if (input.isAnonymous) return false;
  const name = validateDisplayName(String(input.displayName ?? ""));
  if (!name.ok) return true;
  if (requiresLicenseProfile(input.role)) {
    if (!validateNpn(input.npn).ok) return true;
    if (!String(input.addressStreet ?? "").trim()) return true;
    if (!String(input.addressCity ?? "").trim()) return true;
    if (!validateUsState(String(input.addressState ?? ""))) return true;
    if (!validateUsZip(String(input.addressZip ?? ""))) return true;
  }
  return input.profileCompleted === false;
}

/** Display name for UI chrome (profile / chats / forums). */
export function headlineName(profile: {
  displayName: string | null;
  email: string | null;
  isAnonymous: boolean;
}) {
  if (profile.displayName?.trim()) return profile.displayName.trim();
  if (profile.email) return profile.email;
  return profile.isAnonymous ? "Guest" : "User";
}

/** Compose a US mailing address string from structured fields. */
export function composeUsAddress(parts: {
  street?: string | null;
  apt?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}) {
  const s = parts.street?.trim() ?? "";
  const a = parts.apt?.trim() ?? "";
  const c = parts.city?.trim() ?? "";
  const st = (parts.state?.trim() ?? "").toUpperCase();
  const z = parts.zip?.trim() ?? "";
  const line1 = [s, a].filter(Boolean).join(", ");
  const stateZip = [st, z].filter(Boolean).join(" ");
  const line2 = [c, stateZip].filter(Boolean).join(", ");
  if (!line1 && !line2) return null;
  if (!line1) return line2;
  if (!line2) return line1;
  return `${line1}\n${line2}`;
}

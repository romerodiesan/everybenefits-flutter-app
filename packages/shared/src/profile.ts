/**
 * Shared profile field validation / normalization for Pulse clients.
 */

const EMAIL_LIKE =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const NPN_DIGITS = /^\d{7,9}$/;

/** Roles that must provide NPN + US address. */
export const LICENSE_PROFILE_ROLES = [
  "agent",
  "instructor",
  "manager",
  "admin",
] as const;

export function requiresLicenseProfile(role: string): boolean {
  return (LICENSE_PROFILE_ROLES as readonly string[]).includes(role);
}

/** True when the string looks like an email used as a display name. */
export function looksLikeEmailName(value: string): boolean {
  return EMAIL_LIKE.test(value.trim());
}

/**
 * Title-cases a person name when it is ALL CAPS or all lowercase.
 * Leaves mixed-case names alone (preserves intentional casing like McDonald).
 */
export function normalizePersonName(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  const letters = trimmed.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, "");
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

export type DisplayNameIssue =
  | "empty"
  | "too_short"
  | "need_last_name"
  | "email_as_name";

export function validateDisplayName(
  raw: string,
): { ok: true; value: string } | { ok: false; issue: DisplayNameIssue } {
  const value = normalizePersonName(raw);
  if (!value) return { ok: false, issue: "empty" };
  if (looksLikeEmailName(value)) return { ok: false, issue: "email_as_name" };
  const parts = value.split(" ").filter(Boolean);
  if (parts.length < 2) return { ok: false, issue: "need_last_name" };
  if (parts.some((p) => p.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, "").length < 2)) {
    return { ok: false, issue: "too_short" };
  }
  return { ok: true, value };
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

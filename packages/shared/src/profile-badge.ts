/**
 * Admin-assigned public role badge shown on member profiles.
 * Color follows the member's appearance accent unless a custom color is set.
 */

export const PROFILE_BADGE_TEXT_MAX = 40;
export const PROFILE_BADGE_ICON_MAX = 40;

export const PROFILE_BADGE_ICONS = [
  "badge",
  "verified",
  "star",
  "school",
  "workspace_premium",
  "military_tech",
  "handshake",
  "groups",
  "campaign",
  "psychology",
  "favorite",
  "bolt",
  "public",
  "health_and_safety",
  "emoji_events",
  "support_agent",
  "admin_panel_settings",
  "auto_awesome",
] as const;

export type ProfileBadgeIcon = (typeof PROFILE_BADGE_ICONS)[number];

export const APPEARANCE_ACCENTS = [
  "green",
  "amber",
  "teal",
  "blue",
  "violet",
  "rose",
] as const;

export type AppearanceAccent = (typeof APPEARANCE_ACCENTS)[number];

export const APPEARANCE_ACCENT_HEX: Record<AppearanceAccent, string> = {
  green: "#1F6B4A",
  amber: "#F5A524",
  teal: "#0D9488",
  blue: "#2563EB",
  violet: "#7C3AED",
  rose: "#E11D48",
};

const ICON_SET = new Set<string>(PROFILE_BADGE_ICONS);
const ACCENT_SET = new Set<string>(APPEARANCE_ACCENTS);
const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

/** Stored on `users/{uid}.profileBadge` (admin-managed). */
export type ProfileBadgeConfig = {
  enabled: boolean;
  text: string;
  icon: ProfileBadgeIcon;
  /** Hex, accent seed, or `"accent"` to follow the user's appearance. */
  color: string;
};

/** Public, resolved badge written to `publicProfiles/{uid}.profileBadge`. */
export type PublicProfileBadge = {
  text: string;
  icon: string;
  backgroundColor: string;
  /** Present when an admin assigned this badge (user override or role badge). */
  assigned?: true;
};

export function isAppearanceAccent(
  value: unknown,
): value is AppearanceAccent {
  return typeof value === "string" && ACCENT_SET.has(value);
}

export function isProfileBadgeIcon(value: unknown): value is ProfileBadgeIcon {
  return typeof value === "string" && ICON_SET.has(value);
}

export function parseAppearanceAccent(raw: unknown): AppearanceAccent {
  return isAppearanceAccent(raw) ? raw : "green";
}

export function appearanceAccentFrom(raw: unknown): AppearanceAccent {
  if (raw && typeof raw === "object" && "accent" in raw) {
    return parseAppearanceAccent((raw as { accent?: unknown }).accent);
  }
  return "green";
}

function clampText(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, PROFILE_BADGE_TEXT_MAX);
}

function parseIcon(raw: unknown): ProfileBadgeIcon {
  return isProfileBadgeIcon(raw) ? raw : "badge";
}

export function parseBadgeColorToken(raw: unknown): string {
  if (typeof raw !== "string") return "accent";
  const value = raw.trim();
  if (!value || value === "accent") return "accent";
  if (HEX_RE.test(value)) return value.toUpperCase();
  if (isAppearanceAccent(value)) return value;
  return "accent";
}

export function resolveBadgeBackgroundColor(
  colorToken: string | null | undefined,
  accent: AppearanceAccent,
): string {
  const token = parseBadgeColorToken(colorToken);
  if (token === "accent") return APPEARANCE_ACCENT_HEX[accent];
  if (HEX_RE.test(token)) return token;
  if (isAppearanceAccent(token)) return APPEARANCE_ACCENT_HEX[token];
  return APPEARANCE_ACCENT_HEX[accent];
}

export function parseProfileBadgeConfig(
  raw: unknown,
): ProfileBadgeConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const text = clampText(data.text);
  const enabled = data.enabled === true && text.length > 0;
  if (!enabled && data.enabled !== true) {
    return null;
  }
  return {
    enabled,
    text,
    icon: parseIcon(data.icon),
    color: parseBadgeColorToken(data.color),
  };
}

/** Admin payload: `null` clears the override. */
export function sanitizeProfileBadgeInput(
  raw: unknown,
): ProfileBadgeConfig | null {
  if (raw === null || raw === undefined) return null;
  const parsed = parseProfileBadgeConfig(raw);
  if (!parsed?.enabled || !parsed.text) return null;
  return parsed;
}

export function toPublicProfileBadge(
  config: ProfileBadgeConfig | null,
  accent: AppearanceAccent,
  fallback?: { text: string; icon?: string; color?: string | null },
): PublicProfileBadge | null {
  if (config?.enabled && config.text) {
    return {
      text: config.text,
      icon: config.icon,
      backgroundColor: resolveBadgeBackgroundColor(config.color, accent),
      assigned: true,
    };
  }
  const text = clampText(fallback?.text);
  if (!text) return null;
  return {
    text,
    icon: parseIcon(fallback?.icon),
    backgroundColor: resolveBadgeBackgroundColor(fallback?.color, accent),
    assigned: true,
  };
}

export function parsePublicProfileBadge(
  raw: unknown,
): PublicProfileBadge | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const assigned = data.assigned === true || data.enabled === true;
  if (!assigned) return null;
  const text = clampText(data.text);
  if (!text) return null;
  const backgroundColor =
    typeof data.backgroundColor === "string" && HEX_RE.test(data.backgroundColor)
      ? data.backgroundColor.toUpperCase()
      : APPEARANCE_ACCENT_HEX.green;
  return {
    text,
    icon: parseIcon(data.icon),
    backgroundColor,
    assigned: true,
  };
}

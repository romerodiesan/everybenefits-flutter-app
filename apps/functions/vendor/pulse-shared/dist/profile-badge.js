"use strict";
/**
 * Admin-assigned public role badge shown on member profiles.
 * Color follows the member's appearance accent unless a custom color is set.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.APPEARANCE_ACCENT_HEX = exports.APPEARANCE_ACCENTS = exports.PROFILE_BADGE_ICONS = exports.PROFILE_BADGE_ICON_MAX = exports.PROFILE_BADGE_TEXT_MAX = void 0;
exports.isAppearanceAccent = isAppearanceAccent;
exports.isProfileBadgeIcon = isProfileBadgeIcon;
exports.parseAppearanceAccent = parseAppearanceAccent;
exports.appearanceAccentFrom = appearanceAccentFrom;
exports.parseBadgeColorToken = parseBadgeColorToken;
exports.resolveBadgeBackgroundColor = resolveBadgeBackgroundColor;
exports.parseProfileBadgeConfig = parseProfileBadgeConfig;
exports.sanitizeProfileBadgeInput = sanitizeProfileBadgeInput;
exports.toPublicProfileBadge = toPublicProfileBadge;
exports.parsePublicProfileBadge = parsePublicProfileBadge;
exports.PROFILE_BADGE_TEXT_MAX = 40;
exports.PROFILE_BADGE_ICON_MAX = 40;
exports.PROFILE_BADGE_ICONS = [
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
];
exports.APPEARANCE_ACCENTS = [
    "green",
    "amber",
    "teal",
    "blue",
    "violet",
    "rose",
];
exports.APPEARANCE_ACCENT_HEX = {
    green: "#1F6B4A",
    amber: "#F5A524",
    teal: "#0D9488",
    blue: "#2563EB",
    violet: "#7C3AED",
    rose: "#E11D48",
};
const ICON_SET = new Set(exports.PROFILE_BADGE_ICONS);
const ACCENT_SET = new Set(exports.APPEARANCE_ACCENTS);
const HEX_RE = /^#[0-9A-Fa-f]{6}$/;
function isAppearanceAccent(value) {
    return typeof value === "string" && ACCENT_SET.has(value);
}
function isProfileBadgeIcon(value) {
    return typeof value === "string" && ICON_SET.has(value);
}
function parseAppearanceAccent(raw) {
    return isAppearanceAccent(raw) ? raw : "green";
}
function appearanceAccentFrom(raw) {
    if (raw && typeof raw === "object" && "accent" in raw) {
        return parseAppearanceAccent(raw.accent);
    }
    return "green";
}
function clampText(raw) {
    if (typeof raw !== "string")
        return "";
    return raw.trim().slice(0, exports.PROFILE_BADGE_TEXT_MAX);
}
function parseIcon(raw) {
    return isProfileBadgeIcon(raw) ? raw : "badge";
}
function parseBadgeColorToken(raw) {
    if (typeof raw !== "string")
        return "accent";
    const value = raw.trim();
    if (!value || value === "accent")
        return "accent";
    if (HEX_RE.test(value))
        return value.toUpperCase();
    if (isAppearanceAccent(value))
        return value;
    return "accent";
}
function resolveBadgeBackgroundColor(colorToken, accent) {
    const token = parseBadgeColorToken(colorToken);
    if (token === "accent")
        return exports.APPEARANCE_ACCENT_HEX[accent];
    if (HEX_RE.test(token))
        return token;
    if (isAppearanceAccent(token))
        return exports.APPEARANCE_ACCENT_HEX[token];
    return exports.APPEARANCE_ACCENT_HEX[accent];
}
function parseProfileBadgeConfig(raw) {
    if (!raw || typeof raw !== "object")
        return null;
    const data = raw;
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
function sanitizeProfileBadgeInput(raw) {
    if (raw === null || raw === undefined)
        return null;
    const parsed = parseProfileBadgeConfig(raw);
    if (!parsed?.enabled || !parsed.text)
        return null;
    return parsed;
}
function toPublicProfileBadge(config, accent, fallback) {
    if (config?.enabled && config.text) {
        return {
            text: config.text,
            icon: config.icon,
            backgroundColor: resolveBadgeBackgroundColor(config.color, accent),
            assigned: true,
        };
    }
    const text = clampText(fallback?.text);
    if (!text)
        return null;
    return {
        text,
        icon: parseIcon(fallback?.icon),
        backgroundColor: resolveBadgeBackgroundColor(fallback?.color, accent),
        assigned: true,
    };
}
function parsePublicProfileBadge(raw) {
    if (!raw || typeof raw !== "object")
        return null;
    const data = raw;
    const assigned = data.assigned === true || data.enabled === true;
    if (!assigned)
        return null;
    const text = clampText(data.text);
    if (!text)
        return null;
    const backgroundColor = typeof data.backgroundColor === "string" && HEX_RE.test(data.backgroundColor)
        ? data.backgroundColor.toUpperCase()
        : exports.APPEARANCE_ACCENT_HEX.green;
    return {
        text,
        icon: parseIcon(data.icon),
        backgroundColor,
        assigned: true,
    };
}

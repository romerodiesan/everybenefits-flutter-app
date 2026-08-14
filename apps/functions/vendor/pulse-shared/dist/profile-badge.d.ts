/**
 * Admin-assigned public role badge shown on member profiles.
 * Color follows the member's appearance accent unless a custom color is set.
 */
export declare const PROFILE_BADGE_TEXT_MAX = 40;
export declare const PROFILE_BADGE_ICON_MAX = 40;
export declare const PROFILE_BADGE_ICONS: readonly ["badge", "verified", "star", "school", "workspace_premium", "military_tech", "handshake", "groups", "campaign", "psychology", "favorite", "bolt", "public", "health_and_safety", "emoji_events", "support_agent", "admin_panel_settings", "auto_awesome"];
export type ProfileBadgeIcon = (typeof PROFILE_BADGE_ICONS)[number];
export declare const APPEARANCE_ACCENTS: readonly ["green", "amber", "teal", "blue", "violet", "rose"];
export type AppearanceAccent = (typeof APPEARANCE_ACCENTS)[number];
export declare const APPEARANCE_ACCENT_HEX: Record<AppearanceAccent, string>;
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
export declare function isAppearanceAccent(value: unknown): value is AppearanceAccent;
export declare function isProfileBadgeIcon(value: unknown): value is ProfileBadgeIcon;
export declare function parseAppearanceAccent(raw: unknown): AppearanceAccent;
export declare function appearanceAccentFrom(raw: unknown): AppearanceAccent;
export declare function parseBadgeColorToken(raw: unknown): string;
export declare function resolveBadgeBackgroundColor(colorToken: string | null | undefined, accent: AppearanceAccent): string;
export declare function parseProfileBadgeConfig(raw: unknown): ProfileBadgeConfig | null;
/** Admin payload: `null` clears the override. */
export declare function sanitizeProfileBadgeInput(raw: unknown): ProfileBadgeConfig | null;
export declare function toPublicProfileBadge(config: ProfileBadgeConfig | null, accent: AppearanceAccent, fallback?: {
    text: string;
    icon?: string;
    color?: string | null;
}): PublicProfileBadge | null;
export declare function parsePublicProfileBadge(raw: unknown): PublicProfileBadge | null;
//# sourceMappingURL=profile-badge.d.ts.map
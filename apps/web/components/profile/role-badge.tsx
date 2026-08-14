"use client";

import type { CSSProperties } from "react";
import type { PublicProfileBadge } from "@pulse/shared";
import { PROFILE_BADGE_ICONS } from "@pulse/shared";

const ICONS: Record<string, string> = {
  badge: "◆",
  verified: "✓",
  star: "★",
  school: "🎓",
  workspace_premium: "♔",
  military_tech: "✦",
  handshake: "🤝",
  groups: "👥",
  campaign: "📣",
  psychology: "◉",
  favorite: "♥",
  bolt: "⚡",
  public: "🌐",
  health_and_safety: "✚",
  emoji_events: "🏆",
  support_agent: "🎧",
  admin_panel_settings: "⚙",
  auto_awesome: "✧",
};

function luminance(hex: string) {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return 0;
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function RoleBadgeView({
  badge,
  compact = false,
}: {
  badge?: PublicProfileBadge | null;
  compact?: boolean;
}) {
  const text = badge?.text?.trim();
  if (!text) return null;
  const iconKey = (PROFILE_BADGE_ICONS as readonly string[]).includes(
    badge?.icon ?? "badge",
  )
    ? (badge?.icon ?? "badge")
    : "badge";
  const accent = badge?.backgroundColor || "#1F6B4A";
  const gemInk = luminance(accent) > 0.58 ? "#122018" : "#FFFFFF";
  return (
    <span
      title={text}
      className={compact ? "role-sigil role-sigil-compact" : "role-sigil"}
      style={
        {
          "--sigil": accent,
          "--sigil-ink": gemInk,
        } as CSSProperties
      }
    >
      <span className="role-sigil-facet" aria-hidden>
        <span className="role-sigil-glyph">{ICONS[iconKey] ?? ICONS.badge}</span>
      </span>
      <span className="role-sigil-text">{text}</span>
    </span>
  );
}

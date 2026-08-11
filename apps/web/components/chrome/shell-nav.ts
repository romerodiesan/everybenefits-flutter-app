import {
  IconBell,
  IconChat,
  IconHome,
  IconPerson,
  IconSchool,
  type ShellIconProps,
} from "@/components/chrome/shell-icons";
import type { ComponentType } from "react";

export type ShellNavItem = {
  href: string;
  key:
    | "navHome"
    | "navChats"
    | "navAcademy"
    | "navNotifications"
    | "navProfile";
  Icon: ComponentType<ShellIconProps>;
  badge?: "forum" | "unread" | "notifs";
};

export const NAV: ShellNavItem[] = [
  {
    href: "/home",
    key: "navHome",
    Icon: IconHome,
    badge: "forum",
  },
  {
    href: "/chats",
    key: "navChats",
    Icon: IconChat,
    badge: "unread",
  },
  { href: "/academy", key: "navAcademy", Icon: IconSchool },
  {
    href: "/notifications",
    key: "navNotifications",
    Icon: IconBell,
    badge: "notifs",
  },
  { href: "/account", key: "navProfile", Icon: IconPerson },
];

export function formatBadge(n: number) {
  if (n <= 0) return null;
  return n > 99 ? "99+" : String(n);
}

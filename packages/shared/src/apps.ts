import { canAccessAdmin, canAuthorCourses, type UserRole } from "./roles";

/**
 * Pulse product family apps (cross-origin SSO targets).
 *
 * Host apps (web / studio / admin) must provide these next-intl keys:
 * - appSwitchTitle, appSwitchHere, appSwitchHandoffFailed
 * - appSwitchPulse, appSwitchStudio, appSwitchAdmin
 * - appSwitchPulseBlurb, appSwitchStudioBlurb, appSwitchAdminBlurb
 * - SSO keys documented in `@pulse/sso` (SsoMessageKey)
 */
export type PulseAppId = "pulse" | "studio" | "admin";

export type AppSwitchLabelKey =
  | "appSwitchPulse"
  | "appSwitchStudio"
  | "appSwitchAdmin";

export type AppSwitchBlurbKey =
  | "appSwitchPulseBlurb"
  | "appSwitchStudioBlurb"
  | "appSwitchAdminBlurb";

export type AppRegistryEntry = {
  id: PulseAppId;
  labelKey: AppSwitchLabelKey;
  blurbKey: AppSwitchBlurbKey;
  homePath: string;
  /** Tailwind token classes for the icon tile. */
  tileClass: string;
  visible?: (role: UserRole | undefined) => boolean;
};

/** Registry of Pulse family apps. Add entries here as products launch. */
export const PULSE_APPS: readonly AppRegistryEntry[] = [
  {
    id: "pulse",
    labelKey: "appSwitchPulse",
    blurbKey: "appSwitchPulseBlurb",
    homePath: "/home",
    tileClass: "bg-brand/15 text-brand",
  },
  {
    id: "studio",
    labelKey: "appSwitchStudio",
    blurbKey: "appSwitchStudioBlurb",
    homePath: "/",
    tileClass: "bg-ink/[0.08] text-ink dark:bg-white/[0.1] dark:text-white",
    visible: (role) => Boolean(role && canAuthorCourses(role)),
  },
  {
    id: "admin",
    labelKey: "appSwitchAdmin",
    blurbKey: "appSwitchAdminBlurb",
    homePath: "/",
    tileClass: "bg-brand/10 text-brand",
    visible: (role) => Boolean(role && canAccessAdmin(role)),
  },
];

export function listVisibleApps(
  role?: UserRole,
): AppRegistryEntry[] {
  return PULSE_APPS.filter((app) => !app.visible || app.visible(role));
}

export function getAppEntry(id: PulseAppId): AppRegistryEntry | undefined {
  return PULSE_APPS.find((app) => app.id === id);
}

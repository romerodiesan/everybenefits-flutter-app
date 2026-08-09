import { type UserRole } from "./roles";
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
export type AppSwitchLabelKey = "appSwitchPulse" | "appSwitchStudio" | "appSwitchAdmin";
export type AppSwitchBlurbKey = "appSwitchPulseBlurb" | "appSwitchStudioBlurb" | "appSwitchAdminBlurb";
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
export declare const PULSE_APPS: readonly AppRegistryEntry[];
export declare function listVisibleApps(role?: UserRole): AppRegistryEntry[];
export declare function getAppEntry(id: PulseAppId): AppRegistryEntry | undefined;
//# sourceMappingURL=apps.d.ts.map
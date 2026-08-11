import { type RoleOrPermissions, type UserRole } from "./roles";
/**
 * Pulse product family apps (cross-origin SSO targets).
 *
 * Host apps (web / studio / admin / payments) must provide these next-intl keys:
 * - appSwitchTitle, appSwitchHere, appSwitchHandoffFailed
 * - appSwitchPulse, appSwitchStudio, appSwitchAdmin, appSwitchPayments
 * - appSwitchPulseBlurb, appSwitchStudioBlurb, appSwitchAdminBlurb, appSwitchPaymentsBlurb
 * - SSO keys documented in `@pulse/sso` (SsoMessageKey)
 */
export type PulseAppId = "pulse" | "studio" | "admin" | "payments";
export type AppSwitchLabelKey = "appSwitchPulse" | "appSwitchStudio" | "appSwitchAdmin" | "appSwitchPayments";
export type AppSwitchBlurbKey = "appSwitchPulseBlurb" | "appSwitchStudioBlurb" | "appSwitchAdminBlurb" | "appSwitchPaymentsBlurb";
export type AppRegistryEntry = {
    id: PulseAppId;
    labelKey: AppSwitchLabelKey;
    blurbKey: AppSwitchBlurbKey;
    homePath: string;
    /** Tailwind token classes for the icon tile. */
    tileClass: string;
    /** Prefer passing resolved permissions; role slug falls back to defaults. */
    visible?: (roleOrPermissions: RoleOrPermissions) => boolean;
};
/** Registry of Pulse family apps. Add entries here as products launch. */
export declare const PULSE_APPS: readonly AppRegistryEntry[];
export declare function listVisibleApps(roleOrPermissions?: RoleOrPermissions): AppRegistryEntry[];
export declare function getAppEntry(id: PulseAppId): AppRegistryEntry | undefined;
export type { UserRole };
//# sourceMappingURL=apps.d.ts.map
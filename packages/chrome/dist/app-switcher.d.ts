import { type ComponentType, type ReactNode } from "react";
import { type AppRegistryEntry, type PulseAppId, type RoleOrPermissions } from "@pulse/shared";
export type AppSwitcherHomeLinkProps = {
    href: string;
    className?: string;
    children: ReactNode;
    "aria-label"?: string;
};
export type AppSwitcherProps = {
    current: PulseAppId;
    /** Role slug or resolved permission list (prefer permissions for custom roles). */
    permissions?: RoleOrPermissions;
    /** @deprecated Use `permissions`. */
    role?: RoleOrPermissions;
    /** Build final navigation URL (SSO handoff or plain). */
    resolveSwitchUrl: (target: PulseAppId, homePath: string) => Promise<string>;
    /** Optional product mark override for the trigger tile only. */
    renderTriggerIcon?: (meta: AppRegistryEntry) => ReactNode;
    /** Single-app home link — each host passes its i18n Link. */
    HomeLink: ComponentType<AppSwitcherHomeLinkProps>;
};
export declare function AppSwitcher({ current, permissions, role, resolveSwitchUrl, renderTriggerIcon, HomeLink, }: AppSwitcherProps): import("react").JSX.Element;
//# sourceMappingURL=app-switcher.d.ts.map
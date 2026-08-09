import { type ComponentType, type ReactNode } from "react";
import { type AppRegistryEntry, type PulseAppId, type UserRole } from "@pulse/shared";
export type AppSwitcherHomeLinkProps = {
    href: string;
    className?: string;
    children: ReactNode;
    "aria-label"?: string;
};
export type AppSwitcherProps = {
    current: PulseAppId;
    role?: UserRole;
    /** Build final navigation URL (SSO handoff or plain). */
    resolveSwitchUrl: (target: PulseAppId, homePath: string) => Promise<string>;
    /** Slot for product mark in the trigger (e.g. Pulse logo). */
    renderTriggerIcon?: (meta: AppRegistryEntry) => ReactNode;
    /** Single-app home link — each host passes its i18n Link. */
    HomeLink: ComponentType<AppSwitcherHomeLinkProps>;
};
export declare function AppSwitcher({ current, role, resolveSwitchUrl, renderTriggerIcon, HomeLink, }: AppSwitcherProps): import("react").JSX.Element;
//# sourceMappingURL=app-switcher.d.ts.map
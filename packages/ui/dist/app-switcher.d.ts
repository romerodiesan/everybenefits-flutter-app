import { type ComponentType, type ReactNode, type SVGProps } from "react";
import { type UserRole } from "@pulse/shared";
import { type PulseAppId } from "@pulse/sso/client";
type IconProps = SVGProps<SVGSVGElement>;
type AppMeta = {
    id: PulseAppId;
    labelKey: "appSwitchPulse" | "appSwitchStudio" | "appSwitchAdmin";
    homePath: string;
    Icon: (props: IconProps) => ReactNode;
    visible?: (role: UserRole | undefined) => boolean;
};
/** Registry of Pulse family apps. Add entries here as products launch. */
export declare const APPS: AppMeta[];
export type AppSwitcherLinkProps = {
    href: string;
    className?: string;
    "aria-label"?: string;
    children?: ReactNode;
};
export declare function AppSwitcher({ current, role, linkComponent: Link, }: {
    current: PulseAppId;
    role?: UserRole;
    linkComponent: ComponentType<AppSwitcherLinkProps>;
}): any;
export {};

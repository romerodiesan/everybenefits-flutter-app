"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useId, useMemo, useRef, useState, } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getFirebaseAuth } from "@pulse/firebase-client";
import { canAccessAdmin, canAuthorCourses } from "@pulse/shared";
import { appBaseUrl, buildSsoHandoffUrl, ssoConsumeUrl, } from "@pulse/sso/client";
import { BrandMark } from "./brand-mark";
function IconPulseMark(props) {
    return (_jsx("svg", { viewBox: "0 0 24 24", fill: "none", "aria-hidden": true, ...props, children: _jsx("path", { d: "M4.5 12h3.2l1.6-4.5 2.4 9 2-6.5H19.5", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) }));
}
function IconStudioMark(props) {
    return (_jsxs("svg", { viewBox: "0 0 24 24", fill: "none", "aria-hidden": true, ...props, children: [_jsx("path", { d: "M5 8h14v11H5zM9 8V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8V8", stroke: "currentColor", strokeWidth: "1.8", strokeLinejoin: "round" }), _jsx("path", { d: "M9 13h6M9 16.5h4", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" })] }));
}
function IconAdminMark(props) {
    return (_jsxs("svg", { viewBox: "0 0 24 24", fill: "none", "aria-hidden": true, ...props, children: [_jsx("path", { d: "M12 3.5 19 7v5c0 4.5-3 7.5-7 8.5-4-1-7-4-7-8.5V7l7-3.5Z", stroke: "currentColor", strokeWidth: "1.8", strokeLinejoin: "round" }), _jsx("path", { d: "M9.5 12.2l1.8 1.8 3.4-3.5", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" })] }));
}
function IconChevron(props) {
    return (_jsx("svg", { viewBox: "0 0 16 16", fill: "none", "aria-hidden": true, ...props, children: _jsx("path", { d: "M4 6.2 8 10l4-3.8", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round" }) }));
}
/** Registry of Pulse family apps. Add entries here as products launch. */
export const APPS = [
    {
        id: "pulse",
        labelKey: "appSwitchPulse",
        homePath: "/home",
        Icon: IconPulseMark,
    },
    {
        id: "studio",
        labelKey: "appSwitchStudio",
        homePath: "/",
        Icon: IconStudioMark,
        visible: (role) => Boolean(role && canAuthorCourses(role)),
    },
    {
        id: "admin",
        labelKey: "appSwitchAdmin",
        homePath: "/",
        Icon: IconAdminMark,
        visible: (role) => Boolean(role && canAccessAdmin(role)),
    },
];
export function AppSwitcher({ current, role, linkComponent: Link, }) {
    const t = useTranslations();
    const locale = useLocale();
    const panelId = useId();
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const rootRef = useRef(null);
    const apps = useMemo(() => APPS.filter((app) => !app.visible || app.visible(role)), [role]);
    const currentMeta = apps.find((a) => a.id === current) ?? APPS[0];
    const CurrentIcon = currentMeta.Icon;
    const canSwitch = apps.length > 1;
    useEffect(() => {
        if (!open)
            return;
        const onDoc = (e) => {
            if (!rootRef.current?.contains(e.target))
                setOpen(false);
        };
        const onKey = (e) => {
            if (e.key === "Escape")
                setOpen(false);
        };
        document.addEventListener("mousedown", onDoc);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDoc);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);
    const switchTo = async (target) => {
        if (target === current) {
            setOpen(false);
            return;
        }
        const meta = APPS.find((a) => a.id === target);
        if (!meta)
            return;
        setBusy(true);
        try {
            const user = getFirebaseAuth().currentUser;
            if (user) {
                const idToken = await user.getIdToken();
                const consume = ssoConsumeUrl(target, locale, meta.homePath);
                window.location.assign(await buildSsoHandoffUrl(consume, idToken));
                return;
            }
            window.location.assign(`${appBaseUrl(target)}/${locale}${meta.homePath}`);
        }
        catch {
            window.location.assign(`${appBaseUrl(target)}/${locale}`);
        }
        finally {
            setBusy(false);
            setOpen(false);
        }
    };
    const mark = current === "pulse" ? (_jsx(BrandMark, { size: 22 })) : (_jsx(CurrentIcon, { width: 16, height: 16, className: "text-brand" }));
    const triggerClass = "inline-flex max-w-full items-center gap-1.5 rounded-lg px-1.5 py-1 text-left transition hover:bg-ink/[0.05] dark:hover:bg-white/[0.06]";
    return (_jsxs("div", { ref: rootRef, className: "relative", children: [canSwitch ? (_jsxs("button", { type: "button", "aria-haspopup": "listbox", "aria-expanded": open, "aria-controls": open ? panelId : undefined, "aria-label": t("appSwitchTitle"), disabled: busy, onClick: () => setOpen((v) => !v), className: `${triggerClass} cursor-pointer disabled:cursor-not-allowed disabled:opacity-60`, children: [_jsx("span", { className: "flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-brand/10 text-brand", children: mark }), _jsx("span", { className: "truncate font-display text-[15px] font-bold tracking-tight", children: t(currentMeta.labelKey) }), _jsx(IconChevron, { width: 12, height: 12, className: `shrink-0 text-muted transition duration-200 ${open ? "rotate-180" : ""}` })] })) : (_jsxs(Link, { href: currentMeta.homePath, className: triggerClass, "aria-label": t(currentMeta.labelKey), children: [_jsx("span", { className: "flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-brand/10 text-brand", children: mark }), _jsx("span", { className: "truncate font-display text-[15px] font-bold tracking-tight", children: t(currentMeta.labelKey) })] })), open && canSwitch ? (_jsx("ul", { id: panelId, role: "listbox", "aria-label": t("appSwitchTitle"), className: "absolute left-0 top-full z-50 mt-1.5 min-w-[10.5rem] overflow-hidden rounded-xl border border-glass-border bg-sheet p-1 shadow-lg", children: apps.map((app) => {
                    const active = app.id === current;
                    const Icon = app.Icon;
                    return (_jsx("li", { role: "option", "aria-selected": active, children: _jsxs("button", { type: "button", disabled: busy, onClick: () => void switchTo(app.id), className: `flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${active
                                ? "bg-brand/10 font-semibold text-brand"
                                : "text-ink hover:bg-ink/[0.04] dark:hover:bg-white/[0.05]"}`, children: [_jsx("span", { className: "flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-ink/[0.04] dark:bg-white/[0.06]", children: app.id === "pulse" ? (_jsx(BrandMark, { size: 18 })) : (_jsx(Icon, { width: 14, height: 14 })) }), _jsx("span", { className: "min-w-0 flex-1 truncate", children: t(app.labelKey) }), active ? (_jsx("span", { className: "text-[10px] font-bold uppercase tracking-wide text-brand", children: t("appSwitchHere") })) : null] }) }, app.id));
                }) })) : null] }));
}

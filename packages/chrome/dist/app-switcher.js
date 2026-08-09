"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppSwitcher = AppSwitcher;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const next_intl_1 = require("next-intl");
const shared_1 = require("@pulse/shared");
const icons_1 = require("./icons");
function AppSwitcher({ current, role, resolveSwitchUrl, renderTriggerIcon, HomeLink, }) {
    const t = (0, next_intl_1.useTranslations)();
    const panelId = (0, react_1.useId)();
    const [open, setOpen] = (0, react_1.useState)(false);
    const [busy, setBusy] = (0, react_1.useState)(false);
    const [switchError, setSwitchError] = (0, react_1.useState)(null);
    const rootRef = (0, react_1.useRef)(null);
    const apps = (0, react_1.useMemo)(() => (0, shared_1.listVisibleApps)(role), [role]);
    const currentMeta = apps.find((a) => a.id === current) ??
        (0, shared_1.getAppEntry)(current) ??
        shared_1.PULSE_APPS[0];
    (0, react_1.useEffect)(() => {
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
            setSwitchError(null);
            return;
        }
        const meta = (0, shared_1.getAppEntry)(target);
        if (!meta)
            return;
        setBusy(true);
        setSwitchError(null);
        try {
            window.location.assign(await resolveSwitchUrl(target, meta.homePath));
        }
        catch {
            setSwitchError(t("appSwitchHandoffFailed"));
            setBusy(false);
            // Keep panel open so the user sees the error.
        }
    };
    const canSwitch = apps.length > 1;
    const triggerIcon = renderTriggerIcon?.(currentMeta) ?? ((0, jsx_runtime_1.jsx)(icons_1.AppIcon, { id: currentMeta.id, width: 18, height: 18 }));
    const brandInner = ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { className: `flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg ${currentMeta.tileClass}`, children: triggerIcon }), (0, jsx_runtime_1.jsxs)("span", { className: "min-w-0", children: [(0, jsx_runtime_1.jsx)("span", { className: "block truncate font-display text-lg font-bold leading-tight tracking-tight", children: t(currentMeta.labelKey) }), canSwitch ? ((0, jsx_runtime_1.jsx)("span", { className: "block text-[10px] font-semibold uppercase tracking-wide text-muted", children: t("appSwitchTitle") })) : null] }), canSwitch ? ((0, jsx_runtime_1.jsx)(icons_1.IconChevron, { width: 14, height: 14, className: `ml-0.5 shrink-0 text-muted transition duration-200 ${open ? "rotate-180" : ""}` })) : null] }));
    return ((0, jsx_runtime_1.jsxs)("div", { ref: rootRef, className: "relative", children: [canSwitch ? ((0, jsx_runtime_1.jsx)("button", { type: "button", "aria-haspopup": "dialog", "aria-expanded": open, "aria-controls": open ? panelId : undefined, "aria-label": t("appSwitchTitle"), disabled: busy, onClick: () => setOpen((v) => !v), className: "group inline-flex max-w-full cursor-pointer items-center gap-2 rounded-xl px-1.5 py-1 text-left transition hover:bg-ink/[0.05] disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-white/[0.06]", children: brandInner })) : ((0, jsx_runtime_1.jsx)(HomeLink, { href: currentMeta.homePath, className: "inline-flex max-w-full items-center gap-2 rounded-xl px-1.5 py-1 text-left transition hover:bg-ink/[0.05] dark:hover:bg-white/[0.06]", "aria-label": t(currentMeta.labelKey), children: brandInner })), open && canSwitch ? ((0, jsx_runtime_1.jsxs)("div", { id: panelId, role: "dialog", "aria-label": t("appSwitchTitle"), className: "absolute left-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-glass-border bg-sheet shadow-xl", children: [(0, jsx_runtime_1.jsx)("p", { className: "px-3 pb-1 pt-2.5 text-[10px] font-bold uppercase tracking-wide text-muted", children: t("appSwitchTitle") }), switchError ? ((0, jsx_runtime_1.jsx)("p", { className: "mx-1.5 mb-1.5 rounded-lg bg-red-500/10 px-2.5 py-2 text-[11px] leading-snug text-red-500", children: switchError })) : null, (0, jsx_runtime_1.jsx)("ul", { className: "max-h-[min(20rem,50vh)] overflow-y-auto p-1.5", children: apps.map((app) => {
                            const active = app.id === current;
                            return ((0, jsx_runtime_1.jsx)("li", { children: (0, jsx_runtime_1.jsxs)("button", { type: "button", disabled: busy, "aria-current": active ? "true" : undefined, onClick: () => void switchTo(app.id), className: `flex w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${active
                                        ? "bg-brand/10"
                                        : "hover:bg-ink/[0.04] dark:hover:bg-white/[0.05]"}`, children: [(0, jsx_runtime_1.jsx)("span", { className: `flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${app.tileClass}`, children: (0, jsx_runtime_1.jsx)(icons_1.AppIcon, { id: app.id, width: 20, height: 20 }) }), (0, jsx_runtime_1.jsxs)("span", { className: "min-w-0 flex-1", children: [(0, jsx_runtime_1.jsx)("span", { className: "block truncate text-sm font-semibold text-ink", children: t(app.labelKey) }), (0, jsx_runtime_1.jsx)("span", { className: "mt-0.5 block truncate text-[11px] leading-snug text-muted", children: t(app.blurbKey) })] }), active ? ((0, jsx_runtime_1.jsx)(icons_1.IconCheck, { width: 16, height: 16, className: "shrink-0 text-brand" })) : ((0, jsx_runtime_1.jsx)("span", { className: "w-4 shrink-0", "aria-hidden": true }))] }) }, app.id));
                        }) })] })) : null] }));
}

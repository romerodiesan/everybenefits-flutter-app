"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppSwitcher = AppSwitcher;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_dom_1 = require("react-dom");
const next_intl_1 = require("next-intl");
const shared_1 = require("@pulse/shared");
const icons_1 = require("./icons");
const PANEL_WIDTH_PX = 220;
function AppSwitcher({ current, permissions, role, resolveSwitchUrl, renderTriggerIcon, HomeLink, }) {
    const t = (0, next_intl_1.useTranslations)();
    const panelId = (0, react_1.useId)();
    const [open, setOpen] = (0, react_1.useState)(false);
    const [busy, setBusy] = (0, react_1.useState)(false);
    const [switchError, setSwitchError] = (0, react_1.useState)(null);
    const [coords, setCoords] = (0, react_1.useState)(null);
    const [mounted, setMounted] = (0, react_1.useState)(false);
    const rootRef = (0, react_1.useRef)(null);
    const triggerRef = (0, react_1.useRef)(null);
    const panelRef = (0, react_1.useRef)(null);
    const access = permissions ?? role;
    const apps = (0, react_1.useMemo)(() => (0, shared_1.listVisibleApps)(access), [access]);
    const currentMeta = apps.find((a) => a.id === current) ??
        (0, shared_1.getAppEntry)(current) ??
        shared_1.PULSE_APPS[0];
    (0, react_1.useEffect)(() => {
        setMounted(true);
    }, []);
    (0, react_1.useLayoutEffect)(() => {
        if (!open) {
            setCoords(null);
            return;
        }
        const update = () => {
            const el = triggerRef.current;
            if (!el)
                return;
            const r = el.getBoundingClientRect();
            const margin = 8;
            let left = r.left;
            left = Math.min(left, window.innerWidth - PANEL_WIDTH_PX - margin);
            left = Math.max(margin, left);
            let top = r.bottom + 6;
            const estimatedHeight = 16 + apps.length * 44 + (switchError ? 36 : 0);
            if (top + estimatedHeight > window.innerHeight - margin) {
                top = Math.max(margin, r.top - estimatedHeight - 6);
            }
            setCoords({ top, left });
        };
        update();
        window.addEventListener("resize", update);
        window.addEventListener("scroll", update, true);
        return () => {
            window.removeEventListener("resize", update);
            window.removeEventListener("scroll", update, true);
        };
    }, [open, apps.length, switchError]);
    (0, react_1.useEffect)(() => {
        if (!open)
            return;
        const onDoc = (e) => {
            const target = e.target;
            if (rootRef.current?.contains(target))
                return;
            if (panelRef.current?.contains(target))
                return;
            setOpen(false);
        };
        const onKey = (e) => {
            if (e.key === "Escape") {
                setOpen(false);
                triggerRef.current?.focus();
            }
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
        }
    };
    const canSwitch = apps.length > 1;
    const triggerIcon = renderTriggerIcon?.(currentMeta) ?? ((0, jsx_runtime_1.jsx)(icons_1.AppIcon, { id: currentMeta.id, width: 16, height: 16 }));
    const brandInner = ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("span", { className: `relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md ${currentMeta.tileClass}`, children: [triggerIcon, busy ? ((0, jsx_runtime_1.jsx)("span", { className: "absolute inset-0 animate-pulse rounded-md bg-sheet/50", "aria-hidden": true })) : null] }), (0, jsx_runtime_1.jsxs)("span", { className: "min-w-0", children: [(0, jsx_runtime_1.jsx)("span", { className: "block truncate font-display text-base font-bold leading-tight tracking-tight text-ink", children: t(currentMeta.labelKey) }), canSwitch ? ((0, jsx_runtime_1.jsx)("span", { className: "block text-[9px] font-semibold uppercase tracking-[0.14em] text-muted", children: t("appSwitchTitle") })) : null] }), canSwitch ? ((0, jsx_runtime_1.jsx)(icons_1.IconChevron, { width: 12, height: 12, className: `ml-0.5 shrink-0 text-muted transition duration-200 ${open ? "rotate-180" : ""}` })) : null] }));
    const triggerClass = "group inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-lg px-1 py-0.5 text-left outline-none transition hover:bg-ink/[0.05] focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-white/[0.06]";
    const panel = open && canSwitch && mounted && coords
        ? (0, react_dom_1.createPortal)((0, jsx_runtime_1.jsxs)("div", { ref: panelRef, id: panelId, role: "dialog", "aria-label": t("appSwitchTitle"), style: {
                position: "fixed",
                top: coords.top,
                left: coords.left,
                width: PANEL_WIDTH_PX,
            }, className: "z-[200] overflow-hidden rounded-xl border border-glass-border bg-sheet shadow-[0_12px_28px_-12px_rgba(0,0,0,0.45)]", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between gap-2 border-b border-glass-border px-2.5 py-1.5", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[9px] font-bold uppercase tracking-[0.14em] text-muted", children: t("appSwitchTitle") }), (0, jsx_runtime_1.jsx)("p", { className: "truncate text-[10px] text-muted", children: t(currentMeta.labelKey) })] }), switchError ? ((0, jsx_runtime_1.jsx)("p", { className: "mx-1.5 mt-1.5 rounded-lg bg-red-500/10 px-2 py-1.5 text-[10px] leading-snug text-red-500", children: switchError })) : null, (0, jsx_runtime_1.jsx)("ul", { className: "max-h-[min(16rem,50vh)] space-y-0.5 overflow-y-auto p-1.5", children: apps.map((app) => {
                        const active = app.id === current;
                        return ((0, jsx_runtime_1.jsx)("li", { children: (0, jsx_runtime_1.jsxs)("button", { type: "button", disabled: busy, "aria-current": active ? "page" : undefined, onClick: () => void switchTo(app.id), className: `flex w-full cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1.5 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-60 ${active
                                    ? "bg-brand/10 ring-1 ring-brand/20"
                                    : "hover:bg-ink/[0.04] dark:hover:bg-white/[0.05]"}`, children: [(0, jsx_runtime_1.jsx)("span", { className: `flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${app.tileClass}`, children: (0, jsx_runtime_1.jsx)(icons_1.AppIcon, { id: app.id, width: 14, height: 14 }) }), (0, jsx_runtime_1.jsxs)("span", { className: "min-w-0 flex-1", children: [(0, jsx_runtime_1.jsx)("span", { className: "block truncate text-[12px] font-semibold leading-tight text-ink", children: t(app.labelKey) }), (0, jsx_runtime_1.jsx)("span", { className: "mt-0.5 block truncate text-[10px] leading-snug text-muted", children: t(app.blurbKey) })] }), active ? ((0, jsx_runtime_1.jsx)(icons_1.IconCheck, { width: 14, height: 14, className: "shrink-0 text-brand" })) : ((0, jsx_runtime_1.jsx)("span", { className: "w-3.5 shrink-0", "aria-hidden": true }))] }) }, app.id));
                    }) })] }), document.body)
        : null;
    return ((0, jsx_runtime_1.jsxs)("div", { ref: rootRef, className: "relative", children: [canSwitch ? ((0, jsx_runtime_1.jsx)("button", { ref: triggerRef, type: "button", "aria-haspopup": "dialog", "aria-expanded": open, "aria-controls": open ? panelId : undefined, "aria-label": t("appSwitchTitle"), "aria-busy": busy, disabled: busy, onClick: () => {
                    setSwitchError(null);
                    setOpen((v) => !v);
                }, className: triggerClass, children: brandInner })) : ((0, jsx_runtime_1.jsx)(HomeLink, { href: currentMeta.homePath, className: triggerClass, "aria-label": t(currentMeta.labelKey), children: brandInner })), panel] }));
}

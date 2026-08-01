"use client";
import { jsx as _jsx } from "react/jsx-runtime";
export function Button({ variant = "primary", className = "", ...props }) {
    const styles = {
        primary: "bg-brand text-on-brand hover:brightness-110 disabled:opacity-50",
        secondary: "pulse-sheet text-ink hover:bg-white/[0.04] dark:hover:bg-white/[0.04] disabled:opacity-50",
        ghost: "text-ink hover:bg-white/[0.04] disabled:opacity-50",
        danger: "bg-[#B42318] text-white hover:brightness-110 disabled:opacity-50",
    }[variant];
    return (_jsx("button", { className: `inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed ${styles} ${className}`, ...props }));
}
export function Input({ className = "", ...props }) {
    return (_jsx("input", { className: `h-10 w-full rounded-xl border border-glass-border bg-sheet px-3.5 text-sm text-ink outline-none placeholder:text-muted focus:border-brand ${className}`, ...props }));
}
export function TextArea({ className = "", ...props }) {
    return (_jsx("textarea", { className: `min-h-24 w-full rounded-xl border border-glass-border bg-sheet px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-brand ${className}`, ...props }));
}
export function Label({ children }) {
    return (_jsx("label", { className: "mb-1 block text-xs font-medium tracking-wide text-muted", children: children }));
}
export function Panel({ children, className = "", }) {
    return (_jsx("div", { className: `pulse-sheet p-4 ${className}`, children: children }));
}
export function Badge({ children }) {
    return (_jsx("span", { className: "inline-flex rounded-md bg-brand/14 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand", children: children }));
}
export function Avatar({ name, photoUrl, size = 36, className = "", }) {
    const initial = (name.trim() || "U").charAt(0).toUpperCase();
    return (_jsx("div", { className: `relative shrink-0 overflow-hidden rounded-full bg-brand/14 text-brand ${className}`, style: { width: size, height: size }, children: photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        _jsx("img", { src: photoUrl, alt: "", className: "h-full w-full object-cover" })) : (_jsx("span", { className: "flex h-full w-full items-center justify-center font-display font-semibold", style: { fontSize: size * 0.36 }, children: initial })) }));
}

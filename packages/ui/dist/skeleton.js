"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from "./primitives";
export function Skeleton({ className = "", }) {
    return (_jsx("div", { className: `animate-pulse rounded-md bg-white/[0.06] dark:bg-white/[0.08] ${className}`, "aria-hidden": true }));
}
/** Table-shaped loading placeholder matching final column count. */
export function TableSkeleton({ columns = 5, rows = 8, }) {
    return (_jsx("div", { className: "-mx-4 overflow-x-auto sm:mx-0", "aria-busy": "true", children: _jsxs("table", { className: "w-full min-w-[28rem] text-left text-sm", children: [_jsx("thead", { children: _jsx("tr", { className: "border-b border-glass-border", children: Array.from({ length: columns }).map((_, i) => (_jsx("th", { className: "px-4 py-2.5", children: _jsx(Skeleton, { className: "h-3 w-16" }) }, i))) }) }), _jsx("tbody", { children: Array.from({ length: rows }).map((_, r) => (_jsx("tr", { className: "border-b border-glass-border last:border-0", children: Array.from({ length: columns }).map((_, c) => (_jsx("td", { className: "px-4 py-3", children: _jsx(Skeleton, { className: `h-4 ${c === 0 ? "w-28" : c === columns - 1 ? "w-16 ml-auto" : "w-20"}` }) }, c))) }, r))) })] }) }));
}
export function ListRowSkeleton({ rows = 6 }) {
    return (_jsx("div", { className: "space-y-2", "aria-busy": "true", children: Array.from({ length: rows }).map((_, i) => (_jsxs("div", { className: "flex items-center gap-3 rounded-xl border border-glass-border px-3 py-3", children: [_jsx(Skeleton, { className: "h-10 w-10 shrink-0 rounded-full" }), _jsxs("div", { className: "min-w-0 flex-1 space-y-2", children: [_jsx(Skeleton, { className: "h-3.5 w-1/3" }), _jsx(Skeleton, { className: "h-3 w-1/2" })] })] }, i))) }));
}
export function TreeSkeleton({ rows = 8 }) {
    return (_jsx("div", { className: "space-y-2", "aria-busy": "true", children: Array.from({ length: rows }).map((_, i) => (_jsxs("div", { className: "flex items-center gap-2 py-1.5", style: { paddingLeft: `${(i % 4) * 12}px` }, children: [_jsx(Skeleton, { className: "h-3.5 w-40" }), _jsx(Skeleton, { className: "h-3 w-14" })] }, i))) }));
}
export function TablePagination({ pageSize, showing, hasPrev, hasNext, onPrev, onNext, onPageSizeChange, pageSizeOptions = [25, 50, 100], labelShowing, labelPrev, labelNext, labelPageSize, loading = false, }) {
    return (_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 border-t border-glass-border pt-3 text-sm", children: [_jsx("p", { className: "text-muted", children: labelShowing }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [onPageSizeChange && (_jsxs("label", { className: "flex items-center gap-2 text-muted", children: [labelPageSize ?? "Rows", _jsx("select", { value: pageSize, disabled: loading, onChange: (e) => onPageSizeChange(Number(e.target.value)), className: "h-9 rounded-lg border border-glass-border bg-transparent px-2 text-ink", children: pageSizeOptions.map((n) => (_jsx("option", { value: n, children: n }, n))) })] })), _jsx(Button, { variant: "secondary", className: "h-9 px-3 text-xs", disabled: !hasPrev || loading, onClick: onPrev, children: labelPrev }), _jsx(Button, { variant: "secondary", className: "h-9 px-3 text-xs", disabled: !hasNext || loading, onClick: onNext, children: labelNext }), _jsxs("span", { className: "sr-only", children: [showing, " rows"] })] })] }));
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IconPulseMark = IconPulseMark;
exports.IconStudioMark = IconStudioMark;
exports.IconAdminMark = IconAdminMark;
exports.IconChevron = IconChevron;
exports.IconCheck = IconCheck;
exports.AppIcon = AppIcon;
const jsx_runtime_1 = require("react/jsx-runtime");
function IconPulseMark(props) {
    return ((0, jsx_runtime_1.jsx)("svg", { viewBox: "0 0 24 24", fill: "none", "aria-hidden": true, ...props, children: (0, jsx_runtime_1.jsx)("path", { d: "M4.5 12h3.2l1.6-4.5 2.4 9 2-6.5H19.5", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) }));
}
function IconStudioMark(props) {
    return ((0, jsx_runtime_1.jsxs)("svg", { viewBox: "0 0 24 24", fill: "none", "aria-hidden": true, ...props, children: [(0, jsx_runtime_1.jsx)("path", { d: "M5 8h14v11H5zM9 8V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8V8", stroke: "currentColor", strokeWidth: "1.8", strokeLinejoin: "round" }), (0, jsx_runtime_1.jsx)("path", { d: "M9 13h6M9 16.5h4", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" })] }));
}
function IconAdminMark(props) {
    return ((0, jsx_runtime_1.jsxs)("svg", { viewBox: "0 0 24 24", fill: "none", "aria-hidden": true, ...props, children: [(0, jsx_runtime_1.jsx)("path", { d: "M12 3.5 19 7v5c0 4.5-3 7.5-7 8.5-4-1-7-4-7-8.5V7l7-3.5Z", stroke: "currentColor", strokeWidth: "1.8", strokeLinejoin: "round" }), (0, jsx_runtime_1.jsx)("path", { d: "M9.5 12.2l1.8 1.8 3.4-3.5", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" })] }));
}
function IconChevron(props) {
    return ((0, jsx_runtime_1.jsx)("svg", { viewBox: "0 0 16 16", fill: "none", "aria-hidden": true, ...props, children: (0, jsx_runtime_1.jsx)("path", { d: "M4 6.2 8 10l4-3.8", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round" }) }));
}
function IconCheck(props) {
    return ((0, jsx_runtime_1.jsx)("svg", { viewBox: "0 0 16 16", fill: "none", "aria-hidden": true, ...props, children: (0, jsx_runtime_1.jsx)("path", { d: "M3.5 8.2 6.4 11l6.1-6.5", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }) }));
}
const APP_ICONS = {
    pulse: IconPulseMark,
    studio: IconStudioMark,
    admin: IconAdminMark,
};
function AppIcon({ id, ...props }) {
    const Icon = APP_ICONS[id];
    return (0, jsx_runtime_1.jsx)(Icon, { ...props });
}

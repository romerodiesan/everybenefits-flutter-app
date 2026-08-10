"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PULSE_APPS = void 0;
exports.listVisibleApps = listVisibleApps;
exports.getAppEntry = getAppEntry;
const roles_1 = require("./roles");
/** Registry of Pulse family apps. Add entries here as products launch. */
exports.PULSE_APPS = [
    {
        id: "pulse",
        labelKey: "appSwitchPulse",
        blurbKey: "appSwitchPulseBlurb",
        homePath: "/home",
        tileClass: "bg-brand/15 text-brand",
    },
    {
        id: "studio",
        labelKey: "appSwitchStudio",
        blurbKey: "appSwitchStudioBlurb",
        homePath: "/",
        tileClass: "bg-ink/[0.08] text-ink dark:bg-white/[0.1] dark:text-white",
        visible: (roleOrPermissions) => (0, roles_1.canAccessStudio)(roleOrPermissions),
    },
    {
        id: "admin",
        labelKey: "appSwitchAdmin",
        blurbKey: "appSwitchAdminBlurb",
        homePath: "/",
        tileClass: "bg-brand text-on-brand",
        visible: (roleOrPermissions) => (0, roles_1.canAccessAdmin)(roleOrPermissions),
    },
];
function listVisibleApps(roleOrPermissions) {
    return exports.PULSE_APPS.filter((app) => !app.visible || app.visible(roleOrPermissions));
}
function getAppEntry(id) {
    return exports.PULSE_APPS.find((app) => app.id === id);
}

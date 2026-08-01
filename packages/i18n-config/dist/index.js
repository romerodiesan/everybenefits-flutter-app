"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defineRouting = exports.routing = exports.locales = void 0;
const routing_1 = require("next-intl/routing");
Object.defineProperty(exports, "defineRouting", { enumerable: true, get: function () { return routing_1.defineRouting; } });
exports.locales = ["en", "es"];
exports.routing = (0, routing_1.defineRouting)({
    locales: [...exports.locales],
    defaultLocale: "en",
    localePrefix: "always",
    localeDetection: true,
});

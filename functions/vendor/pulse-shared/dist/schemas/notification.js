"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationFixtureSchema = void 0;
const zod_1 = require("zod");
exports.notificationFixtureSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    type: zod_1.z.string().min(1),
    title: zod_1.z.string(),
    body: zod_1.z.string(),
    read: zod_1.z.boolean(),
    href: zod_1.z.string().nullable().optional(),
    createdAt: zod_1.z.string().datetime().nullable(),
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orgNodeFixtureSchema = exports.orgNodeTypeSchema = void 0;
const zod_1 = require("zod");
const org_1 = require("../org");
exports.orgNodeTypeSchema = zod_1.z.enum(org_1.ORG_NODE_TYPES);
exports.orgNodeFixtureSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    type: exports.orgNodeTypeSchema,
    depth: zod_1.z.union([
        zod_1.z.literal(1),
        zod_1.z.literal(2),
        zod_1.z.literal(3),
        zod_1.z.literal(4),
        zod_1.z.literal(5),
        zod_1.z.literal(6),
        zod_1.z.literal(7),
    ]),
    parentId: zod_1.z.string().nullable(),
    path: zod_1.z.array(zod_1.z.string()),
    managerUids: zod_1.z.array(zod_1.z.string()),
    ownerUids: zod_1.z.array(zod_1.z.string()).default([]),
    logoUrl: zod_1.z.string().nullable().default(null),
    email: zod_1.z.string().nullable().default(null),
    paymentsEmail: zod_1.z.string().nullable().default(null),
    npn: zod_1.z.string().nullable().default(null),
    agencyLicense: zod_1.z.string().nullable().default(null),
    ein: zod_1.z.string().nullable().default(null),
    active: zod_1.z.boolean(),
});

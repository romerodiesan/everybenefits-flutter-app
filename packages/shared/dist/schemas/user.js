"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userProfileFixtureSchema = exports.approvalStatusSchema = exports.accountStatusSchema = exports.userRoleSchema = void 0;
const zod_1 = require("zod");
const roles_1 = require("../roles");
exports.userRoleSchema = zod_1.z.enum(roles_1.ALL_ROLES);
exports.accountStatusSchema = zod_1.z.enum([
    "active",
    "deactivated",
    "pendingDeletion",
]);
exports.approvalStatusSchema = zod_1.z.enum([
    "pending",
    "approved",
    "rejected",
]);
/** JSON-serializable profile shape for fixtures and cross-client parity. */
exports.userProfileFixtureSchema = zod_1.z.object({
    uid: zod_1.z.string().min(1),
    email: zod_1.z.string().nullable(),
    displayName: zod_1.z.string().nullable(),
    photoUrl: zod_1.z.string().nullable(),
    role: exports.userRoleSchema,
    isAnonymous: zod_1.z.boolean(),
    profileCompleted: zod_1.z.boolean(),
    productTourVersion: zod_1.z.number().int().nonnegative().optional(),
    phoneCountryCode: zod_1.z.string().nullable(),
    phoneNumber: zod_1.z.string().nullable(),
    phoneVerified: zod_1.z.boolean().optional(),
    npn: zod_1.z.string().nullable(),
    address: zod_1.z.string().nullable(),
    addressStreet: zod_1.z.string().nullable(),
    addressApt: zod_1.z.string().nullable(),
    addressCity: zod_1.z.string().nullable(),
    addressState: zod_1.z.string().nullable(),
    addressZip: zod_1.z.string().nullable(),
    agency: zod_1.z.string().nullable(),
    bio: zod_1.z.string().max(280).nullable().optional(),
    orgNodeId: zod_1.z.string().nullable().optional(),
    accountStatus: exports.accountStatusSchema.optional(),
    approvalStatus: exports.approvalStatusSchema.optional(),
    createdAt: zod_1.z.string().datetime().nullable(),
    updatedAt: zod_1.z.string().datetime().nullable(),
});

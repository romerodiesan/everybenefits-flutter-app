"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationSchema = exports.forumReplySchema = exports.forumThreadSchema = exports.orgNodeSchema = exports.userProfileSchema = exports.accountStatusSchema = exports.approvalStatusSchema = exports.userRoleSchema = void 0;
const zod_1 = require("zod");
exports.userRoleSchema = zod_1.z.enum([
    "guest",
    "student",
    "agent",
    "instructor",
    "manager",
    "admin",
]);
exports.approvalStatusSchema = zod_1.z.enum(["pending", "approved", "rejected"]);
exports.accountStatusSchema = zod_1.z.enum([
    "active",
    "deactivated",
    "pendingDeletion",
]);
exports.userProfileSchema = zod_1.z.object({
    uid: zod_1.z.string().min(1),
    email: zod_1.z.string().nullable().optional(),
    displayName: zod_1.z.string().nullable().optional(),
    photoUrl: zod_1.z.string().nullable().optional(),
    role: exports.userRoleSchema,
    isAnonymous: zod_1.z.boolean(),
    profileCompleted: zod_1.z.boolean().optional(),
    npn: zod_1.z.string().nullable().optional(),
    agency: zod_1.z.string().nullable().optional(),
    orgNodeId: zod_1.z.string().nullable().optional(),
    accountStatus: exports.accountStatusSchema.optional(),
    approvalStatus: exports.approvalStatusSchema.optional(),
});
exports.orgNodeSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    type: zod_1.z.enum([
        "organization",
        "division",
        "region",
        "agency",
        "sub_agency",
        "team",
        "unit",
    ]),
    depth: zod_1.z.number().int().min(1).max(7),
    parentId: zod_1.z.string().nullable(),
    path: zod_1.z.array(zod_1.z.string()),
    managerUids: zod_1.z.array(zod_1.z.string()),
    active: zod_1.z.boolean(),
});
exports.forumThreadSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    title: zod_1.z.string().min(1),
    body: zod_1.z.string().optional(),
    authorId: zod_1.z.string().min(1),
    authorName: zod_1.z.string().optional(),
    authorRole: zod_1.z.string().optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    acceptedReplyId: zod_1.z.string().nullable().optional(),
    replyCount: zod_1.z.number().int().optional(),
    score: zod_1.z.number().optional(),
});
exports.forumReplySchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    threadId: zod_1.z.string().min(1),
    body: zod_1.z.string().min(1),
    authorId: zod_1.z.string().min(1),
    authorName: zod_1.z.string().optional(),
    score: zod_1.z.number().optional(),
});
exports.notificationSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    type: zod_1.z.string().min(1),
    title: zod_1.z.string(),
    body: zod_1.z.string(),
    href: zod_1.z.string().optional(),
    deepLink: zod_1.z.string().optional(),
    read: zod_1.z.boolean().optional(),
});

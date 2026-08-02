"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.forumReplyFixtureSchema = exports.forumThreadFixtureSchema = void 0;
const zod_1 = require("zod");
const user_1 = require("./user");
exports.forumThreadFixtureSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    tags: zod_1.z.array(zod_1.z.string()),
    title: zod_1.z.string(),
    body: zod_1.z.string(),
    authorId: zod_1.z.string(),
    authorName: zod_1.z.string(),
    authorPhotoUrl: zod_1.z.string().nullable(),
    authorRole: user_1.userRoleSchema,
    replyCount: zod_1.z.number().int().nonnegative(),
    score: zod_1.z.number().int(),
    acceptedReplyId: zod_1.z.string().nullable(),
    createdAt: zod_1.z.string().datetime().nullable(),
    updatedAt: zod_1.z.string().datetime().nullable(),
    lastReplyAt: zod_1.z.string().datetime().nullable(),
});
exports.forumReplyFixtureSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    threadId: zod_1.z.string().min(1),
    body: zod_1.z.string(),
    authorId: zod_1.z.string(),
    authorName: zod_1.z.string(),
    authorPhotoUrl: zod_1.z.string().nullable(),
    authorRole: user_1.userRoleSchema,
    score: zod_1.z.number().int(),
    createdAt: zod_1.z.string().datetime().nullable(),
    updatedAt: zod_1.z.string().datetime().nullable(),
});

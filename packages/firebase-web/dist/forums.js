"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapForumThread = mapForumThread;
exports.mapForumReply = mapForumReply;
const shared_1 = require("@pulse/shared");
const dates_1 = require("./dates");
function mapForumThread(id, data) {
    const tags = Array.isArray(data.tags)
        ? data.tags.filter((t) => typeof t === "string")
        : [];
    return {
        id,
        tags,
        title: String(data.title ?? ""),
        body: String(data.body ?? ""),
        authorId: String(data.authorId ?? ""),
        authorName: String(data.authorName ?? ""),
        authorPhotoUrl: typeof data.authorPhotoUrl === "string" ? data.authorPhotoUrl : null,
        authorRole: (0, shared_1.parseRole)(data.authorRole),
        replyCount: Number(data.replyCount ?? 0),
        score: Number(data.score ?? 0),
        interactorCount: Number(data.interactorCount ?? 0),
        acceptedReplyId: typeof data.acceptedReplyId === "string" ? data.acceptedReplyId : null,
        createdAt: (0, dates_1.toDate)(data.createdAt),
        updatedAt: (0, dates_1.toDate)(data.updatedAt),
        lastReplyAt: (0, dates_1.toDate)(data.lastReplyAt),
    };
}
function mapForumReply(id, threadId, data) {
    return {
        id,
        threadId,
        body: String(data.body ?? ""),
        authorId: String(data.authorId ?? ""),
        authorName: String(data.authorName ?? ""),
        authorPhotoUrl: typeof data.authorPhotoUrl === "string" ? data.authorPhotoUrl : null,
        authorRole: (0, shared_1.parseRole)(data.authorRole),
        score: Number(data.score ?? 0),
        createdAt: (0, dates_1.toDate)(data.createdAt),
        updatedAt: (0, dates_1.toDate)(data.updatedAt),
    };
}

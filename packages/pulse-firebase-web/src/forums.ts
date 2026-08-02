import { parseRole, type UserRole } from "@pulse/shared";
import { toDate } from "./dates";

export type MappedForumThread = {
  id: string;
  tags: string[];
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  authorPhotoUrl: string | null;
  authorRole: UserRole;
  replyCount: number;
  score: number;
  acceptedReplyId: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  lastReplyAt: Date | null;
};

export type MappedForumReply = {
  id: string;
  threadId: string;
  body: string;
  authorId: string;
  authorName: string;
  authorPhotoUrl: string | null;
  authorRole: UserRole;
  score: number;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export function mapForumThread(
  id: string,
  data: Record<string, unknown>,
): MappedForumThread {
  const tags = Array.isArray(data.tags)
    ? data.tags.filter((t): t is string => typeof t === "string")
    : [];
  return {
    id,
    tags,
    title: String(data.title ?? ""),
    body: String(data.body ?? ""),
    authorId: String(data.authorId ?? ""),
    authorName: String(data.authorName ?? ""),
    authorPhotoUrl:
      typeof data.authorPhotoUrl === "string" ? data.authorPhotoUrl : null,
    authorRole: parseRole(data.authorRole),
    replyCount: Number(data.replyCount ?? 0),
    score: Number(data.score ?? 0),
    acceptedReplyId:
      typeof data.acceptedReplyId === "string" ? data.acceptedReplyId : null,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    lastReplyAt: toDate(data.lastReplyAt),
  };
}

export function mapForumReply(
  id: string,
  threadId: string,
  data: Record<string, unknown>,
): MappedForumReply {
  return {
    id,
    threadId,
    body: String(data.body ?? ""),
    authorId: String(data.authorId ?? ""),
    authorName: String(data.authorName ?? ""),
    authorPhotoUrl:
      typeof data.authorPhotoUrl === "string" ? data.authorPhotoUrl : null,
    authorRole: parseRole(data.authorRole),
    score: Number(data.score ?? 0),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

import { type UserRole } from "@pulse/shared";
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
    /** Unique users who interacted (author, voters, repliers). */
    interactorCount: number;
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
export declare function mapForumThread(id: string, data: Record<string, unknown>): MappedForumThread;
export declare function mapForumReply(id: string, threadId: string, data: Record<string, unknown>): MappedForumReply;
//# sourceMappingURL=forums.d.ts.map
import { z } from "zod";
export declare const forumThreadFixtureSchema: z.ZodObject<{
    id: z.ZodString;
    tags: z.ZodArray<z.ZodString>;
    title: z.ZodString;
    body: z.ZodString;
    authorId: z.ZodString;
    authorName: z.ZodString;
    authorPhotoUrl: z.ZodNullable<z.ZodString>;
    authorRole: z.ZodEnum<{
        admin: "admin";
        guest: "guest";
        system: "system";
        manager: "manager";
        agency_owner: "agency_owner";
        agent: "agent";
        student: "student";
        instructor: "instructor";
    }>;
    replyCount: z.ZodNumber;
    score: z.ZodNumber;
    acceptedReplyId: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodNullable<z.ZodString>;
    updatedAt: z.ZodNullable<z.ZodString>;
    lastReplyAt: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export declare const forumReplyFixtureSchema: z.ZodObject<{
    id: z.ZodString;
    threadId: z.ZodString;
    body: z.ZodString;
    authorId: z.ZodString;
    authorName: z.ZodString;
    authorPhotoUrl: z.ZodNullable<z.ZodString>;
    authorRole: z.ZodEnum<{
        admin: "admin";
        guest: "guest";
        system: "system";
        manager: "manager";
        agency_owner: "agency_owner";
        agent: "agent";
        student: "student";
        instructor: "instructor";
    }>;
    score: z.ZodNumber;
    createdAt: z.ZodNullable<z.ZodString>;
    updatedAt: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export type ForumThreadFixture = z.infer<typeof forumThreadFixtureSchema>;
export type ForumReplyFixture = z.infer<typeof forumReplyFixtureSchema>;
//# sourceMappingURL=forum.d.ts.map
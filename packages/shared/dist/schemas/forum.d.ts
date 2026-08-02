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
        guest: "guest";
        student: "student";
        agent: "agent";
        instructor: "instructor";
        manager: "manager";
        admin: "admin";
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
        guest: "guest";
        student: "student";
        agent: "agent";
        instructor: "instructor";
        manager: "manager";
        admin: "admin";
    }>;
    score: z.ZodNumber;
    createdAt: z.ZodNullable<z.ZodString>;
    updatedAt: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export type ForumThreadFixture = z.infer<typeof forumThreadFixtureSchema>;
export type ForumReplyFixture = z.infer<typeof forumReplyFixtureSchema>;

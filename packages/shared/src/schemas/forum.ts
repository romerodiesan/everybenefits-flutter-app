import { z } from "zod";
import { userRoleSchema } from "./user";

export const forumThreadFixtureSchema = z.object({
  id: z.string().min(1),
  tags: z.array(z.string()),
  title: z.string(),
  body: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  authorPhotoUrl: z.string().nullable(),
  authorRole: userRoleSchema,
  replyCount: z.number().int().nonnegative(),
  score: z.number().int(),
  acceptedReplyId: z.string().nullable(),
  createdAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime().nullable(),
  lastReplyAt: z.string().datetime().nullable(),
});

export const forumReplyFixtureSchema = z.object({
  id: z.string().min(1),
  threadId: z.string().min(1),
  body: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  authorPhotoUrl: z.string().nullable(),
  authorRole: userRoleSchema,
  score: z.number().int(),
  createdAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime().nullable(),
});

export type ForumThreadFixture = z.infer<typeof forumThreadFixtureSchema>;
export type ForumReplyFixture = z.infer<typeof forumReplyFixtureSchema>;

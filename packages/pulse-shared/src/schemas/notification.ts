import { z } from "zod";

export const notificationFixtureSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  title: z.string(),
  body: z.string(),
  read: z.boolean(),
  href: z.string().nullable().optional(),
  createdAt: z.string().datetime().nullable(),
});

export type NotificationFixture = z.infer<typeof notificationFixtureSchema>;

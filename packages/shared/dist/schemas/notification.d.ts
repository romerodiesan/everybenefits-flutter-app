import { z } from "zod";
export declare const notificationFixtureSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodString;
    title: z.ZodString;
    body: z.ZodString;
    read: z.ZodBoolean;
    href: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export type NotificationFixture = z.infer<typeof notificationFixtureSchema>;

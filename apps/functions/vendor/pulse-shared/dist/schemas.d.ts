import { z } from "zod";
export declare const userRoleSchema: z.ZodEnum<{
    guest: "guest";
    student: "student";
    agent: "agent";
    instructor: "instructor";
    manager: "manager";
    admin: "admin";
}>;
export declare const approvalStatusSchema: z.ZodEnum<{
    pending: "pending";
    approved: "approved";
    rejected: "rejected";
}>;
export declare const accountStatusSchema: z.ZodEnum<{
    active: "active";
    deactivated: "deactivated";
    pendingDeletion: "pendingDeletion";
}>;
export declare const userProfileSchema: z.ZodObject<{
    uid: z.ZodString;
    email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    displayName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    photoUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    role: z.ZodEnum<{
        guest: "guest";
        student: "student";
        agent: "agent";
        instructor: "instructor";
        manager: "manager";
        admin: "admin";
    }>;
    isAnonymous: z.ZodBoolean;
    profileCompleted: z.ZodOptional<z.ZodBoolean>;
    npn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    agency: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    orgNodeId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    accountStatus: z.ZodOptional<z.ZodEnum<{
        active: "active";
        deactivated: "deactivated";
        pendingDeletion: "pendingDeletion";
    }>>;
    approvalStatus: z.ZodOptional<z.ZodEnum<{
        pending: "pending";
        approved: "approved";
        rejected: "rejected";
    }>>;
}, z.core.$strip>;
export type UserProfileContract = z.infer<typeof userProfileSchema>;
export declare const orgNodeSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodEnum<{
        organization: "organization";
        division: "division";
        region: "region";
        agency: "agency";
        sub_agency: "sub_agency";
        team: "team";
        unit: "unit";
    }>;
    depth: z.ZodNumber;
    parentId: z.ZodNullable<z.ZodString>;
    path: z.ZodArray<z.ZodString>;
    managerUids: z.ZodArray<z.ZodString>;
    active: z.ZodBoolean;
}, z.core.$strip>;
export type OrgNodeContract = z.infer<typeof orgNodeSchema>;
export declare const forumThreadSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    body: z.ZodOptional<z.ZodString>;
    authorId: z.ZodString;
    authorName: z.ZodOptional<z.ZodString>;
    authorRole: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    acceptedReplyId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    replyCount: z.ZodOptional<z.ZodNumber>;
    score: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type ForumThreadContract = z.infer<typeof forumThreadSchema>;
export declare const forumReplySchema: z.ZodObject<{
    id: z.ZodString;
    threadId: z.ZodString;
    body: z.ZodString;
    authorId: z.ZodString;
    authorName: z.ZodOptional<z.ZodString>;
    score: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type ForumReplyContract = z.infer<typeof forumReplySchema>;
export declare const notificationSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodString;
    title: z.ZodString;
    body: z.ZodString;
    href: z.ZodOptional<z.ZodString>;
    deepLink: z.ZodOptional<z.ZodString>;
    read: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type NotificationContract = z.infer<typeof notificationSchema>;

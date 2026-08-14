import { z } from "zod";
export declare const userRoleSchema: z.ZodEnum<{
    admin: "admin";
    guest: "guest";
    system: "system";
    manager: "manager";
    agency_owner: "agency_owner";
    agent: "agent";
    student: "student";
    instructor: "instructor";
}>;
export declare const accountStatusSchema: z.ZodEnum<{
    active: "active";
    deactivated: "deactivated";
    pendingDeletion: "pendingDeletion";
}>;
export declare const approvalStatusSchema: z.ZodEnum<{
    pending: "pending";
    approved: "approved";
    rejected: "rejected";
}>;
/** JSON-serializable profile shape for fixtures and cross-client parity. */
export declare const userProfileFixtureSchema: z.ZodObject<{
    uid: z.ZodString;
    email: z.ZodNullable<z.ZodString>;
    displayName: z.ZodNullable<z.ZodString>;
    photoUrl: z.ZodNullable<z.ZodString>;
    role: z.ZodEnum<{
        admin: "admin";
        guest: "guest";
        system: "system";
        manager: "manager";
        agency_owner: "agency_owner";
        agent: "agent";
        student: "student";
        instructor: "instructor";
    }>;
    isAnonymous: z.ZodBoolean;
    profileCompleted: z.ZodBoolean;
    productTourVersion: z.ZodOptional<z.ZodNumber>;
    phoneCountryCode: z.ZodNullable<z.ZodString>;
    phoneNumber: z.ZodNullable<z.ZodString>;
    phoneVerified: z.ZodOptional<z.ZodBoolean>;
    npn: z.ZodNullable<z.ZodString>;
    address: z.ZodNullable<z.ZodString>;
    addressStreet: z.ZodNullable<z.ZodString>;
    addressApt: z.ZodNullable<z.ZodString>;
    addressCity: z.ZodNullable<z.ZodString>;
    addressState: z.ZodNullable<z.ZodString>;
    addressZip: z.ZodNullable<z.ZodString>;
    agency: z.ZodNullable<z.ZodString>;
    bio: z.ZodOptional<z.ZodNullable<z.ZodString>>;
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
    createdAt: z.ZodNullable<z.ZodString>;
    updatedAt: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export type UserProfileFixture = z.infer<typeof userProfileFixtureSchema>;
export type AccountStatus = z.infer<typeof accountStatusSchema>;
//# sourceMappingURL=user.d.ts.map
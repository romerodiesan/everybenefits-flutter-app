import { z } from "zod";
import { ALL_ROLES, type UserRole } from "../roles";

export const userRoleSchema = z.enum(
  ALL_ROLES as unknown as [UserRole, ...UserRole[]],
);

export const accountStatusSchema = z.enum([
  "active",
  "deactivated",
  "pendingDeletion",
]);

export const approvalStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
]);

/** JSON-serializable profile shape for fixtures and cross-client parity. */
export const userProfileFixtureSchema = z.object({
  uid: z.string().min(1),
  email: z.string().nullable(),
  displayName: z.string().nullable(),
  username: z.string().nullable().optional(),
  photoUrl: z.string().nullable(),
  role: userRoleSchema,
  isAnonymous: z.boolean(),
  profileCompleted: z.boolean(),
  productTourVersion: z.number().int().nonnegative().optional(),
  phoneCountryCode: z.string().nullable(),
  phoneNumber: z.string().nullable(),
  phoneVerified: z.boolean().optional(),
  npn: z.string().nullable(),
  address: z.string().nullable(),
  addressStreet: z.string().nullable(),
  addressApt: z.string().nullable(),
  addressCity: z.string().nullable(),
  addressState: z.string().nullable(),
  addressZip: z.string().nullable(),
  agency: z.string().nullable(),
  bio: z.string().max(280).nullable().optional(),
  orgNodeId: z.string().nullable().optional(),
  accountStatus: accountStatusSchema.optional(),
  approvalStatus: approvalStatusSchema.optional(),
  createdAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime().nullable(),
});

export type UserProfileFixture = z.infer<typeof userProfileFixtureSchema>;
export type AccountStatus = z.infer<typeof accountStatusSchema>;

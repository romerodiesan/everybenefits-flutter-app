export type { UserRole } from "@pulse/shared";

export {
  parseRole,
  canAuthorCourses,
  canAuthorPaths,
  canManageCourses,
  canEditCourse,
  canEditPath,
  belongsInDefaultAgentGroup,
  canAccessTools,
  canParticipateInForums,
  canParticipateInChats,
  canCreateChatGroups,
  canConfigureGroupAutoJoin,
  canAccessSupport,
  canAccessAdmin,
  canManagePlatform,
  ALL_ROLES,
  FORUM_ROLES,
  DEFAULT_GROUP_ROLES,
  GROUP_CREATOR_ROLES,
  GROUP_SEED_ROLES,
  needsProfileCompletion,
  validateDisplayName,
  validateNpn,
  normalizePersonName,
  requiresLicenseProfile,
  isUserApproved,
  parseApprovalStatus,
  validateUsState,
  validateUsZip,
  headlineName,
  composeUsAddress,
} from "@pulse/shared";

export type { ApprovalStatus, DisplayNameIssue, NpnIssue } from "@pulse/shared";

export function dmKeyFor(a: string, b: string) {
  return [a, b].sort().join("_");
}

export function supportChatIdFor(uid: string) {
  return `support_${uid}`;
}

export function normalizeForumTags(tags: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= 5) break;
  }
  return out;
}

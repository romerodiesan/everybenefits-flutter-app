export type { UserRole } from "@pulse/shared";

export {
  parseRole,
  canAuthorCourses,
  canEditCourse,
  belongsInDefaultAgentGroup,
  canAccessTools,
  canParticipateInForums,
  canParticipateInChats,
  canCreateChatGroups,
  canConfigureGroupAutoJoin,
  canAccessSupport,
  canAccessAdmin,
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
} from "@pulse/shared";

export type { ApprovalStatus, DisplayNameIssue, NpnIssue } from "@pulse/shared";

/** @deprecated Import from `@/lib/display-name` instead. */
export { headlineName } from "@/lib/display-name";
/** @deprecated Import from `@/lib/us-address` instead. */
export { composeUsAddress } from "@/lib/us-address";
/** @deprecated Import from `@/lib/chat-ids` instead. */
export { dmKeyFor, supportChatIdFor } from "@/lib/chat-ids";
/** @deprecated Import from `@/lib/forum-tags` instead. */
export { normalizeForumTags } from "@/lib/forum-tags";

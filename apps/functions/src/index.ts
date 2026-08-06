/**
 * Cloud Functions entry — re-exports only.
 * Domain implementations live in sibling modules.
 */
import "./init";

export {
  syncPublicProfile,
  listPublicProfiles,
  searchDirectory,
} from "./profiles";

export { bootstrapUserProfile } from "./bootstrap-user";

export {
  syncUserAutoJoinGroups,
  syncChatInbox,
  rebuildChatInbox,
  createGroupChat,
  ensureDefaultAgentGroup,
  postSupportAiMessage,
} from "./chats";

export {
  enrollInCourse,
  saveCourseProgress,
  submitQuizAttempt,
  onCoursePublished,
} from "./academy";

export {
  recordAcademyAnalytics,
  backfillCourseAnalytics,
  refreshAcademyAnalyticsRealtime,
  aggregateAcademyAnalyticsFromBigQuery,
} from "./analytics";

export {
  castForumVote,
  addForumReply,
  deleteForumReply,
  deleteForumThread,
  onThreadCreated,
} from "./forums";

export {
  setUserRole,
  setUserApproval,
  listPendingApprovals,
  listStudentsForPromotion,
} from "./roles";

export {
  markNotificationRead,
  markAllNotificationsRead,
} from "./notifications-http";

export { sendMailOutbox } from "./mail";

export {
  deactivateAccount,
  reactivateAccount,
  requestAccountDeletion,
  cancelAccountDeletion,
  purgeDeletedAccounts,
} from "./account";

export { createSsoHandoff, exchangeSsoToken } from "./sso";

export {
  listUsersForAdmin,
  adminDeactivateUser,
  adminReactivateUser,
  getAdminInsights,
} from "./admin";

export {
  ensureOrgRoot,
  listOrgSubtree,
  createOrgNode,
  updateOrgNode,
  assignUserToOrgNode,
} from "./org";

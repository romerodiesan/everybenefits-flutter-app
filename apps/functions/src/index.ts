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
  syncChatMetadataOnMessage,
  createDm,
  rebuildChatInbox,
  createGroupChat,
  ensureDefaultAgentGroup,
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
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  seedSystemRoles,
} from "./role-management";

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

export {
  listUsersForAdmin,
  adminDeactivateUser,
  adminReactivateUser,
  adminCreateUser,
  adminUpdateUser,
  getAdminInsights,
  backfillUserSearchFields,
} from "./admin";

export { validateUsAddress } from "./address";

export {
  ensureOrgRoot,
  listOrgSubtree,
  createOrgNode,
  updateOrgNode,
  assignUserToOrgNode,
  listAgenciesForProfile,
  listAgenciesForAdmin,
  listOrgNodesByType,
  migrateSubAgenciesToAgencies,
  uploadOrgLogo,
} from "./org";

export {
  bulkSetUserApproval,
  bulkSetUserAccountStatus,
  bulkSetUserRole,
  bulkAssignUsersToOrgNode,
  bulkSetOrgNodesActive,
} from "./bulk";

export {
  listCarriers,
  upsertCarrier,
  deleteCarrier,
  listCarrierStateRates,
  upsertCarrierStateRate,
  deleteCarrierStateRate,
  listPaymentsParticipants,
  upsertPaymentsParticipant,
  listBusinessRelationships,
  upsertBusinessRelationship,
  listContractTerms,
  upsertContractTerm,
  listStatements,
  getStatement,
  importStatement,
  listOverrideRuns,
  getOverrideRun,
  runOverrideCalculationFn,
} from "./payments";

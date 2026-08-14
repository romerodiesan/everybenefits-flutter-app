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

export {
  sendContactRequest,
  acceptContactRequest,
  declineContactRequest,
  cancelContactRequest,
  removeContact,
  setBlocked,
  setMuted,
  getSocialRelationship,
  listContacts,
  listIncomingContactRequests,
  onSocialBlockWritten,
} from "./social";

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
  updateAccountEmail,
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
  importCarrierStateRates,
  listPaymentsParticipants,
  listBusinessRelationships,
  upsertBusinessRelationship,
  listContractTerms,
  upsertContractTerm,
  listStatements,
  getStatement,
  importStatement,
  getPaymentsOverview,
} from "./payments";

export {
  listCompensationTiers,
  upsertCompensationTier,
  deleteCompensationTier,
  seedDefaultCompensationTiers,
  listAgentRateGroups,
  upsertAgentRateGroup,
  deleteAgentRateGroup,
  listCompensationPlans,
  upsertCompensationPlan,
  deleteCompensationPlan,
  listPlanAssignments,
  previewCompensationPlan,
  applyCompensationPlan,
  getPaymentsPlanWorkspace,
} from "./payments-compensation";

export {
  createCommissionRun,
  listCommissionRuns,
  getCommissionRun,
  listCommissionParties,
  getAgencyPayMode,
  setAgencyPayMode,
} from "./payments-commission-runs";

export {
  listPromoBanners,
  upsertPromoBanner,
  deletePromoBanner,
  uploadPromoBannerImage,
} from "./banners";

/** admin domain */
export {
  setUserRole,
  setUserApproval,
  listPendingApprovals,
  listStudentsForPromotion,
  listUsersForAdmin,
  adminDeactivateUser,
  adminReactivateUser,
  getAdminInsights,
  adminSendNotification,
  onUserPendingApproval,
  createUserInvite,
  getInvite,
  completeInvite,
} from '../lib/monolith';

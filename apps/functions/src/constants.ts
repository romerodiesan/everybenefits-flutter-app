export const DEFAULT_AGENT_GROUP_ID = "agents-default";
/** Synthetic sender for automated support replies; never a real account. */
export const SUPPORT_AI_UID = "support-ai";
export const MAX_SUPPORT_MESSAGE_CHARS = 2000;
/** Mirrors QUIZ_DEFAULT_PASS_PERCENT / kQuizDefaultPassPercent in the clients. */
export const DEFAULT_QUIZ_PASS_PERCENT = 70;
/** Upper bound on option indexes, so a hostile payload can't balloon a set. */
export const MAX_QUIZ_OPTIONS = 20;
export const MAX_GROUP_MEMBERS = 20;
export const MAX_ROLE_SEED_MEMBERS = 200;
export const MAX_FUNCTION_CALLS_PER_MINUTE = 30;
export const ACCOUNT_DELETION_GRACE_DAYS = 90;

export type VoteValue = -1 | 0 | 1;

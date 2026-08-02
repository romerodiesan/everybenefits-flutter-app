/**
 * Forums data access — thin repository over Firebase helpers.
 * UI / hooks should prefer this module over importing `lib/firebase/forums` directly.
 */
export {
  queryThreads,
  watchThread,
  watchReplies,
  createThread,
  addReply,
  castForumVote,
  updateThread,
  updateReply,
  deleteReply,
  deleteThread,
  setAcceptedReply,
  getThread,
  watchThreadVote,
  watchReplyVote,
  fetchThreadVotes,
  fetchReplyVotes,
} from "../firebase/forums";

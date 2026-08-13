import 'forum_models.dart';

/// Spotlight is proportional reach, not “best of the loaded page”.
/// A thread earns the hero only when enough of the active platform audience
/// has interacted (vote or reply; author counts via participants).
class ForumSpotlight {
  static const minAudienceShare = 0.8;
  static const minAudienceSize = 1;

  ForumSpotlight._();
}

/// Unique interactors ÷ active audience (clamped).
double forumSpotlightReachShare(ForumThread thread, int audienceSize) {
  final audience = audienceSize < 0 ? 0 : audienceSize;
  if (audience <= 0) return 0;
  final count = thread.interactorCount < 0 ? 0 : thread.interactorCount;
  final share = count / audience;
  if (share < 0) return 0;
  if (share > 1) return 1;
  return share;
}

/// True Spotlight: ≥ 80% of the active platform audience has interacted.
bool isForumSpotlightCandidate(ForumThread thread, int audienceSize) {
  if (audienceSize < ForumSpotlight.minAudienceSize) return false;
  return forumSpotlightReachShare(thread, audienceSize) >=
      ForumSpotlight.minAudienceShare;
}

/// Pick at most one Spotlight from the loaded feed.
ForumThread? pickForumSpotlight(List<ForumThread> threads, int audienceSize) {
  final candidates =
      threads.where((t) => isForumSpotlightCandidate(t, audienceSize)).toList();
  if (candidates.isEmpty) return null;

  candidates.sort((a, b) {
    final byReach = forumSpotlightReachShare(b, audienceSize)
        .compareTo(forumSpotlightReachShare(a, audienceSize));
    if (byReach != 0) return byReach;
    final byInteractors = b.interactorCount.compareTo(a.interactorCount);
    if (byInteractors != 0) return byInteractors;
    final aAccepted = a.acceptedReplyId != null ? 1 : 0;
    final bAccepted = b.acceptedReplyId != null ? 1 : 0;
    if (bAccepted != aAccepted) return bAccepted.compareTo(aAccepted);
    return b.lastReplyAt.compareTo(a.lastReplyAt);
  });
  return candidates.first;
}

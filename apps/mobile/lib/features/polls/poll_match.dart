import '../promo/promo_banner_match.dart';
import '../promo/promo_banner_models.dart';
import 'poll_models.dart';

String localizePollText(PollLocalizedString value, String locale) =>
    localizeBannerText(value, locale);

bool isPollInSchedule(Poll poll, {int? nowMs}) {
  final now = nowMs ?? DateTime.now().millisecondsSinceEpoch;
  if (poll.startsAt != null && now < poll.startsAt!) return false;
  if (poll.endsAt != null && now > poll.endsAt!) return false;
  return true;
}

bool isPollOpen(Poll poll, {int? nowMs}) {
  return poll.active && isPollInSchedule(poll, nowMs: nowMs);
}

bool isPollVisibleToViewer(
  Poll poll, {
  required String? role,
  required bool isAnonymous,
  int? nowMs,
}) {
  if (!poll.active) return false;
  if (!isPollInSchedule(poll, nowMs: nowMs)) return false;
  return bannerAudienceMatches(
    poll.audiences,
    role: role,
    isAnonymous: isAnonymous,
  );
}

List<Poll> pickPollsForSurface(
  List<Poll> polls,
  PromoBannerSurface surface, {
  required String? role,
  required bool isAnonymous,
  int? nowMs,
}) {
  final matched = polls
      .where((poll) => poll.surface == surface)
      .where(
        (poll) => isPollVisibleToViewer(
          poll,
          role: role,
          isAnonymous: isAnonymous,
          nowMs: nowMs,
        ),
      )
      .toList();
  matched.sort((a, b) => (b.updatedAt ?? 0).compareTo(a.updatedAt ?? 0));
  return matched;
}

double pollOptionShare(Poll poll, String optionId) {
  if (poll.voteCount <= 0) return 0;
  final n = poll.counts[optionId] ?? 0;
  return n < 0 ? 0 : n / poll.voteCount;
}

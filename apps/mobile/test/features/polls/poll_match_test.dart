import 'package:flutter_test/flutter_test.dart';

import 'package:every_benefits/features/polls/poll_match.dart';
import 'package:every_benefits/features/polls/poll_models.dart';
import 'package:every_benefits/features/promo/promo_banner_models.dart';

Poll _poll({
  String id = 'p1',
  PromoBannerSurface surface = PromoBannerSurface.home,
  List<String> audiences = const ['all'],
  bool active = true,
  int? startsAt,
  int? endsAt,
  int? updatedAt,
  int voteCount = 0,
  Map<String, int> counts = const {},
}) {
  return Poll(
    id: id,
    version: 1,
    active: active,
    surface: surface,
    audiences: audiences,
    question: (en: 'Q', es: 'P'),
    options: const [
      PollOption(id: 'o1', label: (en: 'A', es: 'A')),
      PollOption(id: 'o2', label: (en: 'B', es: 'B')),
    ],
    allowChange: false,
    showResultsBeforeVote: false,
    dismissible: true,
    counts: counts,
    voteCount: voteCount,
    startsAt: startsAt,
    endsAt: endsAt,
    updatedAt: updatedAt,
  );
}

void main() {
  test('pickPollsForSurface filters and sorts', () {
    final now = DateTime.utc(2024, 6, 15).millisecondsSinceEpoch;
    final polls = [
      _poll(id: 'old', updatedAt: now - 1000, audiences: const ['agent']),
      _poll(id: 'new', updatedAt: now, audiences: const ['agent']),
      _poll(
        id: 'academy',
        surface: PromoBannerSurface.academy,
        audiences: const ['agent'],
      ),
      _poll(id: 'future', startsAt: now + 10_000, audiences: const ['agent']),
      _poll(id: 'inactive', active: false, audiences: const ['agent']),
    ];
    final picked = pickPollsForSurface(
      polls,
      PromoBannerSurface.home,
      role: 'agent',
      isAnonymous: false,
      nowMs: now,
    );
    expect(picked.map((p) => p.id).toList(), ['new', 'old']);
  });

  test('pollOptionShare', () {
    expect(
      pollOptionShare(
        _poll(voteCount: 4, counts: const {'o1': 1, 'o2': 3}),
        'o2',
      ),
      0.75,
    );
    expect(pollOptionShare(_poll(), 'o1'), 0);
  });
}

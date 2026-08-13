import 'package:flutter_test/flutter_test.dart';

import 'package:every_benefits/features/forums/forum_models.dart';
import 'package:every_benefits/features/forums/forum_spotlight.dart';
import 'package:every_benefits/users/user_role.dart';

ForumThread _thread({
  required String id,
  int interactorCount = 0,
  int score = 0,
  String? acceptedReplyId,
  DateTime? lastReplyAt,
}) {
  final now = lastReplyAt ?? DateTime.utc(2024, 6, 1);
  return ForumThread(
    id: id,
    tags: const ['npn'],
    title: 'Thread $id',
    body: 'Body',
    authorId: 'a1',
    authorName: 'Ada',
    authorRole: UserRole.agent,
    replyCount: 0,
    score: score,
    interactorCount: interactorCount,
    acceptedReplyId: acceptedReplyId,
    createdAt: now,
    updatedAt: now,
    lastReplyAt: now,
  );
}

void main() {
  group('forumSpotlightReachShare', () {
    test('returns 0 for empty audience', () {
      expect(forumSpotlightReachShare(_thread(id: 't1', interactorCount: 5), 0), 0);
    });

    test('clamps to 1', () {
      expect(
        forumSpotlightReachShare(_thread(id: 't1', interactorCount: 20), 10),
        1,
      );
    });

    test('computes proportional reach', () {
      expect(
        forumSpotlightReachShare(_thread(id: 't1', interactorCount: 8), 10),
        0.8,
      );
    });
  });

  group('isForumSpotlightCandidate', () {
    test('requires min audience size', () {
      expect(
        isForumSpotlightCandidate(_thread(id: 't1', interactorCount: 1), 0),
        isFalse,
      );
    });

    test('requires 80% reach', () {
      expect(
        isForumSpotlightCandidate(_thread(id: 't1', interactorCount: 7), 10),
        isFalse,
      );
      expect(
        isForumSpotlightCandidate(_thread(id: 't1', interactorCount: 8), 10),
        isTrue,
      );
    });
  });

  group('pickForumSpotlight', () {
    test('returns null when nothing clears the bar', () {
      expect(
        pickForumSpotlight(
          [_thread(id: 't1', interactorCount: 2)],
          10,
        ),
        isNull,
      );
    });

    test('picks highest reach then interactors', () {
      final picked = pickForumSpotlight(
        [
          _thread(id: 'low', interactorCount: 8),
          _thread(id: 'high', interactorCount: 9),
          _thread(id: 'also', interactorCount: 5),
        ],
        10,
      );
      expect(picked?.id, 'high');
    });

    test('tie-breaks with accepted reply then recency', () {
      final older = DateTime.utc(2024, 1, 1);
      final newer = DateTime.utc(2024, 6, 1);
      final picked = pickForumSpotlight(
        [
          _thread(
            id: 'accepted',
            interactorCount: 8,
            acceptedReplyId: 'r1',
            lastReplyAt: older,
          ),
          _thread(
            id: 'recent',
            interactorCount: 8,
            lastReplyAt: newer,
          ),
        ],
        10,
      );
      expect(picked?.id, 'accepted');
    });
  });
}

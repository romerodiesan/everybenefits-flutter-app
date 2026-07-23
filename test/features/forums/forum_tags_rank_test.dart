import 'package:flutter_test/flutter_test.dart';

import 'package:every_benefits/features/forums/forum_models.dart';
import 'package:every_benefits/users/user_role.dart';

ForumThread _thread({
  required String id,
  required List<String> tags,
  int score = 0,
  DateTime? lastReplyAt,
}) {
  final now = lastReplyAt ?? DateTime.utc(2024, 1, 1);
  return ForumThread(
    id: id,
    tags: tags,
    title: 'T $id',
    body: 'Body',
    authorId: 'a1',
    authorName: 'Ada',
    authorRole: UserRole.agent,
    replyCount: 0,
    score: score,
    createdAt: now,
    updatedAt: now,
    lastReplyAt: now,
  );
}

void main() {
  group('rankForumTags', () {
    test('hides tags with no questions and ranks by relevance score', () {
      final ranked = rankForumTags(
        [
          _thread(id: '1', tags: ['ventas', 'npn'], score: 5),
          _thread(id: '2', tags: ['ventas'], score: 2),
          _thread(id: '3', tags: ['general'], score: 10),
        ],
        sort: ForumSort.relevant,
      );

      expect(ranked.map((t) => t.tag), ['general', 'ventas', 'npn']);
      expect(ranked.first.totalScore, 10);
      expect(ranked[1].questionCount, 2);
      expect(ranked[1].totalScore, 7);
      expect(ranked.every((t) => t.questionCount > 0), isTrue);
    });

    test('ranks by latest activity when sort is recent', () {
      final ranked = rankForumTags(
        [
          _thread(
            id: '1',
            tags: ['old'],
            score: 99,
            lastReplyAt: DateTime.utc(2024, 1, 1),
          ),
          _thread(
            id: '2',
            tags: ['new'],
            score: 0,
            lastReplyAt: DateTime.utc(2024, 6, 1),
          ),
        ],
        sort: ForumSort.recent,
      );

      expect(ranked.map((t) => t.tag), ['new', 'old']);
    });

    test('returns empty when threads have no tags', () {
      expect(
        rankForumTags([
          _thread(id: '1', tags: const []),
        ]),
        isEmpty,
      );
    });
  });
}

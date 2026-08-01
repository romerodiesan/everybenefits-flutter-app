import assert from 'node:assert/strict';
import test from 'node:test';

import { buildNotificationSeed } from './notification-seed-fixtures.mjs';

test('builds a representative notification inbox with matching counters', () => {
  const now = new Date('2026-07-26T17:00:00.000Z');
  const seed = buildNotificationSeed('demo-user', now);

  assert.equal(seed.notifications.length, 8);
  assert.deepEqual(
    new Set(seed.notifications.map((item) => item.type)),
    new Set([
      'chat_message',
      'support_message',
      'forum_reply',
      'forum_vote',
      'forum_new_thread',
      'course_published',
    ]),
  );

  const unread = seed.notifications.filter((item) => !item.read);
  const unreadForum = unread.filter((item) => item.type.startsWith('forum_'));
  assert.equal(seed.state.unreadCount, unread.length);
  assert.equal(seed.state.unreadForumCount, unreadForum.length);
  assert.equal(seed.state.lastFeedSeenAt.toISOString(), '2026-07-25T17:00:00.000Z');
  assert.ok(
    seed.notifications.every(
      (item) =>
        item.id.startsWith('seed-') &&
        item.createdAt instanceof Date &&
        item.href.startsWith('/'),
    ),
  );
});

test('keeps preview links on the inbox so dead refs never navigate', () => {
  const seed = buildNotificationSeed('demo-user');
  assert.ok(
    seed.notifications.every(
      (item) =>
        item.href === '/notifications' &&
        item.deepLink === 'pulse://notifications',
    ),
  );
});

test('requires a target user id', () => {
  assert.throws(() => buildNotificationSeed('  '), /user id/i);
});

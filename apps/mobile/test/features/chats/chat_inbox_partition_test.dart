import 'package:flutter_test/flutter_test.dart';

import 'package:every_benefits/features/chats/chat_models.dart';
import 'package:every_benefits/users/user_role.dart';

ChatConversation _chat({
  required String id,
  bool pinned = false,
  bool isDefault = false,
  String viewer = 'me',
}) {
  return ChatConversation(
    id: id,
    memberIds: [viewer, 'other'],
    memberNames: {viewer: 'Me', 'other': 'Other'},
    isGroup: isDefault || id.startsWith('g'),
    title: id,
    lastMessage: '',
    lastMessageAt: DateTime.utc(2024, 1, 1),
    createdAt: DateTime.utc(2024, 1, 1),
    createdBy: 'system',
    pinnedBy: pinned ? {viewer: true} : const {},
    isDefaultAgentGroup: isDefault,
  );
}

void main() {
  test('partitionChatInbox puts default, then pins and recent', () {
    final sections = partitionChatInbox([
      _chat(id: 'recent'),
      _chat(id: 'pinned', pinned: true),
      _chat(id: 'agents-default', isDefault: true, pinned: true),
    ], 'me');

    expect(sections.community.map((c) => c.id), ['agents-default']);
    expect(sections.pinned.map((c) => c.id), ['pinned']);
    expect(sections.recent.map((c) => c.id), ['recent']);
  });

  test('userChatIndexMemberIds returns all members', () {
    expect(userChatIndexMemberIds(['me', 'other']), ['me', 'other']);
  });

  test('canCreateChatGroups allows admin instructor manager only', () {
    expect(canCreateChatGroups(UserRole.admin), isTrue);
    expect(canCreateChatGroups(UserRole.instructor), isTrue);
    expect(canCreateChatGroups(UserRole.manager), isTrue);
    expect(canCreateChatGroups(UserRole.agent), isFalse);
    expect(canCreateChatGroups(UserRole.student), isFalse);
  });

  test('belongsInDefaultAgentGroup includes every built-in member role', () {
    expect(belongsInDefaultAgentGroup(UserRole.agent), isTrue);
    expect(belongsInDefaultAgentGroup(UserRole.instructor), isTrue);
    expect(belongsInDefaultAgentGroup(UserRole.manager), isTrue);
    expect(belongsInDefaultAgentGroup(UserRole.admin), isTrue);
    expect(belongsInDefaultAgentGroup(UserRole.student), isTrue);
  });

  test('chat administration remains admin/system only', () {
    expect(canManageChatGroups(UserRole.system), isTrue);
    expect(canManageChatGroups(UserRole.admin), isTrue);
    expect(canModerateChatMessages(UserRole.admin), isTrue);
    expect(canManageChatGroups(UserRole.manager), isFalse);
    expect(canModerateChatMessages(UserRole.instructor), isFalse);
  });

  test('staff contact access includes managers and instructors', () {
    expect(canAccessAllChatContacts(UserRole.system), isTrue);
    expect(canAccessAllChatContacts(UserRole.admin), isTrue);
    expect(canAccessAllChatContacts(UserRole.manager), isTrue);
    expect(canAccessAllChatContacts(UserRole.instructor), isTrue);
    expect(canAccessAllChatContacts(UserRole.agent), isFalse);
    expect(canAccessAllChatContacts(UserRole.student), isFalse);
  });

  test('inbox filter and query match unread groups and titles', () {
    final unread = _chat(id: 'g-unread');
    final withUnread = unread.copyWith(unreadCounts: {'me': 2});
    expect(
      chatMatchesInboxFilter(withUnread, ChatInboxFilter.unread, 'me'),
      isTrue,
    );
    expect(
      chatMatchesInboxFilter(_chat(id: 'dm'), ChatInboxFilter.groups, 'me'),
      isFalse,
    );
    expect(
      chatMatchesInboxQuery(
        _chat(id: 'g-miami'),
        'miami',
        'me',
        title: 'Miami cohort',
      ),
      isTrue,
    );
  });
}

import 'package:flutter_test/flutter_test.dart';

import 'package:every_benefits/features/chats/chat_models.dart';
import 'package:every_benefits/users/user_role.dart';

ChatConversation _chat({
  required String id,
  bool pinned = false,
  bool isDefault = false,
  bool isSupport = false,
  String viewer = 'me',
}) {
  return ChatConversation(
    id: id,
    memberIds: isSupport
        ? [viewer, ChatConversation.supportAiUid]
        : [viewer, 'other'],
    memberNames: isSupport
        ? {viewer: 'Me', ChatConversation.supportAiUid: 'Support'}
        : {viewer: 'Me', 'other': 'Other'},
    isGroup: isDefault || isSupport || id.startsWith('g'),
    title: id,
    lastMessage: '',
    lastMessageAt: DateTime.utc(2024, 1, 1),
    createdAt: DateTime.utc(2024, 1, 1),
    createdBy: isSupport ? viewer : 'system',
    pinnedBy: pinned ? {viewer: true} : const {},
    isDefaultAgentGroup: isDefault,
    isSupportChat: isSupport,
  );
}

void main() {
  test('partitionChatInbox puts support, then default, then pins and recent', () {
    final sections = partitionChatInbox(
      [
        _chat(id: 'recent'),
        _chat(id: 'pinned', pinned: true),
        _chat(id: 'agents-default', isDefault: true, pinned: true),
        _chat(id: 'support_me', isSupport: true),
      ],
      'me',
    );

    expect(sections.support.map((c) => c.id), ['support_me']);
    expect(sections.community.map((c) => c.id), ['agents-default']);
    expect(sections.pinned.map((c) => c.id), ['pinned']);
    expect(sections.recent.map((c) => c.id), ['recent']);
  });

  test('supportChatIdFor is stable per user', () {
    expect(supportChatIdFor('uid-1'), 'support_uid-1');
    expect(supportChatIdFor('abc'), 'support_abc');
  });

  test('userChatIndexMemberIds omits the synthetic support AI', () {
    expect(
      userChatIndexMemberIds(['me', ChatConversation.supportAiUid, 'other']),
      ['me', 'other'],
    );
    expect(userChatIndexMemberIds([ChatConversation.supportAiUid]), isEmpty);
  });

  test('canCreateChatGroups allows admin instructor manager only', () {
    expect(canCreateChatGroups(UserRole.admin), isTrue);
    expect(canCreateChatGroups(UserRole.instructor), isTrue);
    expect(canCreateChatGroups(UserRole.manager), isTrue);
    expect(canCreateChatGroups(UserRole.agent), isFalse);
    expect(canCreateChatGroups(UserRole.student), isFalse);
  });

  test('belongsInDefaultAgentGroup includes staff roles, not students', () {
    expect(belongsInDefaultAgentGroup(UserRole.agent), isTrue);
    expect(belongsInDefaultAgentGroup(UserRole.instructor), isTrue);
    expect(belongsInDefaultAgentGroup(UserRole.manager), isTrue);
    expect(belongsInDefaultAgentGroup(UserRole.admin), isTrue);
    expect(belongsInDefaultAgentGroup(UserRole.student), isFalse);
    expect(belongsInDefaultAgentGroup(UserRole.guest), isFalse);
  });
}

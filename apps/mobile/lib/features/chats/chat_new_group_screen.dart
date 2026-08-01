import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../app/widgets/pulse_skeleton.dart';
import '../../l10n/l10n.dart';
import '../../users/user_profile.dart';
import '../../users/user_repository.dart';
import '../../users/user_role.dart';
import 'chat_conversation_screen.dart';
import 'chat_models.dart';
import 'chat_repository.dart';
import 'widgets/chat_avatar.dart';

class ChatNewGroupScreen extends StatefulWidget {
  const ChatNewGroupScreen({
    super.key,
    required this.profile,
    required this.chatRepository,
    this.userRepository,
  });

  final UserProfile profile;
  final ChatRepository chatRepository;
  final UserRepository? userRepository;

  @override
  State<ChatNewGroupScreen> createState() => _ChatNewGroupScreenState();
}

class _ChatNewGroupScreenState extends State<ChatNewGroupScreen> {
  late final Future<List<UserProfile>> _contactsFuture;
  late final ChatRepository _chatRepo =
      widget.chatRepository;
  late final UserRepository _users =
      widget.userRepository ?? UserRepository();
  final _title = TextEditingController();
  final _selected = <String>{};
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _contactsFuture = _users.listDirectory(excludeUid: widget.profile.uid);
  }

  @override
  void dispose() {
    _title.dispose();
    super.dispose();
  }

  Future<void> _create(List<UserProfile> contacts) async {
    final l10n = context.l10n;
    final title = _title.text.trim();
    if (title.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.newGroupNeedTitle)),
      );
      return;
    }
    final members =
        contacts.where((c) => _selected.contains(c.uid)).toList(growable: false);
    if (members.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.newGroupNeedMembers)),
      );
      return;
    }
    if (members.length + 1 > 20) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.newGroupTooMany)),
      );
      return;
    }

    setState(() => _busy = true);
    try {
      final chat = await _chatRepo.createGroup(
        creator: widget.profile,
        title: title,
        members: members,
      );
      if (!mounted) return;
      await Navigator.of(context).pushReplacement(
        MaterialPageRoute<void>(
          builder: (_) => ChatConversationScreen(
            chat: chat,
            profile: widget.profile,
            chatRepository: _chatRepo,
          ),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(friendlyChatError(error, context.l10n))),
      );
      setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;
    final canCreate = canCreateChatGroups(widget.profile.role);

    return PulseScaffold(
      appBar: AppBar(
        title: Text(
          l10n.newGroupTitle,
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
      body: !canCreate
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.xl),
                child: Text(
                  l10n.errChatCannotCreateGroup,
                  textAlign: TextAlign.center,
                ),
              ),
            )
          : FutureBuilder<List<UserProfile>>(
              future: _contactsFuture,
              builder: (context, snapshot) {
                if (snapshot.hasError) {
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.xl),
                      child: Text(
                        friendlyChatError(snapshot.error!, l10n),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  );
                }
                if (!snapshot.hasData) {
                  return const PulseContactListSkeleton();
                }
                final contacts = snapshot.data!;
                // header(title+label) + contacts + footer(create)
                const headerCount = 1;
                const footerCount = 1;
                return ListView.builder(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.md,
                    AppSpacing.sm,
                    AppSpacing.md,
                    AppSpacing.xl,
                  ),
                  itemCount: headerCount + contacts.length + footerCount,
                  itemBuilder: (context, index) {
                    if (index == 0) {
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          TextField(
                            controller: _title,
                            textCapitalization: TextCapitalization.sentences,
                            decoration: InputDecoration(
                              labelText: l10n.newGroupNameLabel,
                              hintText: l10n.newGroupNameHint,
                            ),
                          ),
                          const SizedBox(height: AppSpacing.xl),
                          Text(
                            l10n.newGroupMembersHeader.toUpperCase(),
                            style: theme.textTheme.labelLarge?.copyWith(
                              color: colors.muted,
                              fontSize: 11,
                              letterSpacing: 1.1,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 10),
                        ],
                      );
                    }
                    final contactIndex = index - headerCount;
                    if (contactIndex < contacts.length) {
                      final person = contacts[contactIndex];
                      return Padding(
                        key: ValueKey(person.uid),
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Material(
                          color: colors.sheet,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(18),
                            side: BorderSide(
                              color: _selected.contains(person.uid)
                                  ? AppColors.brandOf(context)
                                  : colors.border,
                            ),
                          ),
                          clipBehavior: Clip.antiAlias,
                          child: CheckboxListTile(
                            value: _selected.contains(person.uid),
                            onChanged: _busy
                                ? null
                                : (value) {
                                    setState(() {
                                      if (value == true) {
                                        _selected.add(person.uid);
                                      } else {
                                        _selected.remove(person.uid);
                                      }
                                    });
                                  },
                            secondary: ChatAvatar(
                              initials: chatInitials(person.headlineName),
                              size: 42,
                            ),
                            title: Text(
                              person.headlineName,
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            subtitle: person.agency?.trim().isNotEmpty == true
                                ? Text(person.agency!)
                                : null,
                          ),
                        ),
                      );
                    }
                    return Padding(
                      padding: const EdgeInsets.only(top: AppSpacing.lg),
                      child: FilledButton(
                        onPressed: _busy ? null : () => _create(contacts),
                        child: _busy
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : Text(l10n.newGroupCreate),
                      ),
                    );
                  },
                );
              },
            ),
    );
  }
}

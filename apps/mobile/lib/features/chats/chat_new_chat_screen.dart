import 'dart:async';

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
import 'chat_new_group_screen.dart';
import 'chat_repository.dart';
import 'widgets/chat_avatar.dart';

class ChatNewChatScreen extends StatefulWidget {
  const ChatNewChatScreen({
    super.key,
    required this.profile,
    required this.chatRepository,
    this.userRepository,
  });

  final UserProfile profile;
  final ChatRepository chatRepository;
  final UserRepository? userRepository;

  @override
  State<ChatNewChatScreen> createState() => _ChatNewChatScreenState();
}

class _ChatNewChatScreenState extends State<ChatNewChatScreen> {
  late final ChatRepository _chatRepo =
      widget.chatRepository;
  late final UserRepository _users =
      widget.userRepository ?? UserRepository();
  final _searchController = TextEditingController();
  Timer? _debounce;
  String? _openingUid;
  List<UserProfile> _contacts = const [];
  bool _searching = false;
  String? _error;

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _onQueryChanged(String value) {
    _debounce?.cancel();
    final q = value.trim();
    if (q.length < 2) {
      setState(() {
        _contacts = const [];
        _searching = false;
        _error = null;
      });
      return;
    }
    setState(() => _searching = true);
    _debounce = Timer(const Duration(milliseconds: 280), () async {
      try {
        final results = await _users.searchDirectory(
          query: q,
          excludeUid: widget.profile.uid,
        );
        if (!mounted || _searchController.text.trim() != q) return;
        setState(() {
          _contacts = results;
          _searching = false;
          _error = null;
        });
      } catch (error) {
        if (!mounted) return;
        setState(() {
          _searching = false;
          _error = friendlyChatError(error, context.l10n);
          _contacts = const [];
        });
      }
    });
  }

  Future<void> _openDm(UserProfile other) async {
    if (_openingUid != null) return;
    setState(() => _openingUid = other.uid);
    try {
      final chat = await _chatRepo.getOrCreateDm(
        me: widget.profile,
        other: other,
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
      setState(() => _openingUid = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;
    final query = _searchController.text.trim();

    return PulseScaffold(
      appBar: AppBar(
        title: Text(
          l10n.newChatTitle,
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.md,
          AppSpacing.sm,
          AppSpacing.md,
          AppSpacing.xl,
        ),
        children: [
          if (canCreateChatGroups(widget.profile.role)) ...[
            Material(
              color: colors.sheet,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(18),
                side: BorderSide(color: colors.border),
              ),
              clipBehavior: Clip.antiAlias,
              child: ListTile(
                leading: Icon(
                  Icons.groups_rounded,
                  color: AppColors.brandOf(context),
                ),
                title: Text(
                  l10n.newChatCreateGroup,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: () {
                  Navigator.of(context).pushReplacement(
                    MaterialPageRoute<void>(
                      builder: (_) => ChatNewGroupScreen(
                        profile: widget.profile,
                        chatRepository: _chatRepo,
                        userRepository: _users,
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
          ],
          TextField(
            controller: _searchController,
            onChanged: _onQueryChanged,
            textInputAction: TextInputAction.search,
            decoration: InputDecoration(
              hintText: l10n.newChatSearchHint,
              prefixIcon: const Icon(Icons.search_rounded),
              filled: true,
              fillColor: colors.sheet,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide(color: colors.border),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide(color: colors.border),
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          if (_error != null)
            Text(
              _error!,
              style: theme.textTheme.bodyMedium?.copyWith(color: colors.muted),
            )
          else if (_searching)
            const PulseContactListSkeleton(
              shrinkWrap: true,
              itemCount: 5,
              padding: EdgeInsets.zero,
            )
          else if (query.length < 2)
            Text(
              l10n.newChatSearchHint,
              style: theme.textTheme.bodyLarge?.copyWith(
                color: colors.muted,
                height: 1.4,
              ),
            )
          else if (_contacts.isEmpty)
            Text(
              l10n.newChatEmpty,
              style: theme.textTheme.bodyLarge?.copyWith(
                color: colors.muted,
                height: 1.4,
              ),
            )
          else ...[
            Text(
              l10n.newChatContactsHeader,
              style: theme.textTheme.labelLarge?.copyWith(
                color: colors.muted,
                fontSize: 11,
                letterSpacing: 1.1,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 10),
            for (final person in _contacts) ...[
              Material(
                color: colors.sheet,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(18),
                  side: BorderSide(color: colors.border),
                ),
                clipBehavior: Clip.antiAlias,
                child: InkWell(
                  onTap: _openingUid == null ? () => _openDm(person) : null,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(12, 12, 14, 12),
                    child: Row(
                      children: [
                        ChatAvatar(
                          initials: chatInitials(person.headlineName),
                          size: 44,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                person.headlineName,
                                style: theme.textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              if ((person.email ?? '').isNotEmpty)
                                Text(
                                  person.email!,
                                  style: theme.textTheme.bodySmall?.copyWith(
                                    color: colors.muted,
                                  ),
                                ),
                            ],
                          ),
                        ),
                        if (_openingUid == person.uid)
                          const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 8),
            ],
          ],
        ],
      ),
    );
  }
}

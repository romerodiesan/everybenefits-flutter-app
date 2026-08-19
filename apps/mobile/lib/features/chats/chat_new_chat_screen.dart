import 'dart:async';

import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../app/widgets/pulse_skeleton.dart';
import '../../l10n/l10n.dart';
import '../../users/users.dart';
import 'chat_conversation_screen.dart';
import 'chat_models.dart';
import 'chat_new_group_screen.dart';
import 'chat_repository.dart';
import 'widgets/chat_avatar.dart';

class ChatNewChatScreen extends StatefulWidget {
  const ChatNewChatScreen({
    super.key,
    required this.profile,
    this.chatRepository,
    this.userRepository,
    this.socialRepository,
  });

  final UserProfile profile;
  final ChatRepository? chatRepository;
  final UserRepository? userRepository;
  final SocialRepository? socialRepository;

  @override
  State<ChatNewChatScreen> createState() => _ChatNewChatScreenState();
}

class _ChatNewChatScreenState extends State<ChatNewChatScreen> {
  Future<List<UserProfile>>? _initialPeopleFuture;
  late final ChatRepository _chatRepo =
      widget.chatRepository ?? ChatRepository();
  late final UserRepository _users = widget.userRepository ?? UserRepository();
  late final SocialRepository _social =
      widget.socialRepository ?? SocialRepository();
  String? _openingUid;
  final _search = TextEditingController();
  Timer? _searchDebounce;
  List<UserProfile>? _searchResults;
  Object? _searchError;
  var _searching = false;
  bool? _canAccessAll;

  Object get _access => AccessScope.accessOf(
    context,
    fallbackRoleId: widget.profile.roleId,
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final canAll = canAccessAllChatContacts(_access);
    if (_canAccessAll == canAll && _initialPeopleFuture != null) return;
    _canAccessAll = canAll;
    _initialPeopleFuture = canAll
        ? _users.listDirectory(excludeUid: widget.profile.uid, limit: 80)
        : _social.listContacts(limit: 18);
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    _searchDebounce?.cancel();
    final query = value.trim();
    if (query.length < 2) {
      setState(() {
        _searchResults = null;
        _searchError = null;
        _searching = false;
      });
      return;
    }
    setState(() {
      _searching = true;
      _searchError = null;
    });
    _searchDebounce = Timer(const Duration(milliseconds: 250), () async {
      try {
        final results = await _users.searchDirectory(query, limit: 24);
        if (!mounted || _search.text.trim() != query) return;
        setState(() {
          _searchResults = results;
          _searching = false;
        });
      } catch (error) {
        if (!mounted || _search.text.trim() != query) return;
        setState(() {
          _searchResults = const [];
          _searchError = error;
          _searching = false;
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
        access: _access,
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

  Future<void> _addContact(UserProfile other) async {
    if (_openingUid != null) return;
    setState(() => _openingUid = other.uid);
    try {
      await _social.sendRequest(other.uid);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(context.l10n.memberRequestSent)));
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(friendlyChatError(error, context.l10n))),
      );
    } finally {
      if (mounted) setState(() => _openingUid = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;

    return PulseScaffold(
      appBar: AppBar(
        title: Text(
          l10n.newChatTitle,
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
      body: FutureBuilder<List<UserProfile>>(
        future: _initialPeopleFuture,
        builder: (context, snapshot) {
          final canAll = _canAccessAll ?? canAccessAllChatContacts(_access);
          final initial = snapshot.data ?? const <UserProfile>[];
          final searching = _searchResults != null;
          final people = _searchResults ?? initial;
          final knownIds = {for (final person in initial) person.uid};
          return ListView(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.md,
              AppSpacing.sm,
              AppSpacing.md,
              AppSpacing.xl,
            ),
            children: [
              TextField(
                controller: _search,
                onChanged: _onSearchChanged,
                textInputAction: TextInputAction.search,
                decoration: InputDecoration(
                  hintText: l10n.newChatSearchHint,
                  prefixIcon: const Icon(Icons.search_rounded),
                  suffixIcon: _searching
                      ? const Padding(
                          padding: EdgeInsets.all(14),
                          child: SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                        )
                      : _search.text.isNotEmpty
                      ? IconButton(
                          tooltip: MaterialLocalizations.of(
                            context,
                          ).deleteButtonTooltip,
                          onPressed: () {
                            _search.clear();
                            _onSearchChanged('');
                          },
                          icon: const Icon(Icons.close_rounded),
                        )
                      : null,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              if (canCreateChatGroups(
                AccessScope.accessOf(
                  context,
                  fallbackRoleId: widget.profile.roleId,
                ),
              )) ...[
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
              Text(
                searching
                    ? l10n.newChatSearchResults
                    : canAll
                    ? l10n.peopleDirectoryTitle.toUpperCase()
                    : l10n.newChatContactsHeader,
                style: theme.textTheme.labelLarge?.copyWith(
                  color: colors.muted,
                  fontSize: 11,
                  letterSpacing: 1.1,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 10),
              if (snapshot.connectionState != ConnectionState.done &&
                  _searchResults == null)
                const PulseContactListSkeleton()
              else if (_searchError != null ||
                  (_searchResults == null && snapshot.hasError))
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: AppSpacing.xl),
                  child: Text(
                    friendlyChatError(_searchError ?? snapshot.error!, l10n),
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: colors.muted,
                    ),
                  ),
                )
              else if (people.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: AppSpacing.xl),
                  child: Text(
                    _searchResults == null
                        ? (canAll ? l10n.newChatEmpty : l10n.chatsNeedContacts)
                        : l10n.newChatSearchEmpty,
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodyLarge?.copyWith(
                      color: colors.muted,
                      height: 1.4,
                    ),
                  ),
                ),
              for (final person in people) ...[
                Builder(
                  builder: (context) {
                    final canMessage =
                        canAll || !searching || knownIds.contains(person.uid);
                    return Material(
                      color: colors.sheet,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(18),
                        side: BorderSide(color: colors.border),
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: InkWell(
                        onTap: _openingUid == null
                            ? () => canMessage
                                  ? _openDm(person)
                                  : _addContact(person)
                            : null,
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(12, 12, 14, 12),
                          child: Row(
                            children: [
                              ChatAvatar(
                                initials: chatInitials(person.headlineName),
                                name: person.headlineName,
                                photoUrl: person.photoUrl,
                                size: 46,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      person.headlineName,
                                      style: theme.textTheme.titleMedium
                                          ?.copyWith(
                                            fontWeight: FontWeight.w800,
                                            letterSpacing: -0.2,
                                          ),
                                    ),
                                    if (person.handle.isNotEmpty ||
                                        person.agency?.trim().isNotEmpty ==
                                            true) ...[
                                      const SizedBox(height: 2),
                                      Text(
                                        person.handle.isNotEmpty
                                            ? '@${person.handle}'
                                            : person.agency!,
                                        style: theme.textTheme.bodySmall
                                            ?.copyWith(
                                              color: colors.muted,
                                              fontWeight: FontWeight.w500,
                                            ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                              if (_openingUid == person.uid)
                                const SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              else
                                Icon(
                                  canMessage
                                      ? Icons.chevron_right_rounded
                                      : Icons.person_add_outlined,
                                  color: colors.muted.withValues(alpha: 0.7),
                                ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 8),
              ],
            ],
          );
        },
      ),
    );
  }
}

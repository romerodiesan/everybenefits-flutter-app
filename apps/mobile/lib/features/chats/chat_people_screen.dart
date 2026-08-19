import 'dart:async';

import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/pulse_haptics.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../app/widgets/pulse_skeleton.dart';
import '../../l10n/l10n.dart';
import '../../users/users.dart';
import '../profile/public_profile_screen.dart';
import 'chat_conversation_screen.dart';
import 'chat_models.dart';
import 'chat_repository.dart';
import 'widgets/chat_avatar.dart';

class ChatPeopleScreen extends StatefulWidget {
  const ChatPeopleScreen({
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
  State<ChatPeopleScreen> createState() => _ChatPeopleScreenState();
}

class _ChatPeopleScreenState extends State<ChatPeopleScreen> {
  late final ChatRepository _chats = widget.chatRepository ?? ChatRepository();
  late final UserRepository _users = widget.userRepository ?? UserRepository();
  late final SocialRepository _social =
      widget.socialRepository ?? SocialRepository();
  late final Stream<List<ChatConversation>> _chatStream = _chats.watchChats(
    widget.profile.uid,
  );
  Future<List<UserProfile>>? _initialPeople;
  bool? _canAccessAll;

  final _search = TextEditingController();
  Timer? _debounce;
  List<UserProfile>? _results;
  Object? _searchError;
  String? _openingUid;
  var _searching = false;

  bool get _showingSearch => _search.text.trim().length >= 2;

  Object get _access => AccessScope.accessOf(
    context,
    fallbackRoleId: widget.profile.roleId,
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final canAll = canAccessAllChatContacts(_access);
    if (_canAccessAll == canAll && _initialPeople != null) return;
    _canAccessAll = canAll;
    _initialPeople = canAll
        ? _users.listDirectory(excludeUid: widget.profile.uid, limit: 80)
        : _social.listContacts(limit: 18);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  void _onSearchChanged(String raw) {
    _debounce?.cancel();
    final query = raw.trim();
    if (query.length < 2) {
      setState(() {
        _results = null;
        _searchError = null;
        _searching = false;
      });
      return;
    }
    setState(() {
      _searching = true;
      _searchError = null;
    });
    _debounce = Timer(const Duration(milliseconds: 250), () async {
      try {
        final results = await _users.searchDirectory(query, limit: 30);
        if (!mounted || _search.text.trim() != query) return;
        setState(() {
          _results = results;
          _searching = false;
        });
      } catch (error) {
        if (!mounted || _search.text.trim() != query) return;
        setState(() {
          _results = const [];
          _searchError = error;
          _searching = false;
        });
      }
    });
  }

  Future<void> _openExistingChat(ChatConversation chat) async {
    PulseHaptics.light();
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ChatConversationScreen(
          chat: chat,
          profile: widget.profile,
          chatRepository: _chats,
        ),
      ),
    );
  }

  Future<void> _openDm(UserProfile other) async {
    if (_openingUid != null) return;
    PulseHaptics.light();
    setState(() => _openingUid = other.uid);
    try {
      final chat = await _chats.getOrCreateDm(
        me: widget.profile,
        other: other,
        access: _access,
      );
      if (!mounted) return;
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => ChatConversationScreen(
            chat: chat,
            profile: widget.profile,
            chatRepository: _chats,
          ),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(friendlyChatError(error, context.l10n))),
      );
    } finally {
      if (mounted) setState(() => _openingUid = null);
    }
  }

  Future<void> _addContact(UserProfile other) async {
    if (_openingUid != null) return;
    PulseHaptics.light();
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

  void _openProfile(String uid) {
    PulseHaptics.selection();
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PublicProfileScreen(
          uid: uid,
          viewer: widget.profile,
          chatRepository: _chats,
          socialRepository: _social,
        ),
      ),
    );
  }

  List<ChatConversation> _recentDms(List<ChatConversation> chats) {
    return chats
        .where(
          (chat) => !chat.isGroup && chat.peerId(widget.profile.uid) != null,
        )
        .take(6)
        .toList(growable: false);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = context.l10n;

    return PulseScaffold(
      appBar: AppBar(
        title: Text(
          l10n.peopleTitle,
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w900,
          ),
        ),
      ),
      body: StreamBuilder<List<ChatConversation>>(
        stream: _chatStream,
        builder: (context, chatsSnapshot) {
          final recent = _recentDms(chatsSnapshot.data ?? const []);
          final recentIds = recent
              .map((chat) => chat.peerId(widget.profile.uid))
              .whereType<String>()
              .toSet();

          return FutureBuilder<List<UserProfile>>(
            future: _initialPeople,
            builder: (context, peopleSnapshot) {
              final canAll = _canAccessAll ?? canAccessAllChatContacts(_access);
              final initial = (peopleSnapshot.data ?? const <UserProfile>[])
                  .where((person) => !recentIds.contains(person.uid))
                  .toList(growable: false);
              final people = _showingSearch ? (_results ?? const []) : initial;
              final knownIds = {
                ...recentIds,
                ...initial.map((person) => person.uid),
              };

              return ListView(
                padding: EdgeInsets.fromLTRB(
                  AppSpacing.md,
                  AppSpacing.sm,
                  AppSpacing.md,
                  pulseShellListBottomPad(context),
                ),
                children: [
                  _PeopleSearchHero(
                    controller: _search,
                    searching: _searching,
                    onChanged: _onSearchChanged,
                    onClear: () {
                      _search.clear();
                      _onSearchChanged('');
                    },
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  if (!_showingSearch) ...[
                    _SectionHeading(
                      title: l10n.peopleRecentTitle,
                      icon: Icons.bolt_rounded,
                    ),
                    const SizedBox(height: 10),
                    if (!chatsSnapshot.hasData)
                      const _RecentPeopleSkeleton()
                    else if (recent.isEmpty)
                      _PeopleEmptyCard(
                        icon: Icons.forum_outlined,
                        message: l10n.peopleNoRecent,
                      )
                    else
                      SizedBox(
                        height: 154,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: recent.length,
                          separatorBuilder: (_, _) => const SizedBox(width: 10),
                          itemBuilder: (context, index) {
                            final chat = recent[index];
                            final uid = chat.peerId(widget.profile.uid)!;
                            return _RecentPersonCard(
                              chat: chat,
                              viewerUid: widget.profile.uid,
                              onProfile: () => _openProfile(uid),
                              onMessage: () => _openExistingChat(chat),
                            );
                          },
                        ),
                      ),
                    const SizedBox(height: AppSpacing.xl),
                  ],
                  _SectionHeading(
                    title: _showingSearch
                        ? l10n.peopleSearchResults
                        : canAll
                        ? l10n.peopleDirectoryTitle
                        : l10n.peopleContactsTitle,
                    icon: _showingSearch
                        ? Icons.travel_explore_rounded
                        : Icons.people_alt_rounded,
                  ),
                  const SizedBox(height: 10),
                  if (_showingSearch && _searching && _results == null)
                    const PulseContactListSkeleton(itemCount: 4)
                  else if (!_showingSearch && !peopleSnapshot.hasData)
                    const PulseContactListSkeleton(itemCount: 5)
                  else if (_searchError != null)
                    _PeopleEmptyCard(
                      icon: Icons.cloud_off_outlined,
                      message: friendlyChatError(_searchError!, l10n),
                    )
                  else if (people.isEmpty)
                    _PeopleEmptyCard(
                      icon: _showingSearch
                          ? Icons.person_search_outlined
                          : Icons.group_add_outlined,
                      message: _showingSearch
                          ? l10n.peopleSearchEmpty
                          : l10n.peopleNoContacts,
                    )
                  else
                    for (final person in people) ...[
                      _PersonRow(
                        person: person,
                        opening: _openingUid == person.uid,
                        onProfile: () => _openProfile(person.uid),
                        onMessage:
                            canAll ||
                                !_showingSearch ||
                                knownIds.contains(person.uid)
                            ? () => _openDm(person)
                            : null,
                        onAdd:
                            !canAll &&
                                _showingSearch &&
                                !knownIds.contains(person.uid)
                            ? () => _addContact(person)
                            : null,
                      ),
                      const SizedBox(height: 8),
                    ],
                ],
              );
            },
          );
        },
      ),
    );
  }
}

class _PeopleSearchHero extends StatelessWidget {
  const _PeopleSearchHero({
    required this.controller,
    required this.searching,
    required this.onChanged,
    required this.onClear,
  });

  final TextEditingController controller;
  final bool searching;
  final ValueChanged<String> onChanged;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final l10n = context.l10n;

    return Container(
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(26),
        border: Border.all(color: brand.withValues(alpha: 0.28)),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [brand.withValues(alpha: 0.2), colors.sheet, colors.meshDeep],
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.14),
            blurRadius: 24,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l10n.peopleHeroEyebrow.toUpperCase(),
            style: theme.textTheme.labelSmall?.copyWith(
              color: brand,
              letterSpacing: 1.6,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            l10n.peopleHeroTitle,
            style: theme.textTheme.headlineMedium?.copyWith(
              fontWeight: FontWeight.w900,
              letterSpacing: -0.8,
            ),
          ),
          const SizedBox(height: 5),
          Text(
            l10n.peopleHeroBody,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: colors.muted,
              height: 1.35,
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: controller,
            onChanged: onChanged,
            textInputAction: TextInputAction.search,
            decoration: InputDecoration(
              hintText: l10n.newChatSearchHint,
              prefixIcon: const Icon(Icons.search_rounded),
              suffixIcon: searching
                  ? const Padding(
                      padding: EdgeInsets.all(14),
                      child: SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    )
                  : controller.text.isNotEmpty
                  ? IconButton(
                      tooltip: MaterialLocalizations.of(
                        context,
                      ).deleteButtonTooltip,
                      onPressed: onClear,
                      icon: const Icon(Icons.close_rounded),
                    )
                  : null,
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionHeading extends StatelessWidget {
  const _SectionHeading({required this.title, required this.icon});

  final String title;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Row(
      children: [
        Icon(icon, size: 18, color: AppColors.brandOf(context)),
        const SizedBox(width: 8),
        Text(
          title.toUpperCase(),
          style: Theme.of(context).textTheme.labelLarge?.copyWith(
            color: colors.muted,
            fontSize: 11,
            letterSpacing: 1.15,
            fontWeight: FontWeight.w900,
          ),
        ),
      ],
    );
  }
}

class _RecentPersonCard extends StatelessWidget {
  const _RecentPersonCard({
    required this.chat,
    required this.viewerUid,
    required this.onProfile,
    required this.onMessage,
  });

  final ChatConversation chat;
  final String viewerUid;
  final VoidCallback onProfile;
  final VoidCallback onMessage;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final name = chat.titleFor(viewerUid, l10n: context.l10n);
    return SizedBox(
      width: 136,
      child: Material(
        color: colors.sheet,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(22),
          side: BorderSide(color: colors.border),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onProfile,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 13, 12, 10),
            child: Column(
              children: [
                ChatAvatar(
                  initials: chat.initialsFor(viewerUid),
                  name: name,
                  photoUrl: chat.inboxPhotoUrl(viewerUid),
                  size: 54,
                ),
                const SizedBox(height: 9),
                Text(
                  name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(
                    context,
                  ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
                ),
                const Spacer(),
                SizedBox(
                  height: 34,
                  width: double.infinity,
                  child: FilledButton.tonalIcon(
                    onPressed: onMessage,
                    icon: const Icon(Icons.chat_bubble_rounded, size: 15),
                    label: Text(context.l10n.peopleMessageAction),
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      textStyle: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _PersonRow extends StatelessWidget {
  const _PersonRow({
    required this.person,
    required this.opening,
    required this.onProfile,
    this.onMessage,
    this.onAdd,
  });

  final UserProfile person;
  final bool opening;
  final VoidCallback onProfile;
  final VoidCallback? onMessage;
  final VoidCallback? onAdd;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final subtitle = person.handle.isNotEmpty
        ? '@${person.handle}'
        : person.agency?.trim().isNotEmpty == true
        ? person.agency!
        : roleLabelForId(person.roleId, context.l10n);

    return Material(
      color: colors.sheet,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(color: colors.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onProfile,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 11, 10, 11),
          child: Row(
            children: [
              ChatAvatar(
                initials: chatInitials(person.headlineName),
                name: person.headlineName,
                photoUrl: person.photoUrl,
                size: 48,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      person.headlineName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.25,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colors.muted,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              if (opening)
                const Padding(
                  padding: EdgeInsets.all(10),
                  child: SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                )
              else
                IconButton.filledTonal(
                  tooltip: onAdd != null
                      ? context.l10n.memberAddContact
                      : context.l10n.peopleMessageAction,
                  onPressed: onAdd ?? onMessage,
                  icon: Icon(
                    onAdd != null
                        ? Icons.person_add_outlined
                        : Icons.chat_bubble_outline_rounded,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PeopleEmptyCard extends StatelessWidget {
  const _PeopleEmptyCard({required this.icon, required this.message});

  final IconData icon;
  final String message;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.xl,
      ),
      decoration: BoxDecoration(
        color: colors.sheet,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: colors.border),
      ),
      child: Column(
        children: [
          Icon(icon, size: 30, color: colors.muted),
          const SizedBox(height: 10),
          Text(
            message,
            textAlign: TextAlign.center,
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(color: colors.muted, height: 1.4),
          ),
        ],
      ),
    );
  }
}

class _RecentPeopleSkeleton extends StatelessWidget {
  const _RecentPeopleSkeleton();

  @override
  Widget build(BuildContext context) {
    return const SizedBox(
      height: 154,
      child: Row(
        children: [
          Expanded(child: _RecentSkeletonCard()),
          SizedBox(width: 10),
          Expanded(child: _RecentSkeletonCard()),
          SizedBox(width: 10),
          Expanded(child: _RecentSkeletonCard()),
        ],
      ),
    );
  }
}

class _RecentSkeletonCard extends StatelessWidget {
  const _RecentSkeletonCard();

  @override
  Widget build(BuildContext context) {
    return const Column(
      children: [
        PulseSkeleton(width: 54, height: 54, shape: BoxShape.circle),
        SizedBox(height: 10),
        PulseSkeleton(width: 72, height: 12),
        SizedBox(height: 14),
        PulseSkeleton(width: double.infinity, height: 34, borderRadius: 999),
      ],
    );
  }
}

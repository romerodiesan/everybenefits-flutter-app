import 'dart:async';

import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/pulse_haptics.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../l10n/l10n.dart';
import '../../users/users.dart';
import '../profile/public_profile_screen.dart';
import 'chat_group_photo.dart';
import 'chat_models.dart';
import 'chat_repository.dart';
import 'widgets/chat_avatar.dart';

const _memberPageSize = 24;

class ChatContactInfoScreen extends StatefulWidget {
  const ChatContactInfoScreen({
    super.key,
    required this.chat,
    required this.profile,
    this.chatRepository,
    this.socialRepository,
    this.userRepository,
  });

  final ChatConversation chat;
  final UserProfile profile;
  final ChatRepository? chatRepository;
  final SocialRepository? socialRepository;
  final UserRepository? userRepository;

  @override
  State<ChatContactInfoScreen> createState() => _ChatContactInfoScreenState();
}

class _ChatContactInfoScreenState extends State<ChatContactInfoScreen> {
  late final ChatRepository _repo = widget.chatRepository ?? ChatRepository();
  late final SocialRepository _social =
      widget.socialRepository ?? SocialRepository();
  late final UserRepository _users =
      widget.userRepository ?? UserRepository();
  final _search = TextEditingController();
  final _hydrated = <String, UserProfile>{};
  final _inflight = <String>{};
  final _missing = <String>{};
  var _busy = false;
  var _shown = _memberPageSize;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Object get _access => AccessScope.accessOf(
    context,
    fallbackRoleId: widget.profile.roleId,
  );

  bool get _canManage => canManageChatGroups(_access);

  Future<void> _togglePin(ChatConversation chat) async {
    if (_busy) return;
    PulseHaptics.selection();
    setState(() => _busy = true);
    try {
      final pinned = !chat.isPinnedFor(widget.profile.uid);
      await _repo.setPinned(
        chatId: chat.id,
        uid: widget.profile.uid,
        pinned: pinned,
      );
    } catch (error) {
      _showError(error);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _showError(Object error) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(friendlyChatError(error, context.l10n))),
    );
  }

  void _hydrate(ChatConversation chat, String memberId) {
    final named = chat.memberNames[memberId]?.trim();
    final hasName = named != null && named.isNotEmpty && named != memberId;
    final hasPhoto = chat.photoOf(memberId) != null;
    if ((hasName && hasPhoto) ||
        _hydrated.containsKey(memberId) ||
        _inflight.contains(memberId) ||
        _missing.contains(memberId)) {
      return;
    }
    _inflight.add(memberId);
    _social
        .fetchPublicProfile(memberId)
        .then((profile) {
          if (!mounted) return;
          _inflight.remove(memberId);
          if (profile == null) {
            _missing.add(memberId);
            return;
          }
          setState(() => _hydrated[memberId] = profile);
        })
        .catchError((_) {
          _inflight.remove(memberId);
          _missing.add(memberId);
        });
  }

  List<String> _filteredMembers(ChatConversation chat) {
    final uid = widget.profile.uid;
    final query = _search.text.trim().toLowerCase();
    bool matches(String id) {
      if (query.isEmpty) return true;
      final profile = _hydrated[id];
      final name = (profile?.headlineName ?? chat.memberNames[id] ?? id)
          .toLowerCase();
      final handle = (profile?.handle ?? chat.memberUsernames[id] ?? '')
          .toLowerCase();
      return name.contains(query) ||
          handle.contains(query) ||
          id.toLowerCase().contains(query);
    }

    final ids = chat.memberIds.where(matches).toList();
    ids.sort((a, b) {
      if (a == uid) return -1;
      if (b == uid) return 1;
      final na = (_hydrated[a]?.headlineName ?? chat.memberNames[a] ?? a)
          .toLowerCase();
      final nb = (_hydrated[b]?.headlineName ?? chat.memberNames[b] ?? b)
          .toLowerCase();
      return na.compareTo(nb);
    });
    return ids;
  }

  Future<void> _saveGroup(
    ChatConversation chat, {
    String? title,
    Iterable<String>? memberIds,
    String? photoUrl,
  }) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await _repo.updateGroup(
        chatId: chat.id,
        title: (title ?? chat.title ?? '').trim(),
        memberIds: memberIds ?? chat.memberIds,
        photoUrl: photoUrl,
      );
    } catch (error) {
      _showError(error);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _changePhoto(ChatConversation chat) async {
    final url = await pickAndUploadGroupPhoto(
      context: context,
      chatId: chat.id,
    );
    if (url == null || !mounted) return;
    await _saveGroup(chat, photoUrl: url);
  }

  Future<void> _rename(ChatConversation chat) async {
    final l10n = context.l10n;
    final controller = TextEditingController(text: chat.title ?? '');
    final next = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.newGroupNameLabel),
        content: TextField(
          controller: controller,
          autofocus: true,
          maxLength: 120,
          decoration: InputDecoration(labelText: l10n.newGroupNameLabel),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(MaterialLocalizations.of(context).cancelButtonLabel),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: Text(l10n.chatSaveGroup),
          ),
        ],
      ),
    );
    controller.dispose();
    if (next == null || next.isEmpty || next == chat.title) return;
    await _saveGroup(chat, title: next);
  }

  Future<void> _removeMember(ChatConversation chat, String memberId) async {
    if (memberId == widget.profile.uid || chat.memberIds.length <= 1) return;
    final l10n = context.l10n;
    final ok =
        await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: Text(l10n.chatRemoveMember),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: Text(MaterialLocalizations.of(context).cancelButtonLabel),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(context, true),
                child: Text(l10n.chatRemoveMember),
              ),
            ],
          ),
        ) ??
        false;
    if (!ok) return;
    await _saveGroup(
      chat,
      memberIds: chat.memberIds.where((id) => id != memberId),
    );
  }

  Future<void> _addMembers(ChatConversation chat) async {
    final added = await showModalBottomSheet<Set<String>>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) => _AddMemberSheet(
        userRepository: _users,
        already: chat.memberIds.toSet(),
      ),
    );
    if (added == null || added.isEmpty) return;
    await _saveGroup(chat, memberIds: {...chat.memberIds, ...added});
  }

  void _openMember(String memberId) {
    if (memberId == widget.profile.uid) return;
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PublicProfileScreen(
          uid: memberId,
          viewer: widget.profile,
          chatRepository: _repo,
          socialRepository: _social,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;
    final uid = widget.profile.uid;

    return PulseScaffold(
      appBar: AppBar(
        title: Text(
          l10n.chatInfoTitle,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      body: StreamBuilder<ChatConversation?>(
        stream: _repo.watchChat(widget.chat.id),
        initialData: widget.chat,
        builder: (context, snapshot) {
          final chat = snapshot.data ?? widget.chat;
          final pinned = chat.isPinnedFor(uid);
          final filtered = _filteredMembers(chat);
          final visible = filtered.take(_shown).toList();
          final hasMore = visible.length < filtered.length;
          final subtitle = chat.isDefaultAgentGroup
              ? l10n.chatsDefaultGroupBadge
              : (chat.isGroup ? l10n.chatTypeGroup : l10n.chatTypePrivate);

          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.md,
                  AppSpacing.sm,
                  AppSpacing.md,
                  0,
                ),
                child: Row(
                  children: [
                    GestureDetector(
                      onTap: chat.isGroup && _canManage && !_busy
                          ? () => _changePhoto(chat)
                          : null,
                      child: Stack(
                        clipBehavior: Clip.none,
                        children: [
                          ChatAvatar(
                            initials: chat.initialsFor(uid, l10n: l10n),
                            name: chat.titleFor(uid, l10n: l10n),
                            photoUrl: chat.inboxPhotoUrl(uid),
                            isGroup: chat.isGroup,
                            size: 52,
                          ),
                          if (chat.isGroup && _canManage)
                            Positioned(
                              right: -2,
                              bottom: -2,
                              child: Container(
                                width: 18,
                                height: 18,
                                decoration: BoxDecoration(
                                  color: AppColors.brandOf(context),
                                  shape: BoxShape.circle,
                                  border: Border.all(color: colors.canvas),
                                ),
                                child: const Icon(
                                  Icons.photo_camera_rounded,
                                  size: 10,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: InkWell(
                        onTap: chat.isGroup && _canManage
                            ? () => _rename(chat)
                            : null,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              chat.titleFor(uid, l10n: l10n),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w700,
                                letterSpacing: -0.2,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              chat.isGroup
                                  ? '$subtitle · ${l10n.chatMemberCount(chat.memberIds.length)}'
                                  : subtitle,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: colors.muted,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    if (!chat.isDefaultAgentGroup)
                      IconButton(
                        tooltip: pinned ? l10n.chatUnpin : l10n.chatPin,
                        onPressed: _busy ? null : () => _togglePin(chat),
                        icon: Icon(
                          pinned
                              ? Icons.push_pin_rounded
                              : Icons.push_pin_outlined,
                          size: 20,
                        ),
                      ),
                  ],
                ),
              ),
              if (!chat.isGroup)
                Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.md,
                    4,
                    AppSpacing.md,
                    0,
                  ),
                  child: TextButton.icon(
                    onPressed: () {
                      final other = chat.memberIds
                          .where((id) => id != uid)
                          .toList();
                      if (other.isEmpty) return;
                      _openMember(other.first);
                    },
                    icon: const Icon(Icons.person_outline_rounded, size: 18),
                    label: Text(l10n.memberViewProfile),
                  ),
                ),
              if (chat.isGroup) ...[
                Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.md,
                    AppSpacing.md,
                    AppSpacing.md,
                    AppSpacing.xs,
                  ),
                  child: TextField(
                    controller: _search,
                    onChanged: (_) => setState(() => _shown = _memberPageSize),
                    textInputAction: TextInputAction.search,
                    decoration: InputDecoration(
                      isDense: true,
                      hintText: l10n.chatsFindMembers,
                      prefixIcon: const Icon(
                        Icons.person_search_rounded,
                        size: 20,
                      ),
                      suffixIcon: _search.text.isNotEmpty
                          ? IconButton(
                              tooltip: MaterialLocalizations.of(
                                context,
                              ).deleteButtonTooltip,
                              onPressed: () {
                                _search.clear();
                                setState(() => _shown = _memberPageSize);
                              },
                              icon: const Icon(Icons.close_rounded, size: 18),
                            )
                          : null,
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.md,
                    4,
                    AppSpacing.md,
                    6,
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          l10n.chatCurrentMembers,
                          style: theme.textTheme.labelLarge?.copyWith(
                            color: colors.muted,
                            fontSize: 11,
                            letterSpacing: 1.05,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      if (_canManage)
                        TextButton.icon(
                          onPressed: _busy ? null : () => _addMembers(chat),
                          icon: const Icon(Icons.person_add_alt_1_rounded, size: 16),
                          label: Text(l10n.chatAddMember),
                        ),
                    ],
                  ),
                ),
                Expanded(
                  child: visible.isEmpty
                      ? Center(
                          child: Text(
                            l10n.peopleSearchEmpty,
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: colors.muted,
                            ),
                          ),
                        )
                      : Column(
                          children: [
                            Expanded(
                              child: ListView.builder(
                                padding: const EdgeInsets.fromLTRB(
                                  AppSpacing.xs,
                                  0,
                                  AppSpacing.xs,
                                  AppSpacing.sm,
                                ),
                                itemCount: visible.length,
                                itemBuilder: (context, index) {
                                  final memberId = visible[index];
                                  _hydrate(chat, memberId);
                                  final profile = _hydrated[memberId];
                                  final name =
                                      profile?.headlineName ??
                                      chat.memberNames[memberId] ??
                                      memberId;
                                  final handle =
                                      profile?.handle ??
                                      chat.memberUsernames[memberId];
                                  final photo =
                                      profile?.photoUrl ??
                                      chat.photoOf(memberId);
                                  return ListTile(
                                    dense: true,
                                    visualDensity: VisualDensity.compact,
                                    leading: ChatAvatar(
                                      initials: chatInitials(name),
                                      name: name,
                                      photoUrl: photo,
                                      size: 32,
                                    ),
                                    title: Text(
                                      name,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: theme.textTheme.bodyMedium
                                          ?.copyWith(
                                            fontWeight: FontWeight.w600,
                                          ),
                                    ),
                                    subtitle:
                                        handle != null && handle.isNotEmpty
                                        ? Text(
                                            '@$handle',
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: theme.textTheme.labelSmall
                                                ?.copyWith(color: colors.muted),
                                          )
                                        : null,
                                    trailing:
                                        _canManage &&
                                            memberId != uid &&
                                            chat.memberIds.length > 1
                                        ? IconButton(
                                            tooltip: l10n.chatRemoveMember,
                                            onPressed: _busy
                                                ? null
                                                : () => _removeMember(
                                                    chat,
                                                    memberId,
                                                  ),
                                            icon: const Icon(
                                              Icons
                                                  .remove_circle_outline_rounded,
                                              size: 20,
                                            ),
                                          )
                                        : null,
                                    onTap: memberId == uid
                                        ? null
                                        : () => _openMember(memberId),
                                  );
                                },
                              ),
                            ),
                            if (hasMore)
                              Padding(
                                padding: const EdgeInsets.fromLTRB(
                                  AppSpacing.md,
                                  0,
                                  AppSpacing.md,
                                  AppSpacing.md,
                                ),
                                child: TextButton(
                                  onPressed: () => setState(
                                    () => _shown += _memberPageSize,
                                  ),
                                  child: Text(l10n.chatLoadMoreMembers),
                                ),
                              ),
                          ],
                        ),
                ),
              ] else
                const Spacer(),
            ],
          );
        },
      ),
    );
  }
}

class _AddMemberSheet extends StatefulWidget {
  const _AddMemberSheet({
    required this.userRepository,
    required this.already,
  });

  final UserRepository userRepository;
  final Set<String> already;

  @override
  State<_AddMemberSheet> createState() => _AddMemberSheetState();
}

class _AddMemberSheetState extends State<_AddMemberSheet> {
  final _search = TextEditingController();
  final _picked = <String, UserProfile>{};
  Timer? _debounce;
  List<UserProfile> _results = const [];
  var _searching = false;

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  void _find(String raw) {
    _debounce?.cancel();
    final query = raw.trim();
    if (query.length < 2) {
      setState(() {
        _results = const [];
        _searching = false;
      });
      return;
    }
    setState(() => _searching = true);
    _debounce = Timer(const Duration(milliseconds: 250), () async {
      try {
        final found = await widget.userRepository.searchDirectory(
          query,
          limit: 24,
        );
        if (!mounted || _search.text.trim() != query) return;
        setState(() {
          _results = found
              .where((person) => !widget.already.contains(person.uid))
              .toList();
          _searching = false;
        });
      } catch (_) {
        if (!mounted || _search.text.trim() != query) return;
        setState(() {
          _results = const [];
          _searching = false;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final colors = AppColors.of(context);
    return Padding(
      padding: EdgeInsets.fromLTRB(
        AppSpacing.md,
        0,
        AppSpacing.md,
        MediaQuery.viewInsetsOf(context).bottom + AppSpacing.lg,
      ),
      child: SizedBox(
        height: 420,
        child: Column(
          children: [
            TextField(
              controller: _search,
              autofocus: true,
              onChanged: _find,
              decoration: InputDecoration(
                hintText: l10n.newChatSearchHint,
                prefixIcon: const Icon(Icons.person_search_rounded),
                suffixIcon: _searching
                    ? const Padding(
                        padding: EdgeInsets.all(14),
                        child: SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      )
                    : null,
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: ListView.builder(
                itemCount: _results.length,
                itemBuilder: (context, index) {
                  final person = _results[index];
                  final selected = _picked.containsKey(person.uid);
                  return ListTile(
                    dense: true,
                    leading: ChatAvatar(
                      initials: chatInitials(person.headlineName),
                      name: person.headlineName,
                      photoUrl: person.photoUrl,
                      size: 32,
                    ),
                    title: Text(person.headlineName),
                    subtitle: person.handle.isEmpty
                        ? null
                        : Text('@${person.handle}'),
                    trailing: Icon(
                      selected
                          ? Icons.check_circle_rounded
                          : Icons.add_circle_outline_rounded,
                      color: selected
                          ? AppColors.brandOf(context)
                          : colors.muted,
                    ),
                    onTap: () => setState(() {
                      if (!_picked.containsKey(person.uid)) {
                        _picked[person.uid] = person;
                      } else {
                        _picked.remove(person.uid);
                      }
                    }),
                  );
                },
              ),
            ),
            FilledButton(
              onPressed: _picked.isEmpty
                  ? null
                  : () => Navigator.pop(context, _picked.keys.toSet()),
              child: Text(l10n.chatAddMember),
            ),
          ],
        ),
      ),
    );
  }
}

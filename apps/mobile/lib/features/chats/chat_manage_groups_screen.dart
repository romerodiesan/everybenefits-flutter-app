import 'dart:async';

import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../app/widgets/pulse_skeleton.dart';
import '../../l10n/l10n.dart';
import '../../users/user_profile.dart';
import '../../users/user_repository.dart';
import 'chat_group_photo.dart';
import 'chat_models.dart';
import 'chat_repository.dart';
import 'widgets/chat_avatar.dart';

const _memberPageSize = 24;

class ChatManageGroupsScreen extends StatefulWidget {
  const ChatManageGroupsScreen({
    super.key,
    required this.profile,
    required this.chatRepository,
    required this.userRepository,
  });

  final UserProfile profile;
  final ChatRepository chatRepository;
  final UserRepository userRepository;

  @override
  State<ChatManageGroupsScreen> createState() => _ChatManageGroupsScreenState();
}

class _ChatManageGroupsScreenState extends State<ChatManageGroupsScreen> {
  late Future<List<ChatConversation>> _groups;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    _groups = widget.chatRepository.listManagedGroups();
  }

  Future<void> _open(ChatConversation chat) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ChatEditGroupScreen(
          chat: chat,
          chatRepository: widget.chatRepository,
          userRepository: widget.userRepository,
        ),
      ),
    );
    if (!mounted) return;
    setState(_reload);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final colors = AppColors.of(context);
    return PulseScaffold(
      appBar: AppBar(title: Text(l10n.chatManageGroupsTitle)),
      body: FutureBuilder<List<ChatConversation>>(
        future: _groups,
        builder: (context, snapshot) {
          if (!snapshot.hasData && !snapshot.hasError) {
            return const PulseChatListSkeleton();
          }
          if (snapshot.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.xl),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      friendlyChatError(snapshot.error!, l10n),
                      textAlign: TextAlign.center,
                      style: TextStyle(color: colors.muted),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    FilledButton.tonalIcon(
                      onPressed: () => setState(_reload),
                      icon: const Icon(Icons.refresh_rounded),
                      label: Text(l10n.actionRetry),
                    ),
                  ],
                ),
              ),
            );
          }
          final groups = snapshot.data ?? const [];
          if (groups.isEmpty) {
            return Center(child: Text(l10n.chatManageGroupsEmpty));
          }
          return RefreshIndicator(
            onRefresh: () async {
              setState(_reload);
              await _groups;
            },
            child: ListView.separated(
              padding: const EdgeInsets.all(AppSpacing.md),
              itemCount: groups.length,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final chat = groups[index];
                return PulseSheet(
                  padding: EdgeInsets.zero,
                  child: ListTile(
                    leading: ChatAvatar(
                      initials: chatInitials(chat.title ?? 'Group'),
                      name: chat.title ?? l10n.chatTypeGroup,
                      photoUrl: chat.photoUrl,
                      isGroup: true,
                      size: 46,
                    ),
                    title: Text(
                      chat.title ?? l10n.chatTypeGroup,
                      style: const TextStyle(fontWeight: FontWeight.w800),
                    ),
                    subtitle: Text(
                      chat.isDefaultAgentGroup
                          ? l10n.chatsDefaultGroupBadge
                          : l10n.chatMemberCount(chat.memberIds.length),
                    ),
                    trailing: const Icon(Icons.chevron_right_rounded),
                    onTap: () => _open(chat),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}

class ChatEditGroupScreen extends StatefulWidget {
  const ChatEditGroupScreen({
    super.key,
    required this.chat,
    required this.chatRepository,
    required this.userRepository,
  });

  final ChatConversation chat;
  final ChatRepository chatRepository;
  final UserRepository userRepository;

  @override
  State<ChatEditGroupScreen> createState() => _ChatEditGroupScreenState();
}

class _ChatEditGroupScreenState extends State<ChatEditGroupScreen> {
  late final TextEditingController _title;
  final _search = TextEditingController();
  late final Set<String> _selected;
  late String? _photoUrl;
  Timer? _debounce;
  List<UserProfile> _results = const [];
  var _searching = false;
  var _busy = false;
  var _shown = _memberPageSize;

  @override
  void initState() {
    super.initState();
    _title = TextEditingController(text: widget.chat.title ?? '');
    _selected = widget.chat.memberIds.toSet();
    _photoUrl = widget.chat.photoUrl;
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _title.dispose();
    _search.dispose();
    super.dispose();
  }

  void _find(String value) {
    _debounce?.cancel();
    final query = value.trim();
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
          _results = found;
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

  Future<void> _changePhoto() async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      final url = await pickAndUploadGroupPhoto(
        context: context,
        chatId: widget.chat.id,
      );
      if (url == null || !mounted) return;
      setState(() => _photoUrl = url);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _save() async {
    if (_busy || _title.text.trim().isEmpty || _selected.isEmpty) return;
    setState(() => _busy = true);
    try {
      await widget.chatRepository.updateGroup(
        chatId: widget.chat.id,
        title: _title.text,
        memberIds: _selected,
        photoUrl: _photoUrl,
      );
      if (mounted) Navigator.of(context).pop();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(friendlyChatError(error, context.l10n))),
      );
      setState(() => _busy = false);
    }
  }

  Future<bool> _confirm(String title, String body) async {
    return await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: Text(title),
            content: Text(body),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: Text(
                  MaterialLocalizations.of(context).cancelButtonLabel,
                ),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(context, true),
                child: Text(context.l10n.chatDeleteConfirmAction),
              ),
            ],
          ),
        ) ??
        false;
  }

  Future<void> _clear() async {
    final l10n = context.l10n;
    if (!await _confirm(
      l10n.chatClearHistoryTitle,
      l10n.chatClearHistoryBody,
    )) {
      return;
    }
    setState(() => _busy = true);
    try {
      await widget.chatRepository.clearMessages(widget.chat.id);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(l10n.chatHistoryCleared)));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _delete() async {
    final l10n = context.l10n;
    if (!await _confirm(l10n.chatDeleteGroupTitle, l10n.chatDeleteGroupBody)) {
      return;
    }
    setState(() => _busy = true);
    try {
      await widget.chatRepository.deleteGroup(widget.chat.id);
      if (mounted) Navigator.of(context).pop();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final colors = AppColors.of(context);
    return PulseScaffold(
      appBar: AppBar(
        title: Text(l10n.chatEditGroupTitle),
        actions: [
          TextButton(
            onPressed: _busy ? null : _save,
            child: Text(l10n.chatSaveGroup),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          Center(
            child: GestureDetector(
              onTap: _busy ? null : _changePhoto,
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  ChatAvatar(
                    initials: chatInitials(_title.text.trim().isEmpty
                        ? (widget.chat.title ?? 'Group')
                        : _title.text),
                    name: _title.text.trim().isEmpty
                        ? (widget.chat.title ?? l10n.chatTypeGroup)
                        : _title.text,
                    photoUrl: _photoUrl,
                    isGroup: true,
                    size: 72,
                  ),
                  Positioned(
                    right: -2,
                    bottom: -2,
                    child: Container(
                      width: 22,
                      height: 22,
                      decoration: BoxDecoration(
                        color: AppColors.brandOf(context),
                        shape: BoxShape.circle,
                        border: Border.all(color: colors.canvas, width: 2),
                      ),
                      child: const Icon(
                        Icons.photo_camera_rounded,
                        size: 12,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 6),
          Center(
            child: Text(
              l10n.chatChangeGroupPhoto,
              style: Theme.of(
                context,
              ).textTheme.labelSmall?.copyWith(color: colors.muted),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          TextField(
            controller: _title,
            maxLength: 120,
            decoration: InputDecoration(labelText: l10n.newGroupNameLabel),
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            l10n.chatCurrentMembers,
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          ..._selected.take(_shown).map((uid) {
            return ListTile(
              contentPadding: EdgeInsets.zero,
              leading: ChatAvatar(
                initials: chatInitials(widget.chat.memberNames[uid] ?? uid),
                name: widget.chat.memberNames[uid] ?? uid,
                photoUrl: widget.chat.photoOf(uid),
                size: 40,
              ),
              title: Text(widget.chat.memberNames[uid] ?? uid),
              subtitle: widget.chat.memberUsernames[uid] == null
                  ? null
                  : Text('@${widget.chat.memberUsernames[uid]}'),
              trailing: IconButton(
                tooltip: l10n.chatRemoveMember,
                onPressed: _selected.length == 1
                    ? null
                    : () => setState(() => _selected.remove(uid)),
                icon: const Icon(Icons.remove_circle_outline_rounded),
              ),
            );
          }),
          if (_selected.length > _shown)
            TextButton(
              onPressed: () => setState(() => _shown += _memberPageSize),
              child: Text(l10n.chatLoadMoreMembers),
            ),
          const Divider(height: AppSpacing.xl),
          TextField(
            controller: _search,
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
          for (final person in _results)
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: ChatAvatar(
                initials: chatInitials(person.headlineName),
                name: person.headlineName,
                photoUrl: person.photoUrl,
                size: 40,
              ),
              title: Text(person.headlineName),
              subtitle: person.handle.isEmpty
                  ? null
                  : Text('@${person.handle}'),
              trailing: Icon(
                _selected.contains(person.uid)
                    ? Icons.check_circle_rounded
                    : Icons.add_circle_outline_rounded,
                color: _selected.contains(person.uid)
                    ? AppColors.brandOf(context)
                    : colors.muted,
              ),
              onTap: () => setState(() {
                if (!_selected.add(person.uid)) {
                  _selected.remove(person.uid);
                } else if (_shown < _selected.length) {
                  _shown = _selected.length;
                }
              }),
            ),
          const SizedBox(height: AppSpacing.xl),
          OutlinedButton.icon(
            onPressed: _busy ? null : _clear,
            icon: const Icon(Icons.delete_sweep_outlined),
            label: Text(l10n.chatClearHistory),
          ),
          if (!widget.chat.isDefaultAgentGroup) ...[
            const SizedBox(height: 8),
            FilledButton.icon(
              onPressed: _busy ? null : _delete,
              style: FilledButton.styleFrom(
                backgroundColor: Theme.of(context).colorScheme.error,
              ),
              icon: const Icon(Icons.delete_forever_outlined),
              label: Text(l10n.chatDeleteGroup),
            ),
          ],
        ],
      ),
    );
  }
}

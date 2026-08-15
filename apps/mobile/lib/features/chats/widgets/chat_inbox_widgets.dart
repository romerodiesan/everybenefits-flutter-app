import 'package:flutter/material.dart';
import 'package:flutter_slidable/flutter_slidable.dart';

import '../../../app/pulse_haptics.dart';
import '../../../app/theme.dart';
import '../../../l10n/l10n.dart';
import '../chat_models.dart';
import 'chat_avatar.dart';

class ChatInboxSearchBar extends StatelessWidget {
  const ChatInboxSearchBar({
    super.key,
    required this.controller,
    required this.onChanged,
  });

  final TextEditingController controller;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;
    return TextField(
      controller: controller,
      onChanged: onChanged,
      textInputAction: TextInputAction.search,
      decoration: InputDecoration(
        hintText: l10n.chatsSearchHint,
        hintStyle: theme.textTheme.bodyMedium?.copyWith(color: colors.muted),
        prefixIcon: Icon(Icons.search_rounded, color: colors.muted),
        filled: true,
        fillColor: colors.glassFill,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: colors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: colors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: AppColors.brandOf(context), width: 1.4),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        isDense: true,
      ),
    );
  }
}

class ChatInboxFilterChips extends StatelessWidget {
  const ChatInboxFilterChips({
    super.key,
    required this.value,
    required this.onChanged,
  });

  final ChatInboxFilter value;
  final ValueChanged<ChatInboxFilter> onChanged;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        _chip(context, ChatInboxFilter.all, l10n.chatsFilterAll),
        _chip(context, ChatInboxFilter.unread, l10n.chatsFilterUnread),
        _chip(context, ChatInboxFilter.groups, l10n.chatsFilterGroups),
      ],
    );
  }

  Widget _chip(BuildContext context, ChatInboxFilter filter, String label) {
    final selected = value == filter;
    final brand = AppColors.brandOf(context);
    final colors = AppColors.of(context);
    return FilterChip(
      selected: selected,
      label: Text(label),
      onSelected: (_) {
        PulseHaptics.selection();
        onChanged(filter);
      },
      showCheckmark: false,
      selectedColor: brand.withValues(alpha: 0.16),
      side: BorderSide(
        color: selected ? brand.withValues(alpha: 0.4) : colors.border,
      ),
      labelStyle: Theme.of(context).textTheme.labelLarge?.copyWith(
            fontWeight: FontWeight.w700,
            fontSize: 12,
            color: selected ? brand : colors.ink,
          ),
    );
  }
}

class ChatCommunityHero extends StatelessWidget {
  const ChatCommunityHero({
    super.key,
    required this.chat,
    required this.viewerUid,
    required this.selected,
    required this.onTap,
  });

  final ChatConversation chat;
  final String viewerUid;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final l10n = context.l10n;
    final title = chat.titleFor(viewerUid, l10n: l10n);
    final unread = chat.unreadFor(viewerUid);
    final preview = chat.lastMessage.isEmpty
        ? l10n.chatsDefaultGroupBadge
        : chat.lastMessage;

    return Material(
      color: selected ? brand.withValues(alpha: 0.12) : colors.sheet,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(22),
        side: BorderSide(
          color: selected ? brand.withValues(alpha: 0.4) : colors.border,
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
          child: Row(
            children: [
              ChatAvatar(
                initials: chat.initialsFor(viewerUid, l10n: l10n),
                name: title,
                photoUrl: chat.inboxPhotoUrl(viewerUid),
                isGroup: true,
                size: 58,
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: brand.withValues(alpha: 0.14),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        l10n.chatsDefaultGroupBadge.toUpperCase(),
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: brand,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.8,
                          fontSize: 10,
                        ),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.4,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      preview,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: colors.muted,
                        height: 1.3,
                      ),
                    ),
                  ],
                ),
              ),
              if (unread > 0) ...[
                const SizedBox(width: 8),
                _UnreadBadge(count: unread),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class ChatPinnedRail extends StatelessWidget {
  const ChatPinnedRail({
    super.key,
    required this.chats,
    required this.viewerUid,
    required this.selectedId,
    required this.onTap,
  });

  final List<ChatConversation> chats;
  final String viewerUid;
  final String? selectedId;
  final ValueChanged<ChatConversation> onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          l10n.chatsSectionPinned.toUpperCase(),
          style: theme.textTheme.labelLarge?.copyWith(
            color: colors.muted,
            fontSize: 11,
            letterSpacing: 1.1,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 10),
        SizedBox(
          height: 86,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: chats.length,
            separatorBuilder: (_, _) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              final chat = chats[index];
              final title = chat.titleFor(viewerUid, l10n: l10n);
              final selected = selectedId == chat.id;
              return InkWell(
                onTap: () => onTap(chat),
                borderRadius: BorderRadius.circular(16),
                child: SizedBox(
                  width: 72,
                  child: Column(
                    children: [
                      DecoratedBox(
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: selected
                              ? Border.all(
                                  color: AppColors.brandOf(context),
                                  width: 2,
                                )
                              : null,
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(2),
                          child: ChatAvatar(
                            initials: chat.initialsFor(viewerUid, l10n: l10n),
                            name: title,
                            photoUrl: chat.inboxPhotoUrl(viewerUid),
                            isGroup: chat.isGroup,
                            size: 52,
                          ),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.center,
                        style: theme.textTheme.labelSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class ChatInboxRow extends StatelessWidget {
  const ChatInboxRow({
    super.key,
    required this.chat,
    required this.viewerUid,
    required this.onTap,
    required this.swipeEnabled,
    required this.onPin,
    required this.onDelete,
    this.selected = false,
    this.dense = false,
  });

  final ChatConversation chat;
  final String viewerUid;
  final VoidCallback onTap;
  final bool swipeEnabled;
  final VoidCallback onPin;
  final VoidCallback onDelete;
  final bool selected;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final l10n = context.l10n;
    final unread = chat.unreadFor(viewerUid);
    final hasUnread = unread > 0;
    final pinned = chat.isPinnedFor(viewerUid);
    final title = chat.titleFor(viewerUid, l10n: l10n);
    var preview = chat.isDefaultAgentGroup && chat.lastMessage.isEmpty
        ? l10n.chatsDefaultGroupBadge
        : (chat.lastMessage.isEmpty
            ? l10n.chatsNoMessagesYet
            : chat.lastMessage);
    if (chat.lastMessage.isNotEmpty &&
        chat.lastMessageSenderId == viewerUid) {
      preview = l10n.chatYouPrefix(preview);
    }

    final tile = Material(
      color: selected ? brand.withValues(alpha: 0.08) : Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: EdgeInsets.fromLTRB(4, dense ? 8 : 10, 4, dense ? 8 : 10),
          child: Row(
            children: [
              ChatAvatar(
                initials: chat.initialsFor(viewerUid, l10n: l10n),
                name: title,
                photoUrl: chat.inboxPhotoUrl(viewerUid),
                isGroup: chat.isGroup,
                size: dense ? 44 : 50,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        if (pinned) ...[
                          Icon(
                            Icons.push_pin_rounded,
                            size: 13,
                            color: colors.muted,
                          ),
                          const SizedBox(width: 4),
                        ],
                        Expanded(
                          child: Text(
                            title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: hasUnread
                                  ? FontWeight.w800
                                  : FontWeight.w700,
                              letterSpacing: -0.2,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          formatChatTime(chat.lastMessageAt, l10n),
                          style: theme.textTheme.labelLarge?.copyWith(
                            color: hasUnread ? brand : colors.muted,
                            fontSize: 11.5,
                            fontWeight:
                                hasUnread ? FontWeight.w800 : FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            preview,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: hasUnread
                                  ? colors.ink.withValues(alpha: 0.78)
                                  : colors.muted,
                              fontWeight:
                                  hasUnread ? FontWeight.w600 : FontWeight.w500,
                              fontSize: 13.5,
                            ),
                          ),
                        ),
                        if (hasUnread) ...[
                          const SizedBox(width: 8),
                          _UnreadBadge(count: unread),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );

    if (!swipeEnabled) return tile;

    return Slidable(
      key: ValueKey('slide-${chat.id}'),
      startActionPane: ActionPane(
        motion: const DrawerMotion(),
        extentRatio: 0.28,
        children: [
          CustomSlidableAction(
            onPressed: (_) => onPin(),
            backgroundColor: brand,
            foregroundColor: AppColors.onBrandOf(context),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  pinned ? Icons.push_pin_outlined : Icons.push_pin_rounded,
                  size: 22,
                ),
                const SizedBox(height: 4),
                Text(
                  pinned ? l10n.chatUnpin : l10n.chatPin,
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    height: 1.15,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      endActionPane: ActionPane(
        motion: const DrawerMotion(),
        extentRatio: 0.28,
        children: [
          CustomSlidableAction(
            onPressed: (_) => onDelete(),
            backgroundColor: const Color(0xFFB42318),
            foregroundColor: Colors.white,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.delete_outline_rounded, size: 22),
                const SizedBox(height: 4),
                Text(
                  l10n.chatDelete,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      child: tile,
    );
  }
}

class _UnreadBadge extends StatelessWidget {
  const _UnreadBadge({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final brand = AppColors.brandOf(context);
    return Container(
      constraints: const BoxConstraints(minWidth: 22),
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: brand,
        borderRadius: BorderRadius.circular(999),
      ),
      alignment: Alignment.center,
      child: Text(
        '$count',
        style: theme.textTheme.labelLarge?.copyWith(
          color: AppColors.onBrandOf(context),
          fontSize: 11,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

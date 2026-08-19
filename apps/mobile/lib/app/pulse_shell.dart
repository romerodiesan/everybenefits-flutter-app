import 'dart:async';

import 'package:flutter/material.dart';

import '../auth/auth.dart';
import '../features/chats/chat_models.dart';
import '../features/chats/chat_repository.dart';
import '../features/chats/chats_screen.dart';
import '../features/forums/forum_repository.dart';
import '../features/forums/forums_screen.dart';
import '../features/notifications/notification_repository.dart';
import '../features/notifications/notifications_screen.dart';
import '../features/profile/profile_screen.dart';
import '../features/university/course_repository.dart';
import '../features/university/course_search_screen.dart';
import '../features/university/university_screen.dart';
import '../features/product_tour/product_tour_overlay.dart';
import '../l10n/l10n.dart';
import '../users/users.dart';
import 'layout/pulse_breakpoints.dart';
import 'pulse_haptics.dart';
import 'widgets/lifebuoy_icon.dart';
import 'widgets/pulse_chrome.dart';

/// App shell: forums home, chats, academy, profile.
class PulseShell extends StatefulWidget {
  const PulseShell({
    super.key,
    required this.authService,
    required this.userRepository,
    required this.profile,
    this.forumRepository,
    this.chatRepository,
    this.courseRepository,
    this.notificationRepository,
  });

  final AuthService authService;
  final UserRepository userRepository;
  final UserProfile profile;
  final ForumRepository? forumRepository;
  final ChatRepository? chatRepository;
  final CourseRepository? courseRepository;
  final NotificationRepository? notificationRepository;

  @override
  State<PulseShell> createState() => PulseShellState();
}

typedef HomeShell = PulseShell;
typedef HomeShellState = PulseShellState;

class PulseShellState extends State<PulseShell> {
  int _index = 0;

  final _forumsKey = GlobalKey<ForumsScreenState>();
  final _chatsKey = GlobalKey<ChatsScreenState>();
  final _profileKey = GlobalKey<ProfileScreenState>();
  late final NotificationRepository _notifications;
  late final ChatRepository _chatRepoFallback;
  final _subs = <StreamSubscription<dynamic>>[];

  int _chatUnread = 0;
  int _forumBadge = 0;
  int _notifUnread = 0;

  final _tourBarKey = GlobalKey();
  final _tourHomeKey = GlobalKey();
  final _tourChatsKey = GlobalKey();
  final _tourAcademyKey = GlobalKey();
  final _tourProfileKey = GlobalKey();

  static const _tabCount = 4;

  int get currentIndex => _index;

  static PulseShellState? _active;

  static PulseShellState? get maybeActive => _active;

  @override
  void initState() {
    super.initState();
    _notifications = widget.notificationRepository ?? NotificationRepository();
    _chatRepoFallback = widget.chatRepository ?? ChatRepository();
    _active = this;
    _bindBadgeStreams();
  }

  void _bindBadgeStreams() {
    final profile = widget.profile;
    if (!profile.isRegisteredMember) return;
    final chatRepo = _chatRepoFallback;
    _subs.add(
      chatRepo.watchChats(profile.uid).listen((chats) {
        if (!mounted) return;
        final sum = chats.fold<int>(
          0,
          (acc, chat) => acc + chat.unreadFor(profile.uid),
        );
        setState(() => _chatUnread = sum);
      }, onError: (_) {}),
    );
    _subs.add(
      _notifications.watchState(profile.uid).listen((state) async {
        final newThreads = await _notifications.countNewFeedThreads(
          state.lastFeedSeenAt,
        );
        if (!mounted) return;
        setState(() {
          _notifUnread = state.unreadCount;
          _forumBadge = state.unreadForumCount + newThreads;
        });
      }, onError: (_) {}),
    );
    unawaited(_notifications.registerPushToken(profile.uid));
  }

  @override
  void dispose() {
    if (_active == this) _active = null;
    for (final sub in _subs) {
      sub.cancel();
    }
    super.dispose();
  }

  void selectTab(int index) {
    final next = index.clamp(0, _tabCount - 1);
    if (next == _index) return;
    setState(() => _index = next);
    if (next == 0 && !widget.profile.isAnonymous) {
      _notifications.markFeedSeen(widget.profile.uid);
    }
  }

  void openForumThread(String threadId) {
    selectTab(0);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _forumsKey.currentState?.openThreadById(threadId);
    });
  }

  void openChatConversation(ChatConversation chat) {
    selectTab(1);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _chatsKey.currentState?.selectConversation(chat);
    });
  }

  Future<void> openChatById(String chatId, ChatRepository chats) async {
    selectTab(1);
    ChatConversation? chat;
    try {
      chat = await chats.watchChat(chatId).first;
    } catch (_) {
      chat = null;
    }
    if (!mounted || chat == null) return;
    _chatsKey.currentState?.selectConversation(chat);
  }

  void _openNotifications() {
    if (widget.profile.isAnonymous) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(context.l10n.notificationsSignIn)));
      return;
    }
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => NotificationsScreen(
          uid: widget.profile.uid,
          profile: widget.profile,
          forumRepository: widget.forumRepository,
          chatRepository: _chatRepoFallback,
          courseRepository: widget.courseRepository,
        ),
      ),
    );
  }

  static List<PulseTabItem> _navItems(
    AppLocalizations l10n, {
    int chatUnread = 0,
    int forumBadge = 0,
    GlobalKey? homeKey,
    GlobalKey? chatsKey,
    GlobalKey? academyKey,
    GlobalKey? profileKey,
  }) => [
    PulseTabItem(
      label: l10n.navHome,
      icon: Icons.home_outlined,
      selectedIcon: Icons.home_rounded,
      badgeCount: forumBadge,
      tourKey: homeKey,
    ),
    PulseTabItem(
      label: l10n.navChats,
      icon: Icons.chat_bubble_outline_rounded,
      selectedIcon: Icons.chat_bubble_rounded,
      badgeCount: chatUnread,
      tourKey: chatsKey,
    ),
    PulseTabItem(
      label: l10n.navAcademy,
      icon: Icons.school_outlined,
      selectedIcon: Icons.school_rounded,
      tourKey: academyKey,
    ),
    PulseTabItem(
      label: l10n.navProfile,
      icon: Icons.person_outline_rounded,
      selectedIcon: Icons.person_rounded,
      badgeCount: 0,
      tourKey: profileKey,
    ),
  ];

  _ShellFabConfig? _fabConfig(AppLocalizations l10n) {
    final profile = widget.profile;
    final access = AccessScope.accessOf(
      context,
      fallbackRoleId: profile.roleId,
    );
    switch (_index) {
      case 0:
        if (!canParticipateInForums(
          roleOrPermissions: access,
          isAnonymous: profile.isAnonymous,
        )) {
          return null;
        }
        return _ShellFabConfig(
          icon: Icons.question_mark_rounded,
          tooltip: l10n.fabNewQuestion,
        );
      case 1:
        if (!canParticipateInChats(
          roleOrPermissions: access,
          isAnonymous: profile.isAnonymous,
        )) {
          return null;
        }
        return _ShellFabConfig(
          icon: Icons.chat_rounded,
          tooltip: l10n.fabNewChat,
        );
      case 2:
        return _ShellFabConfig(
          icon: Icons.search_rounded,
          tooltip: l10n.fabSearchCourses,
        );
      case 3:
        return _ShellFabConfig(
          icon: Icons.support_outlined,
          tooltip: l10n.supportSheetTitle,
          label: l10n.supportSheetTitle,
          extended: true,
        );
      default:
        return null;
    }
  }

  void _onFabPressed() {
    PulseHaptics.light();
    switch (_index) {
      case 0:
        _forumsKey.currentState?.openCreate();
      case 1:
        openNewChat(
          context,
          profile: widget.profile,
          chatRepository: _chatRepoFallback,
          userRepository: widget.userRepository,
        );
      case 2:
        Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => CourseSearchScreen(
              profile: widget.profile,
              courseRepository: widget.courseRepository,
            ),
          ),
        );
      case 3:
        _profileKey.currentState?.openSupport();
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final profile = widget.profile;
    final fab = _fabConfig(l10n);
    final pages = [
      ForumsScreen(
        key: _forumsKey,
        profile: profile,
        forumRepository: widget.forumRepository,
        chatRepository: _chatRepoFallback,
        embeddedInShell: true,
        notificationUnread: _notifUnread,
        onOpenNotifications: _openNotifications,
      ),
      ChatsScreen(
        key: _chatsKey,
        profile: profile,
        chatRepository: _chatRepoFallback,
        userRepository: widget.userRepository,
        showFab: false,
        notificationUnread: _notifUnread,
        onOpenNotifications: _openNotifications,
      ),
      UniversityScreen(
        profile: profile,
        courseRepository: widget.courseRepository,
        notificationUnread: _notifUnread,
        onOpenNotifications: _openNotifications,
      ),
      ProfileScreen(
        key: _profileKey,
        authService: widget.authService,
        userRepository: widget.userRepository,
        profile: profile,
        forumRepository: widget.forumRepository,
        notificationUnread: _notifUnread,
        onOpenNotifications: _openNotifications,
      ),
    ];

    final useRail = pulseUseRail(context);

    final Widget? fabButton;
    if (fab == null) {
      fabButton = null;
    } else if (fab.extended && !useRail) {
      fabButton = FloatingActionButton.extended(
        heroTag: 'pulse-shell-fab',
        onPressed: _onFabPressed,
        tooltip: fab.tooltip,
        extendedPadding: const EdgeInsets.symmetric(horizontal: 16),
        extendedIconLabelSpacing: 8,
        icon: const LifebuoyIcon(size: 20),
        label: Text(
          fab.label ?? fab.tooltip,
          style: const TextStyle(
            fontWeight: FontWeight.w800,
            letterSpacing: 0.2,
          ),
        ),
      );
    } else {
      fabButton = FloatingActionButton(
        heroTag: 'pulse-shell-fab',
        mini: useRail,
        onPressed: _onFabPressed,
        tooltip: fab.tooltip,
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 220),
          switchInCurve: Curves.easeOutCubic,
          switchOutCurve: Curves.easeInCubic,
          transitionBuilder: (child, animation) {
            return FadeTransition(
              opacity: animation,
              child: ScaleTransition(scale: animation, child: child),
            );
          },
          child: fab.extended
              ? const LifebuoyIcon(size: 20, key: ValueKey('support'))
              : Icon(fab.icon, key: ValueKey(fab.icon.codePoint)),
        ),
      );
    }

    final navItems = _navItems(
      l10n,
      chatUnread: _chatUnread,
      forumBadge: _forumBadge,
      homeKey: _tourHomeKey,
      chatsKey: _tourChatsKey,
      academyKey: _tourAcademyKey,
      profileKey: _tourProfileKey,
    );

    final body = PulseTabBody(index: _index, children: pages);
    final scaffold = useRail
        ? PulseScaffold(
            extendBody: false,
            resizeToAvoidBottomInset: false,
            body: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                PulseNavRail(
                  barTourKey: _tourBarKey,
                  items: navItems,
                  selectedIndex: _index,
                  onSelect: selectTab,
                  fab: fabButton,
                ),
                Expanded(child: body),
              ],
            ),
          )
        : PulseScaffold(
            extendBody: false,
            resizeToAvoidBottomInset: false,
            body: body,
            floatingActionButton: fabButton,
            bottomNavigationBar: PulseTabBar(
              barTourKey: _tourBarKey,
              items: navItems,
              selectedIndex: _index,
              onSelect: selectTab,
            ),
          );

    return Stack(
      fit: StackFit.expand,
      children: [
        scaffold,
        ProductTourOverlay(
          profile: profile,
          userRepository: widget.userRepository,
          targets: ProductTourTargets(
            bar: _tourBarKey,
            home: _tourHomeKey,
            chats: _tourChatsKey,
            academy: _tourAcademyKey,
            profile: _tourProfileKey,
          ),
        ),
      ],
    );
  }
}

class _ShellFabConfig {
  const _ShellFabConfig({
    required this.icon,
    required this.tooltip,
    this.label,
    this.extended = false,
  });

  final IconData icon;
  final String tooltip;
  final String? label;
  final bool extended;
}

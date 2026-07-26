import 'dart:async';

import 'package:flutter/material.dart';

import '../auth/auth.dart';
import '../features/ai_chat/ai_chat_screen.dart';
import '../features/chats/chat_models.dart';
import '../features/chats/chat_repository.dart';
import '../features/chats/chats_screen.dart';
import '../features/forums/forum_models.dart';
import '../features/forums/forum_repository.dart';
import '../features/forums/forums_screen.dart';
import '../features/notifications/notification_repository.dart';
import '../features/notifications/notifications_screen.dart';
import '../features/profile/profile_screen.dart';
import '../features/university/course_repository.dart';
import '../features/university/course_search_screen.dart';
import '../features/university/university_screen.dart';
import '../l10n/l10n.dart';
import '../users/users.dart';
import 'pulse_haptics.dart';
import 'widgets/lifebuoy_icon.dart';
import 'widgets/pulse_chrome.dart';

/// App shell: forums home, chats, Pulse AI, academy, profile.
class PulseShell extends StatefulWidget {
  const PulseShell({
    super.key,
    required this.authService,
    required this.userRepository,
    required this.profile,
    this.forumRepository,
    this.chatRepository,
    this.courseRepository,
  });

  final AuthService authService;
  final UserRepository userRepository;
  final UserProfile profile;
  final ForumRepository? forumRepository;
  final ChatRepository? chatRepository;
  final CourseRepository? courseRepository;

  @override
  State<PulseShell> createState() => PulseShellState();
}

typedef HomeShell = PulseShell;
typedef HomeShellState = PulseShellState;

class PulseShellState extends State<PulseShell> {
  int _index = 0;

  final _forumsKey = GlobalKey<ForumsScreenState>();
  final _profileKey = GlobalKey<ProfileScreenState>();
  final _notifications = NotificationRepository();
  final _chatRepoFallback = ChatRepository();
  final _subs = <StreamSubscription<dynamic>>[];

  int _chatUnread = 0;
  int _forumBadge = 0;
  int _notifUnread = 0;

  static const _tabCount = 5;
  static const _aiTabIndex = 2;

  int get currentIndex => _index;

  @override
  void initState() {
    super.initState();
    _bindBadgeStreams();
  }

  void _bindBadgeStreams() {
    final profile = widget.profile;
    if (profile.isAnonymous) return;
    final chatRepo = widget.chatRepository ?? _chatRepoFallback;
    _subs.add(
      chatRepo.watchChats(profile.uid).listen((chats) {
        if (!mounted) return;
        final sum = chats.fold<int>(
          0,
          (acc, chat) => acc + chat.unreadFor(profile.uid),
        );
        setState(() => _chatUnread = sum);
      }),
    );
    _subs.add(
      _notifications.watchState(profile.uid).listen((state) async {
        final newThreads =
            await _notifications.countNewFeedThreads(state.lastFeedSeenAt);
        if (!mounted) return;
        setState(() {
          _notifUnread = state.unreadCount;
          _forumBadge = state.unreadForumCount + newThreads;
        });
      }),
    );
    unawaited(_notifications.registerPushToken(profile.uid));
  }

  @override
  void dispose() {
    for (final sub in _subs) {
      sub.cancel();
    }
    super.dispose();
  }

  void selectTab(int index) {
    final next = index.clamp(0, _tabCount - 1);
    // AI opens as a full-screen route (no tab bar); the shell stays on the
    // current tab so popping returns exactly where the user was.
    if (next == _aiTabIndex) {
      _openAi();
      return;
    }
    if (next == _index) return;
    setState(() => _index = next);
    if (next == 0 && !widget.profile.isAnonymous) {
      _notifications.markFeedSeen(widget.profile.uid);
    }
  }

  void _openNotifications() {
    if (widget.profile.isAnonymous) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.l10n.notificationsSignIn)),
      );
      return;
    }
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => NotificationsScreen(
          uid: widget.profile.uid,
          profile: widget.profile,
          forumRepository: widget.forumRepository,
          chatRepository: widget.chatRepository ?? _chatRepoFallback,
          courseRepository: widget.courseRepository,
        ),
      ),
    );
  }

  void _openAi() {
    if (widget.profile.isAnonymous || widget.profile.role == UserRole.guest) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.l10n.aiSignInRequired)),
      );
      return;
    }
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => AiChatScreen(profile: widget.profile),
      ),
    );
  }

  static List<PulseTabItem> _navItems(
    AppLocalizations l10n, {
    int chatUnread = 0,
    int forumBadge = 0,
  }) =>
      [
        PulseTabItem(
          label: l10n.navHome,
          icon: Icons.home_outlined,
          selectedIcon: Icons.home_rounded,
          badgeCount: forumBadge,
        ),
        PulseTabItem(
          label: l10n.navChats,
          icon: Icons.chat_bubble_outline_rounded,
          selectedIcon: Icons.chat_bubble_rounded,
          badgeCount: chatUnread,
        ),
        PulseTabItem(
          label: l10n.navAi,
          icon: Icons.auto_awesome_outlined,
          selectedIcon: Icons.auto_awesome,
        ),
        PulseTabItem(
          label: l10n.navAcademy,
          icon: Icons.school_outlined,
          selectedIcon: Icons.school_rounded,
        ),
        PulseTabItem(
          label: l10n.navProfile,
          icon: Icons.person_outline_rounded,
          selectedIcon: Icons.person_rounded,
          badgeCount: 0,
        ),
      ];

  _ShellFabConfig? _fabConfig(AppLocalizations l10n) {
    final profile = widget.profile;
    switch (_index) {
      case 0:
        if (!canParticipateInForums(
          role: profile.role,
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
          role: profile.role,
          isAnonymous: profile.isAnonymous,
        )) {
          return null;
        }
        return _ShellFabConfig(
          icon: Icons.chat_rounded,
          tooltip: l10n.fabNewChat,
        );
      case 2:
        return null;
      case 3:
        return _ShellFabConfig(
          icon: Icons.search_rounded,
          tooltip: l10n.fabSearchCourses,
        );
      case 4:
        return _ShellFabConfig(
          icon: Icons.support_outlined,
          tooltip: l10n.fabSupport,
          label: l10n.fabSupport,
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
          chatRepository: widget.chatRepository,
          userRepository: widget.userRepository,
        );
      case 3:
        Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => CourseSearchScreen(
              profile: widget.profile,
              courseRepository: widget.courseRepository,
            ),
          ),
        );
      case 4:
        _profileKey.currentState?.openSupport();
    }
  }

  Future<void> _openSupportChat() async {
    final l10n = context.l10n;
    final messenger = ScaffoldMessenger.of(context);
    final repo = widget.chatRepository ?? ChatRepository();
    messenger.showSnackBar(
      SnackBar(content: Text(l10n.supportChatOpening)),
    );
    try {
      final chat = await repo.getOrCreateSupportChat(
        me: widget.profile,
        aiName: l10n.supportChatAiName,
        welcomeMessage: l10n.supportChatWelcome,
      );
      if (!mounted) return;
      messenger.hideCurrentSnackBar();
      selectTab(1);
      openChat(
        context,
        chat: chat,
        profile: widget.profile,
        chatRepository: repo,
      );
    } catch (error) {
      if (!mounted) return;
      messenger.hideCurrentSnackBar();
      messenger.showSnackBar(
        SnackBar(content: Text(friendlyChatError(error, l10n))),
      );
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
        chatRepository: widget.chatRepository,
        embeddedInShell: true,
        notificationUnread: _notifUnread,
        onOpenNotifications: _openNotifications,
      ),
      ChatsScreen(
        profile: profile,
        chatRepository: widget.chatRepository,
        userRepository: widget.userRepository,
        showFab: false,
        notificationUnread: _notifUnread,
        onOpenNotifications: _openNotifications,
      ),
      // AI is pushed as its own route; keep the slot so indices stay aligned.
      const SizedBox.shrink(),
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
        onOpenSupportChat: _openSupportChat,
        notificationUnread: _notifUnread,
        onOpenNotifications: _openNotifications,
      ),
    ];

    final Widget? fabButton;
    if (fab == null) {
      fabButton = null;
    } else if (fab.extended) {
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
          child: Icon(fab.icon, key: ValueKey(fab.icon.codePoint)),
        ),
      );
    }

    return PulseScaffold(
      extendBody: true,
      resizeToAvoidBottomInset: false,
      body: PulseTabBody(index: _index, children: pages),
      floatingActionButton: fabButton,
      bottomNavigationBar: PulseTabBar(
        items: _navItems(
          l10n,
          chatUnread: _chatUnread,
          forumBadge: _forumBadge,
        ),
        selectedIndex: _index,
        onSelect: selectTab,
      ),
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

import 'package:flutter/material.dart';

import '../auth/auth.dart';
import '../features/ai_chat/ai_chat_screen.dart';
import '../features/chats/chat_models.dart';
import '../features/chats/chat_repository.dart';
import '../features/chats/chats_screen.dart';
import '../features/forums/forum_models.dart';
import '../features/forums/forum_repository.dart';
import '../features/forums/forums_screen.dart';
import '../features/profile/profile_screen.dart';
import '../features/university/platzi_search_screen.dart';
import '../features/university/university_screen.dart';
import '../l10n/l10n.dart';
import '../users/users.dart';
import 'pulse_haptics.dart';
import 'widgets/lifebuoy_icon.dart';
import 'widgets/pulse_chrome.dart';

/// App shell: Facebook home, WhatsApp chats, ChatGPT AI, Platzi academy, X profile.
class PulseShell extends StatefulWidget {
  const PulseShell({
    super.key,
    required this.authService,
    required this.userRepository,
    required this.profile,
    this.forumRepository,
    this.chatRepository,
  });

  final AuthService authService;
  final UserRepository userRepository;
  final UserProfile profile;
  final ForumRepository? forumRepository;
  final ChatRepository? chatRepository;

  @override
  State<PulseShell> createState() => PulseShellState();
}

typedef HomeShell = PulseShell;
typedef HomeShellState = PulseShellState;

class PulseShellState extends State<PulseShell> {
  int _index = 0;

  final _forumsKey = GlobalKey<ForumsScreenState>();
  final _aiKey = GlobalKey<AiChatScreenState>();
  final _profileKey = GlobalKey<ProfileScreenState>();

  static const _tabCount = 5;

  int get currentIndex => _index;

  void selectTab(int index) {
    final next = index.clamp(0, _tabCount - 1);
    if (next == _index) return;
    setState(() => _index = next);
  }

  static List<PulseTabItem> _navItems(AppLocalizations l10n) => [
        PulseTabItem(
          label: l10n.navHome,
          icon: Icons.home_outlined,
          selectedIcon: Icons.home_rounded,
        ),
        PulseTabItem(
          label: l10n.navChats,
          icon: Icons.chat_bubble_outline_rounded,
          selectedIcon: Icons.chat_bubble_rounded,
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
        return _ShellFabConfig(
          icon: Icons.edit_square,
          tooltip: l10n.fabNewConversation,
        );
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
      case 2:
        _aiKey.currentState?.startNewConversation();
      case 3:
        Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => const PlatziSearchScreen(),
          ),
        );
      case 4:
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
        chatRepository: widget.chatRepository,
        embeddedInShell: true,
      ),
      ChatsScreen(
        profile: profile,
        chatRepository: widget.chatRepository,
        userRepository: widget.userRepository,
        showFab: false,
      ),
      AiChatScreen(key: _aiKey),
      const UniversityScreen(),
      ProfileScreen(
        key: _profileKey,
        authService: widget.authService,
        userRepository: widget.userRepository,
        profile: profile,
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
      body: PulseTabBody(index: _index, children: pages),
      floatingActionButton: fabButton,
      bottomNavigationBar: PulseTabBar(
        items: _navItems(l10n),
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

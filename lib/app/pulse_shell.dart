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
import '../users/users.dart';
import 'pulse_haptics.dart';
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

  int get currentIndex => _index;

  void selectTab(int index) {
    final next = index.clamp(0, _navItems.length - 1);
    if (next == _index) return;
    setState(() => _index = next);
  }

  static const _navItems = [
    PulseTabItem(
      label: 'Inicio',
      icon: Icons.home_outlined,
      selectedIcon: Icons.home_rounded,
    ),
    PulseTabItem(
      label: 'Chats',
      icon: Icons.chat_bubble_outline_rounded,
      selectedIcon: Icons.chat_bubble_rounded,
    ),
    PulseTabItem(
      label: 'IA',
      icon: Icons.auto_awesome_outlined,
      selectedIcon: Icons.auto_awesome,
    ),
    PulseTabItem(
      label: 'Academia',
      icon: Icons.school_outlined,
      selectedIcon: Icons.school_rounded,
    ),
    PulseTabItem(
      label: 'Perfil',
      icon: Icons.person_outline_rounded,
      selectedIcon: Icons.person_rounded,
    ),
  ];

  _ShellFabConfig? get _fabConfig {
    final profile = widget.profile;
    switch (_index) {
      case 0:
        if (!canParticipateInForums(
          role: profile.role,
          isAnonymous: profile.isAnonymous,
        )) {
          return null;
        }
        return const _ShellFabConfig(
          icon: Icons.question_answer_rounded,
          tooltip: 'Nueva pregunta',
        );
      case 1:
        if (!canParticipateInChats(
          role: profile.role,
          isAnonymous: profile.isAnonymous,
        )) {
          return null;
        }
        return const _ShellFabConfig(
          icon: Icons.chat_bubble_rounded,
          tooltip: 'Nuevo chat',
        );
      case 2:
        return const _ShellFabConfig(
          icon: Icons.edit_square,
          tooltip: 'Nueva conversación',
        );
      case 3:
        return const _ShellFabConfig(
          icon: Icons.search_rounded,
          tooltip: 'Buscar cursos',
        );
      case 4:
        return const _ShellFabConfig(
          icon: Icons.edit_rounded,
          tooltip: 'Editar perfil',
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
        _profileKey.currentState?.openEdit();
    }
  }

  @override
  Widget build(BuildContext context) {
    final profile = widget.profile;
    final fab = _fabConfig;
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

    return PulseScaffold(
      extendBody: true,
      body: PulseTabBody(index: _index, children: pages),
      floatingActionButton: fab == null
          ? null
          : FloatingActionButton(
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
            ),
      bottomNavigationBar: PulseTabBar(
        items: _navItems,
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
  });

  final IconData icon;
  final String tooltip;
}

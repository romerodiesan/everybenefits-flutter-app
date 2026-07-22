import 'package:flutter/material.dart';

import '../auth/auth.dart';
import '../features/ai_chat/ai_chat_screen.dart';
import '../features/chats/chats_screen.dart';
import '../features/forums/forum_repository.dart';
import '../features/forums/forums_screen.dart';
import '../features/profile/profile_screen.dart';
import '../features/university/university_screen.dart';
import '../users/users.dart';
import 'widgets/pulse_chrome.dart';

/// App shell: Facebook home, WhatsApp chats, ChatGPT AI, Platzi academy, X profile.
class PulseShell extends StatefulWidget {
  const PulseShell({
    super.key,
    required this.authService,
    required this.userRepository,
    required this.profile,
    this.forumRepository,
  });

  final AuthService authService;
  final UserRepository userRepository;
  final UserProfile profile;
  final ForumRepository? forumRepository;

  @override
  State<PulseShell> createState() => PulseShellState();
}

typedef HomeShell = PulseShell;
typedef HomeShellState = PulseShellState;

class PulseShellState extends State<PulseShell> {
  int _index = 0;

  int get currentIndex => _index;

  void selectTab(int index) {
    setState(() => _index = index);
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

  @override
  Widget build(BuildContext context) {
    final profile = widget.profile;
    final pages = [
      ForumsScreen(
        profile: profile,
        forumRepository: widget.forumRepository,
        embeddedInShell: true,
      ),
      const ChatsScreen(),
      const AiChatScreen(),
      const UniversityScreen(),
      ProfileScreen(
        authService: widget.authService,
        userRepository: widget.userRepository,
        profile: profile,
      ),
    ];

    return PulseScaffold(
      extendBody: false,
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: PulseTabBar(
        items: _navItems,
        selectedIndex: _index,
        onSelect: selectTab,
      ),
    );
  }
}

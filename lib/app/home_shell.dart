import 'package:flutter/material.dart';

import '../auth/auth.dart';
import '../features/ai_chat/ai_chat_screen.dart';
import '../features/chats/chats_screen.dart';
import '../features/forums/forums_screen.dart';
import '../features/home/home_screen.dart';
import '../features/profile/profile_screen.dart';
import '../features/university/university_screen.dart';
import '../users/users.dart';
import 'app_spacing.dart';
import 'widgets/floating_nav_bar.dart';
import 'widgets/mesh_background.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({
    super.key,
    required this.authService,
    required this.userRepository,
    required this.profile,
  });

  final AuthService authService;
  final UserRepository userRepository;
  final UserProfile profile;

  @override
  State<HomeShell> createState() => HomeShellState();
}

class HomeShellState extends State<HomeShell> {
  int _index = 0;

  int get currentIndex => _index;

  void selectTab(int index) {
    setState(() => _index = index);
  }

  static const _navItems = [
    FloatingNavItem(
      label: 'Inicio',
      icon: Icons.home_outlined,
      selectedIcon: Icons.home_rounded,
    ),
    FloatingNavItem(
      label: 'Chats',
      icon: Icons.chat_bubble_outline_rounded,
      selectedIcon: Icons.chat_bubble_rounded,
    ),
    FloatingNavItem(
      label: 'IA',
      icon: Icons.auto_awesome_outlined,
      selectedIcon: Icons.auto_awesome,
    ),
    FloatingNavItem(
      label: 'Universidad',
      icon: Icons.school_outlined,
      selectedIcon: Icons.school_rounded,
    ),
    FloatingNavItem(
      label: 'Perfil',
      icon: Icons.person_outline_rounded,
      selectedIcon: Icons.person_rounded,
    ),
  ];

  Future<void> _openCommunity() {
    return Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => const MeshBackground(child: ForumsScreen()),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final profile = widget.profile;
    final pages = [
      HomeScreen(
        profile: profile,
        onOpenAi: () => selectTab(2),
        onOpenChats: () => selectTab(1),
        onOpenUniversity: () => selectTab(3),
        onOpenProfile: () => selectTab(4),
        onOpenCommunity: _openCommunity,
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

    return MeshBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: Stack(
          children: [
            Positioned.fill(
              child: Padding(
                padding: EdgeInsets.only(bottom: floatingNavClearance(context)),
                child: IndexedStack(index: _index, children: pages),
              ),
            ),
            Positioned(
              left: AppSpacing.md,
              right: AppSpacing.md,
              bottom: MediaQuery.paddingOf(context).bottom + AppSpacing.sm,
              child: FloatingNavBar(
                selectedIndex: _index,
                onSelect: selectTab,
                items: _navItems,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';

import 'app/home_shell.dart';
import 'app/theme.dart';
import 'app/theme_controller.dart';
import 'app/widgets/pulse_chrome.dart';
import 'auth/auth.dart';
import 'features/chats/chat_repository.dart';
import 'features/forums/forum_repository.dart';
import 'features/onboarding/welcome_screen.dart';
import 'features/profile/profile_completion_flow.dart';
import 'firebase/firebase_emulators.dart';
import 'firebase_options.dart';
import 'users/users.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  FlutterError.onError = (details) {
    FlutterError.presentError(details);
    debugPrint('[FlutterError] ${details.exceptionAsString()}');
    if (details.stack != null) {
      debugPrint(details.stack.toString());
    }
  };

  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  await connectFirebaseEmulators();
  final themeController = await ThemeController.load();
  runApp(
    EveryInsuranceApp(
      authService: AuthService(),
      userRepository: UserRepository(),
      themeController: themeController,
    ),
  );
}

class EveryInsuranceApp extends StatefulWidget {
  const EveryInsuranceApp({
    super.key,
    required this.authService,
    required this.userRepository,
    required this.themeController,
    this.forumRepository,
    this.chatRepository,
  });

  final AuthService authService;
  final UserRepository userRepository;
  final ThemeController themeController;
  final ForumRepository? forumRepository;
  final ChatRepository? chatRepository;

  @override
  State<EveryInsuranceApp> createState() => _EveryInsuranceAppState();
}

class _EveryInsuranceAppState extends State<EveryInsuranceApp> {
  /// Cached so theme rebuilds do not resubscribe auth (which resets navigation).
  late final Stream<User?> _authStream = widget.authService.authStateChanges;

  @override
  Widget build(BuildContext context) {
    return ThemeScope(
      controller: widget.themeController,
      child: StreamBuilder<User?>(
        stream: _authStream,
        builder: (context, snapshot) {
          final authKey = snapshot.connectionState == ConnectionState.waiting
              ? 'boot'
              : (snapshot.data?.uid ?? 'signed-out');

          return ListenableBuilder(
            listenable: widget.themeController,
            builder: (context, _) {
              final brand = widget.themeController.primaryColor;
              return MaterialApp(
                key: ValueKey<String>(authKey),
                title: 'Every Insurance',
                theme: buildEveryInsuranceTheme(
                  Brightness.light,
                  brand: brand,
                ),
                darkTheme: buildEveryInsuranceTheme(
                  Brightness.dark,
                  brand: brand,
                ),
                themeMode: widget.themeController.mode,
                builder: (context, child) {
                  return GestureDetector(
                    behavior: HitTestBehavior.translucent,
                    onTap: () => FocusManager.instance.primaryFocus?.unfocus(),
                    child: child,
                  );
                },
                home: _AuthHome(
                  authService: widget.authService,
                  userRepository: widget.userRepository,
                  forumRepository: widget.forumRepository,
                  chatRepository: widget.chatRepository,
                  connectionState: snapshot.connectionState,
                  user: snapshot.data,
                ),
              );
            },
          );
        },
      ),
    );
  }
}

class _AuthHome extends StatelessWidget {
  const _AuthHome({
    required this.authService,
    required this.userRepository,
    required this.forumRepository,
    required this.chatRepository,
    required this.connectionState,
    required this.user,
  });

  final AuthService authService;
  final UserRepository userRepository;
  final ForumRepository? forumRepository;
  final ChatRepository? chatRepository;
  final ConnectionState connectionState;
  final User? user;

  @override
  Widget build(BuildContext context) {
    if (connectionState == ConnectionState.waiting) {
      return const PulseScaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (user == null) {
      return WelcomeScreen(authService: authService);
    }

    return ProfileBootstrap(
      key: ValueKey(user!.uid),
      user: user!,
      authService: authService,
      userRepository: userRepository,
      forumRepository: forumRepository,
      chatRepository: chatRepository,
    );
  }
}

class ProfileBootstrap extends StatefulWidget {
  const ProfileBootstrap({
    super.key,
    required this.user,
    required this.authService,
    required this.userRepository,
    this.forumRepository,
    this.chatRepository,
  });

  final User user;
  final AuthService authService;
  final UserRepository userRepository;
  final ForumRepository? forumRepository;
  final ChatRepository? chatRepository;

  @override
  State<ProfileBootstrap> createState() => _ProfileBootstrapState();
}

class _ProfileBootstrapState extends State<ProfileBootstrap> {
  late final Future<UserProfile> _profileFuture =
      widget.userRepository.ensureProfile(widget.user);

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<UserProfile>(
      future: _profileFuture,
      builder: (context, profileSnapshot) {
        if (profileSnapshot.connectionState != ConnectionState.done) {
          return const PulseScaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        if (profileSnapshot.hasError) {
          final error = profileSnapshot.error!;
          debugPrint('[ProfileBootstrap] $error');
          return PulseScaffold(
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'No se pudo cargar el perfil:\n$error',
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: () => widget.authService.signOut(),
                      child: const Text('Volver al inicio'),
                    ),
                  ],
                ),
              ),
            ),
          );
        }

        final initial = profileSnapshot.data!;

        return StreamBuilder<UserProfile?>(
          stream: widget.userRepository.watchProfile(widget.user.uid),
          initialData: initial,
          builder: (context, watchSnapshot) {
            final profile = watchSnapshot.data ?? initial;

            if (!profile.isAnonymous && !profile.profileCompleted) {
              return ProfileCompletionFlow(
                profile: profile,
                userRepository: widget.userRepository,
                authService: widget.authService,
              );
            }

            return PulseShell(
              authService: widget.authService,
              userRepository: widget.userRepository,
              profile: profile,
              forumRepository: widget.forumRepository,
              chatRepository: widget.chatRepository,
            );
          },
        );
      },
    );
  }
}

import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:liquid_glass_widgets/liquid_glass_widgets.dart';

import 'app/home_shell.dart';
import 'app/theme.dart';
import 'app/theme_controller.dart';
import 'app/widgets/mesh_background.dart';
import 'auth/auth.dart';
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
  await LiquidGlassWidgets.initialize();
  final themeController = await ThemeController.load();
  runApp(
    LiquidGlassWidgets.wrap(
      child: EveryInsuranceApp(
        authService: AuthService(),
        userRepository: UserRepository(),
        themeController: themeController,
      ),
    ),
  );
}

class EveryInsuranceApp extends StatelessWidget {
  const EveryInsuranceApp({
    super.key,
    required this.authService,
    required this.userRepository,
    required this.themeController,
  });

  final AuthService authService;
  final UserRepository userRepository;
  final ThemeController themeController;

  @override
  Widget build(BuildContext context) {
    return ThemeScope(
      controller: themeController,
      child: ListenableBuilder(
        listenable: themeController,
        builder: (context, _) {
          return StreamBuilder<User?>(
            stream: authService.authStateChanges,
            builder: (context, snapshot) {
              // Rebuild MaterialApp (new Navigator) when auth flips so login/register
              // routes cannot stay stacked above the dashboard.
              final authKey = snapshot.connectionState == ConnectionState.waiting
                  ? 'boot'
                  : (snapshot.data?.uid ?? 'signed-out');

              return MaterialApp(
                key: ValueKey<String>(authKey),
                title: 'Every Insurance',
                theme: buildEveryInsuranceTheme(Brightness.light),
                darkTheme: buildEveryInsuranceTheme(Brightness.dark),
                themeMode: themeController.mode,
                home: _AuthHome(
                  authService: authService,
                  userRepository: userRepository,
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
    required this.connectionState,
    required this.user,
  });

  final AuthService authService;
  final UserRepository userRepository;
  final ConnectionState connectionState;
  final User? user;

  @override
  Widget build(BuildContext context) {
    if (connectionState == ConnectionState.waiting) {
      return MeshBackground(
        child: const Scaffold(
          backgroundColor: Colors.transparent,
          body: Center(child: CircularProgressIndicator()),
        ),
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
    );
  }
}

class ProfileBootstrap extends StatefulWidget {
  const ProfileBootstrap({
    super.key,
    required this.user,
    required this.authService,
    required this.userRepository,
  });

  final User user;
  final AuthService authService;
  final UserRepository userRepository;

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
          return MeshBackground(
            child: const Scaffold(
              backgroundColor: Colors.transparent,
              body: Center(child: CircularProgressIndicator()),
            ),
          );
        }

        if (profileSnapshot.hasError) {
          final error = profileSnapshot.error!;
          debugPrint('[ProfileBootstrap] $error');
          return MeshBackground(
            child: Scaffold(
              backgroundColor: Colors.transparent,
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

            return HomeShell(
              authService: widget.authService,
              userRepository: widget.userRepository,
              profile: profile,
            );
          },
        );
      },
    );
  }
}

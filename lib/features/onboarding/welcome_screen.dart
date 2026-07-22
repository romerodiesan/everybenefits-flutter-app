import 'package:flutter/material.dart';

import '../../../app/app_spacing.dart';
import '../../../app/theme.dart';
import '../../../app/widgets/mesh_background.dart';
import '../../../auth/auth.dart';
import 'login_screen.dart';
import 'phone_auth_screen.dart';
import 'register_screen.dart';
import 'widgets/auth_form_widgets.dart';

class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key, required this.authService});

  final AuthService authService;

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
  )..forward();

  late final Animation<double> _fade = CurvedAnimation(
    parent: _controller,
    curve: const Interval(0, 0.7, curve: Curves.easeOut),
  );
  late final Animation<Offset> _slide = Tween<Offset>(
    begin: const Offset(0, 0.08),
    end: Offset.zero,
  ).animate(
    CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.05, 0.85, curve: Curves.easeOutCubic),
    ),
  );

  bool _busy = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _run(Future<void> Function() action) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await action();
    } catch (error, stackTrace) {
      if (!mounted) return;
      showAuthError(context, error, stackTrace: stackTrace);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _open(Widget page) {
    return Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => page),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return MeshBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(28, 24, 28, 28),
            child: FadeTransition(
              opacity: _fade,
              child: SlideTransition(
                position: _slide,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Spacer(flex: 2),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Every',
                            style: theme.textTheme.displayLarge?.copyWith(
                              fontSize: 68,
                            ),
                          ),
                          Transform.translate(
                            offset: const Offset(28, -8),
                            child: Text(
                              'Insurance',
                              style: theme.textTheme.displayLarge?.copyWith(
                                fontSize: 68,
                                color: AppColors.accent,
                              ),
                            ),
                          ),
                          const SizedBox(height: 20),
                          Padding(
                            padding: const EdgeInsets.only(left: 4),
                            child: Text(
                              'Comunidad para agentes',
                              style: theme.textTheme.bodyLarge?.copyWith(
                                color: AppColors.of(context).muted,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Spacer(flex: 3),
                    FilledButton(
                      onPressed: _busy
                          ? null
                          : () => _open(
                                LoginScreen(authService: widget.authService),
                              ),
                      child: const Text('Iniciar sesión'),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    OutlinedButton(
                      onPressed: _busy
                          ? null
                          : () => _open(
                                RegisterScreen(
                                  authService: widget.authService,
                                ),
                              ),
                      child: const Text('Crear cuenta'),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    const AuthDivider(),
                    const SizedBox(height: AppSpacing.md),
                    GoogleAuthButton(
                      busy: _busy,
                      onPressed: () => _run(() async {
                        await widget.authService.signInWithGoogle();
                      }),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    PhoneAuthButton(
                      onPressed: _busy
                          ? null
                          : () => _open(
                                PhoneAuthScreen(
                                  authService: widget.authService,
                                ),
                              ),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    TextButton(
                      onPressed: _busy
                          ? null
                          : () => _run(() async {
                                await widget.authService.signInAnonymously();
                              }),
                      child: const Text('Continuar como invitado'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Kept for older imports / tests that referenced the signed-out entry.
typedef SignedOutScreen = WelcomeScreen;

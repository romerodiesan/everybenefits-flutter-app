import 'package:flutter/material.dart';

import '../../../app/app_spacing.dart';
import '../../../app/theme.dart';
import '../../../auth/auth.dart';
import '../../../l10n/l10n.dart';
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
    duration: const Duration(milliseconds: 800),
  )..forward();

  late final Animation<double> _scale = Tween<double>(begin: 0.92, end: 1).animate(
    CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic),
  );
  late final Animation<double> _fade = CurvedAnimation(
    parent: _controller,
    curve: Curves.easeOut,
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
      PageRouteBuilder<void>(
        pageBuilder: (_, animation, _) => FadeTransition(
          opacity: animation,
          child: page,
        ),
        transitionsBuilder: (_, animation, _, child) =>
            FadeTransition(opacity: animation, child: child),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;

    return Scaffold(
      backgroundColor: colors.canvas,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(28, 32, 28, 28),
          child: FadeTransition(
            opacity: _fade,
            child: ScaleTransition(
              scale: _scale,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Spacer(flex: 2),
                  Text(
                    'EVERY',
                    style: theme.textTheme.displayLarge?.copyWith(
                      fontSize: 72,
                      letterSpacing: -3,
                    ),
                  ),
                  Text(
                    'INSURANCE',
                    style: theme.textTheme.labelLarge?.copyWith(
                      color: AppColors.brandOf(context),
                      letterSpacing: 4,
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  Text(
                    l10n.welcomeTagline,
                    style: theme.textTheme.headlineMedium?.copyWith(
                      fontSize: 26,
                      height: 1.2,
                    ),
                  ),
                  const Spacer(flex: 3),
                  FilledButton(
                    onPressed: _busy
                        ? null
                        : () => _open(LoginScreen(authService: widget.authService)),
                    child: Text(l10n.welcomeEnter),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  TextButton(
                    onPressed: _busy
                        ? null
                        : () => _run(widget.authService.signInAnonymously),
                    child: Text(
                      l10n.welcomeGuest,
                      style: theme.textTheme.labelLarge?.copyWith(
                        color: colors.muted,
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  TextButton(
                    onPressed: _busy
                        ? null
                        : () => _open(
                              RegisterScreen(authService: widget.authService),
                            ),
                    child: Text(
                      l10n.welcomeCreateAccount,
                      style: theme.textTheme.labelLarge?.copyWith(
                        color: colors.muted,
                      ),
                    ),
                  ),
                  TextButton(
                    onPressed: _busy
                        ? null
                        : () => _open(
                              PhoneAuthScreen(authService: widget.authService),
                            ),
                    child: Text(
                      l10n.welcomePhone,
                      style: theme.textTheme.labelLarge?.copyWith(
                        color: colors.muted,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

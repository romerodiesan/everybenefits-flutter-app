import 'package:flutter/material.dart';

import '../../../app/app_spacing.dart';
import '../../../app/pulse_haptics.dart';
import '../../../app/theme.dart';
import '../../../auth/auth.dart';
import '../../../l10n/l10n.dart';
import 'login_screen.dart';
import 'onboarding_prefs.dart';
import 'phone_auth_screen.dart';
import 'register_screen.dart';
import 'widgets/auth_form_widgets.dart';
import 'widgets/onboarding_illustrations.dart';

class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({
    super.key,
    required this.authService,
    this.onboardingCompletedOverride,
  });

  final AuthService authService;

  /// When set (tests), skips reading [OnboardingPrefs].
  final bool? onboardingCompletedOverride;

  /// Soft mesh / float loop. Tests set this false so [pumpAndSettle] can finish.
  static bool debugAmbientMotion = true;

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen>
    with TickerProviderStateMixin {
  static const _storyCount = 4;

  late PageController _pageController;
  late final AnimationController _ambient;
  late final AnimationController _reveal;

  int _page = 0;
  bool? _completed;

  bool get _ready => _completed != null;
  bool get _onAuthPage => _page >= _storyCount;

  @override
  void initState() {
    super.initState();
    final ambientMotion = WelcomeScreen.debugAmbientMotion;
    _ambient = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 4800),
    );
    if (ambientMotion) {
      _ambient.repeat(reverse: true);
    } else {
      _ambient.value = 0.35;
    }
    _reveal = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 620),
      value: 1,
    );
    final override = widget.onboardingCompletedOverride;
    if (override != null) {
      _completed = override;
      _page = override ? _storyCount : 0;
      _pageController = PageController(initialPage: _page);
    } else {
      _pageController = PageController();
      _loadPrefs();
    }
  }

  Future<void> _loadPrefs() async {
    final done = await OnboardingPrefs.hasCompleted();
    if (!mounted) return;
    if (done) {
      _pageController.dispose();
      _pageController = PageController(initialPage: _storyCount);
    }
    setState(() {
      _completed = done;
      _page = done ? _storyCount : 0;
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    _ambient.dispose();
    _reveal.dispose();
    super.dispose();
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

  Future<void> _markDone() => OnboardingPrefs.markCompleted();

  Future<void> _goToAuth({bool animate = true}) async {
    await _markDone();
    if (!mounted) return;
    setState(() => _completed = true);
    if (animate) {
      await _pageController.animateToPage(
        _storyCount,
        duration: const Duration(milliseconds: 420),
        curve: Curves.easeOutCubic,
      );
    } else {
      _pageController.jumpToPage(_storyCount);
    }
  }

  Future<void> _next() async {
    PulseHaptics.selection();
    if (_page >= _storyCount - 1) {
      await _goToAuth();
      return;
    }
    await _pageController.nextPage(
      duration: const Duration(milliseconds: 380),
      curve: Curves.easeOutCubic,
    );
  }

  void _onPageChanged(int index) {
    PulseHaptics.selection();
    setState(() => _page = index);
    _reveal
      ..value = 0
      ..forward();
    if (index >= _storyCount) {
      _markDone();
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final l10n = context.l10n;

    if (!_ready) {
      return Scaffold(
        backgroundColor: colors.canvas,
        body: Center(
          child: SizedBox(
            width: 28,
            height: 28,
            child: CircularProgressIndicator(
              strokeWidth: 2.4,
              color: AppColors.brandOf(context),
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: colors.canvas,
      body: AnimatedBuilder(
        animation: _ambient,
        builder: (context, _) {
          final t = _ambient.value;
          final float = (t * 2) - 1;
          return Stack(
            fit: StackFit.expand,
            children: [
              OnboardingMeshBackground(t: t),
              SafeArea(
                child: Column(
                  children: [
                    _TopBar(
                      showSkip: !_onAuthPage,
                      skipLabel: l10n.onboardingSkip,
                      onSkip: () => _goToAuth(),
                      page: _page.clamp(0, _storyCount),
                      storyCount: _storyCount,
                      onAuth: _onAuthPage,
                    ),
                    Expanded(
                      child: PageView(
                        controller: _pageController,
                        onPageChanged: _onPageChanged,
                        children: [
                          _StoryPage(
                            kind: OnboardingIllustrationKind.community,
                            title: l10n.onboardingCommunityTitle,
                            body: l10n.onboardingCommunityBody,
                            float: float,
                            reveal: _reveal,
                            active: _page == 0,
                          ),
                          _StoryPage(
                            kind: OnboardingIllustrationKind.chats,
                            title: l10n.onboardingChatsTitle,
                            body: l10n.onboardingChatsBody,
                            float: float,
                            reveal: _reveal,
                            active: _page == 1,
                          ),
                          _StoryPage(
                            kind: OnboardingIllustrationKind.ai,
                            title: l10n.onboardingAiTitle,
                            body: l10n.onboardingAiBody,
                            float: float,
                            reveal: _reveal,
                            active: _page == 2,
                          ),
                          _StoryPage(
                            kind: OnboardingIllustrationKind.academy,
                            title: l10n.onboardingAcademyTitle,
                            body: l10n.onboardingAcademyBody,
                            float: float,
                            reveal: _reveal,
                            active: _page == 3,
                          ),
                          _AuthPage(
                            onSignIn: () => _open(
                              LoginScreen(authService: widget.authService),
                            ),
                            onRegister: () => _open(
                              RegisterScreen(authService: widget.authService),
                            ),
                            onPhone: () => _open(
                              PhoneAuthScreen(authService: widget.authService),
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (!_onAuthPage)
                      _BottomNav(
                        nextLabel: _page >= _storyCount - 1
                            ? l10n.onboardingGetStarted
                            : l10n.onboardingNext,
                        onNext: _next,
                      ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({
    required this.showSkip,
    required this.skipLabel,
    required this.onSkip,
    required this.page,
    required this.storyCount,
    required this.onAuth,
  });

  final bool showSkip;
  final String skipLabel;
  final VoidCallback? onSkip;
  final int page;
  final int storyCount;
  final bool onAuth;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);

    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 4, 8, 0),
      child: Row(
        children: [
          SizedBox(
            width: 88,
            child: showSkip
                ? TextButton(
                    onPressed: onSkip,
                    child: Text(
                      skipLabel,
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                            color: colors.muted,
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                  )
                : null,
          ),
          Expanded(
            child: onAuth
                ? const SizedBox.shrink()
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(storyCount, (i) {
                      final active = i == page;
                      return AnimatedContainer(
                        duration: const Duration(milliseconds: 280),
                        curve: Curves.easeOutCubic,
                        margin: const EdgeInsets.symmetric(horizontal: 3),
                        height: 6,
                        width: active ? 22 : 6,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(99),
                          color: active
                              ? brand
                              : colors.muted.withValues(alpha: 0.35),
                        ),
                      );
                    }),
                  ),
          ),
          const SizedBox(width: 88),
        ],
      ),
    );
  }
}

class _BottomNav extends StatelessWidget {
  const _BottomNav({
    required this.nextLabel,
    required this.onNext,
  });

  final String nextLabel;
  final VoidCallback? onNext;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(28, 8, 28, 20),
      child: SizedBox(
        width: double.infinity,
        child: FilledButton(
          onPressed: onNext,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(nextLabel),
              const SizedBox(width: 8),
              const Icon(Icons.arrow_forward_rounded, size: 18),
            ],
          ),
        ),
      ),
    );
  }
}

class _StoryPage extends StatelessWidget {
  const _StoryPage({
    required this.kind,
    required this.title,
    required this.body,
    required this.float,
    required this.reveal,
    required this.active,
  });

  final OnboardingIllustrationKind kind;
  final String title;
  final String body;
  final double float;
  final AnimationController reveal;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);

    return AnimatedBuilder(
      animation: reveal,
      builder: (context, _) {
        final progress = active ? reveal.value : 1.0;
        return LayoutBuilder(
          builder: (context, constraints) {
            final illustrationHeight =
                (constraints.maxHeight * 0.42).clamp(160.0, 260.0);
            return SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 28),
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    SizedBox(height: constraints.maxHeight * 0.06),
                    SizedBox(
                      height: illustrationHeight,
                      child: OnboardingIllustration(
                        kind: kind,
                        float: float,
                        reveal: progress,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xl),
                    Opacity(
                      opacity: progress,
                      child: Transform.translate(
                        offset: Offset(0, (1 - progress) * 16),
                        child: Text(
                          title,
                          textAlign: TextAlign.center,
                          style: theme.textTheme.headlineMedium?.copyWith(
                            fontSize: 30,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.6,
                            height: 1.15,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    Opacity(
                      opacity: progress,
                      child: Transform.translate(
                        offset: Offset(0, (1 - progress) * 20),
                        child: Text(
                          body,
                          textAlign: TextAlign.center,
                          style: theme.textTheme.bodyLarge?.copyWith(
                            color: colors.muted,
                            height: 1.45,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ),
                    SizedBox(height: constraints.maxHeight * 0.08),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}

class _AuthPage extends StatelessWidget {
  const _AuthPage({
    required this.onSignIn,
    required this.onRegister,
    required this.onPhone,
  });

  final VoidCallback onSignIn;
  final VoidCallback onRegister;
  final VoidCallback onPhone;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final l10n = context.l10n;

    return LayoutBuilder(
      builder: (context, constraints) {
        final illustrationHeight =
            (constraints.maxHeight * 0.32).clamp(120.0, 220.0);
        return SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(28, 8, 28, 24),
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: constraints.maxHeight),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SizedBox(
                  height: illustrationHeight,
                  child: const OnboardingIllustration(
                    kind: OnboardingIllustrationKind.pulse,
                    float: 0,
                    reveal: 1,
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                Center(
                  child: Image.asset(
                    'assets/branding/pulse-logo.png',
                    width: 88,
                    height: 88,
                    filterQuality: FilterQuality.high,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  'PULSE',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.displayLarge?.copyWith(
                    fontSize: 52,
                    letterSpacing: -2.2,
                    height: 0.95,
                  ),
                ),
                Text(
                  'EVERY BENEFITS',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.labelLarge?.copyWith(
                    color: brand,
                    letterSpacing: 4,
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  l10n.welcomeTagline,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.headlineMedium?.copyWith(
                    fontSize: 22,
                    height: 1.25,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                SizedBox(height: constraints.maxHeight * 0.06),
                FilledButton(
                  onPressed: onSignIn,
                  child: Text(l10n.welcomeEnter),
                ),
                const SizedBox(height: AppSpacing.sm),
                TextButton(
                  onPressed: onRegister,
                  child: Text(
                    l10n.welcomeCreateAccount,
                    style: theme.textTheme.labelLarge?.copyWith(
                      color: colors.muted,
                    ),
                  ),
                ),
                TextButton(
                  onPressed: onPhone,
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
        );
      },
    );
  }
}

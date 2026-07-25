import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/demo_content.dart';
import '../../app/pulse_haptics.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../l10n/l10n.dart';
import 'ai_settings_screen.dart';

/// Pulse AI — dedicated composer, ambient aurora, animated bubbles.
class AiChatScreen extends StatefulWidget {
  const AiChatScreen({super.key});

  @override
  State<AiChatScreen> createState() => _AiChatScreenState();
}

class _AiChatScreenState extends State<AiChatScreen> {
  final _controller = TextEditingController();
  final _scroll = ScrollController();
  final _focus = FocusNode();
  final List<_AiBubble> _messages = [];
  String? _title;
  bool _thinking = false;

  bool get _composing =>
      _focus.hasFocus || _controller.text.trim().isNotEmpty || _thinking;

  @override
  void initState() {
    super.initState();
    _focus.addListener(_onComposerChanged);
    _controller.addListener(_onComposerChanged);
  }

  void _onComposerChanged() {
    if (!mounted) return;
    final scope = PulseShellScope.readOf(context);
    scope?.setTabBarCollapsed(_composing);
    setState(() {});
  }

  void _startNewConversation() {
    PulseHaptics.light();
    setState(() {
      _messages.clear();
      _title = null;
    });
  }

  @override
  void deactivate() {
    final scope = PulseShellScope.readOf(context);
    scope?.setTabBarCollapsed(false);
    super.deactivate();
  }

  @override
  void dispose() {
    _focus.removeListener(_onComposerChanged);
    _controller.removeListener(_onComposerChanged);
    _focus.dispose();
    _controller.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _send([String? preset]) async {
    final text = (preset ?? _controller.text).trim();
    if (text.isEmpty || _thinking) return;
    PulseHaptics.light();
    setState(() {
      _messages.add(_AiBubble(text: text, isUser: true));
      _controller.clear();
      _thinking = true;
      _title ??= text.length > 28 ? '${text.substring(0, 28)}…' : text;
    });
    PulseShellScope.readOf(context)?.setTabBarCollapsed(_composing);
    await Future<void>.delayed(const Duration(milliseconds: 700));
    if (!mounted) return;
    setState(() {
      _messages.add(
        _AiBubble(
          text: context.l10n.aiDemoReply,
          isUser: false,
        ),
      );
      _thinking = false;
    });
    PulseShellScope.readOf(context)?.setTabBarCollapsed(_composing);
    await Future<void>.delayed(const Duration(milliseconds: 40));
    if (_scroll.hasClients) {
      _scroll.animateTo(
        _scroll.position.maxScrollExtent + 120,
        duration: const Duration(milliseconds: 280),
        curve: Curves.easeOutCubic,
      );
    }
  }

  void _showHistory() {
    final l10n = context.l10n;
    final colors = AppColors.of(context);
    final theme = Theme.of(context);
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: colors.sheet,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return SafeArea(
          child: ListView(
            shrinkWrap: true,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                child: Text(
                  l10n.aiHistoryTooltip,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              ListTile(
                leading:
                    Icon(Icons.edit_square, color: AppColors.brandOf(context)),
                title: Text(l10n.aiNewConversation),
                onTap: () {
                  Navigator.pop(context);
                  _startNewConversation();
                },
              ),
              const Divider(height: 1),
              for (final title in demoAiChats)
                ListTile(
                  leading: Icon(
                    Icons.chat_bubble_outline_rounded,
                    color: colors.muted,
                  ),
                  title: Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  onTap: () {
                    Navigator.pop(context);
                    setState(() {
                      _title = title;
                      _messages
                        ..clear()
                        ..add(_AiBubble(text: title, isUser: false));
                    });
                  },
                ),
              const Divider(height: 1),
              ListTile(
                leading: Icon(Icons.settings_outlined, color: colors.muted),
                title: Text(l10n.aiSettings),
                onTap: () {
                  Navigator.pop(context);
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => const AiSettingsScreen(),
                    ),
                  );
                },
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final l10n = context.l10n;
    final keyboard = MediaQuery.viewInsetsOf(context).bottom;
    final composing = _composing;
    final scope = PulseShellScope.maybeOf(context);
    final tabCollapsed = scope?.tabBarCollapsed ?? composing;

    final bottomPad = keyboard > 0
        ? keyboard + 8
        : tabCollapsed
            ? systemBottomInset(context) + 10
            : pulseTabBarTopInset(context) + kPulseTabBarFabGap;

    return PulseScaffold(
      resizeToAvoidBottomInset: false,
      appBar: AppBar(
        titleSpacing: 0,
        leading: IconButton(
          tooltip: l10n.aiHistoryTooltip,
          onPressed: _showHistory,
          icon: const Icon(Icons.menu_rounded),
        ),
        title: Row(
          children: [
            const _AiMark(size: 36, pulse: true),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    _title ?? l10n.aiNewConversation,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.2,
                    ),
                  ),
                  Row(
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                          color: brand,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: brand.withValues(alpha: 0.55),
                              blurRadius: 6,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          l10n.aiStatusOnline,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: colors.muted,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: l10n.aiNewTooltip,
            onPressed: _startNewConversation,
            icon: const Icon(Icons.edit_square),
          ),
        ],
      ),
      body: Stack(
        fit: StackFit.expand,
        children: [
          const IgnorePointer(child: _AuroraBackground()),
          Column(
            children: [
              Expanded(
                child: _messages.isEmpty
                    ? _HeroState(onSuggestion: _send)
                    : ListView.builder(
                        controller: _scroll,
                        padding: const EdgeInsets.fromLTRB(
                          AppSpacing.lg,
                          AppSpacing.sm,
                          AppSpacing.lg,
                          AppSpacing.md,
                        ),
                        itemCount: _messages.length + (_thinking ? 1 : 0),
                        itemBuilder: (context, index) {
                          if (_thinking && index == _messages.length) {
                            return const _ThinkingRow();
                          }
                          return _Bubble(
                            key: ValueKey('bubble-$index-${_messages[index].text.hashCode}'),
                            message: _messages[index],
                            index: index,
                          );
                        },
                      ),
              ),
              AnimatedPadding(
                duration: const Duration(milliseconds: 280),
                curve: Curves.easeOutCubic,
                padding: EdgeInsets.fromLTRB(14, 0, 14, bottomPad),
                child: _AiComposer(
                  controller: _controller,
                  focusNode: _focus,
                  thinking: _thinking,
                  focused: _focus.hasFocus,
                  onSend: () => _send(),
                  hintText: l10n.aiInputHint,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ─── Ambient aurora ──────────────────────────────────────────────────────────

class _AuroraBackground extends StatefulWidget {
  const _AuroraBackground();

  @override
  State<_AuroraBackground> createState() => _AuroraBackgroundState();
}

class _AuroraBackgroundState extends State<_AuroraBackground>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 14),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final brand = AppColors.brandOf(context);
    final colors = AppColors.of(context);
    final reduce = MediaQuery.disableAnimationsOf(context);

    if (reduce) {
      return DecoratedBox(
        decoration: BoxDecoration(
          gradient: RadialGradient(
            center: const Alignment(-0.4, -0.7),
            radius: 1.1,
            colors: [
              brand.withValues(alpha: 0.10),
              colors.canvas.withValues(alpha: 0),
            ],
          ),
        ),
      );
    }

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        final t = _controller.value * math.pi * 2;
        return Stack(
          fit: StackFit.expand,
          children: [
            DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment(
                    -0.55 + 0.18 * math.sin(t),
                    -0.75 + 0.12 * math.cos(t * 0.7),
                  ),
                  radius: 1.15,
                  colors: [
                    brand.withValues(alpha: 0.16),
                    brand.withValues(alpha: 0.04),
                    colors.canvas.withValues(alpha: 0),
                  ],
                  stops: const [0, 0.45, 1],
                ),
              ),
            ),
            DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment(
                    0.7 + 0.15 * math.cos(t * 0.85),
                    0.55 + 0.18 * math.sin(t * 0.6),
                  ),
                  radius: 0.95,
                  colors: [
                    brand.withValues(alpha: 0.10),
                    colors.canvas.withValues(alpha: 0),
                  ],
                ),
              ),
            ),
            DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment(
                    -0.1 + 0.1 * math.sin(t * 1.2),
                    0.15 + 0.1 * math.cos(t),
                  ),
                  radius: 0.7,
                  colors: [
                    brand.withValues(alpha: 0.06),
                    colors.canvas.withValues(alpha: 0),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

// ─── Composer ────────────────────────────────────────────────────────────────

class _AiComposer extends StatelessWidget {
  const _AiComposer({
    required this.controller,
    required this.focusNode,
    required this.thinking,
    required this.focused,
    required this.onSend,
    required this.hintText,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final bool thinking;
  final bool focused;
  final VoidCallback onSend;
  final String hintText;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final onBrand = AppColors.onBrandOf(context);
    final hasText = controller.text.trim().isNotEmpty;
    final canSend = hasText && !thinking;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 240),
      curve: Curves.easeOutCubic,
      decoration: BoxDecoration(
        color: colors.sheet.withValues(alpha: 0.96),
        borderRadius: BorderRadius.circular(26),
        border: Border.all(
          color: focused ? brand.withValues(alpha: 0.45) : colors.border,
          width: focused ? 1.4 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: focused
                ? brand.withValues(alpha: 0.18)
                : colors.ink.withValues(alpha: 0.07),
            blurRadius: focused ? 28 : 22,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 4, 6, 4),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: TextField(
                controller: controller,
                focusNode: focusNode,
                minLines: 1,
                maxLines: 5,
                textCapitalization: TextCapitalization.sentences,
                textInputAction: TextInputAction.send,
                enabled: !thinking,
                style: theme.textTheme.bodyLarge,
                decoration: InputDecoration(
                  hintText: hintText,
                  hintStyle: theme.textTheme.bodyLarge?.copyWith(
                    color: colors.muted,
                  ),
                  isCollapsed: true,
                  filled: false,
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(vertical: 14),
                ),
                onSubmitted: (_) {
                  if (canSend) onSend();
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: AnimatedScale(
                scale: canSend || thinking ? 1 : 0.86,
                duration: const Duration(milliseconds: 180),
                curve: Curves.easeOutCubic,
                child: thinking
                    ? Padding(
                        padding: const EdgeInsets.all(10),
                        child: SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: brand,
                          ),
                        ),
                      )
                    : IconButton(
                        onPressed: canSend ? onSend : null,
                        visualDensity: VisualDensity.compact,
                        style: IconButton.styleFrom(
                          backgroundColor:
                              canSend ? brand : brand.withValues(alpha: 0.18),
                          foregroundColor:
                              canSend ? onBrand : brand.withValues(alpha: 0.55),
                          disabledBackgroundColor:
                              brand.withValues(alpha: 0.18),
                          disabledForegroundColor:
                              brand.withValues(alpha: 0.45),
                          minimumSize: const Size(40, 40),
                          shape: const CircleBorder(),
                        ),
                        icon: const Icon(
                          Icons.arrow_upward_rounded,
                          size: 20,
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Mark ────────────────────────────────────────────────────────────────────

class _AiMark extends StatefulWidget {
  const _AiMark({this.size = 38, this.pulse = false});

  final double size;
  final bool pulse;

  @override
  State<_AiMark> createState() => _AiMarkState();
}

class _AiMarkState extends State<_AiMark> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    );
    if (widget.pulse) {
      _controller.repeat(reverse: true);
    }
  }

  @override
  void didUpdateWidget(covariant _AiMark oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.pulse && !_controller.isAnimating) {
      _controller.repeat(reverse: true);
    } else if (!widget.pulse && _controller.isAnimating) {
      _controller.stop();
      _controller.value = 0;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final brand = AppColors.brandOf(context);
    final reduce = MediaQuery.disableAnimationsOf(context);

    Widget mark({double glow = 0}) {
      return Container(
        width: widget.size,
        height: widget.size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              brand.withValues(alpha: 0.28),
              brand.withValues(alpha: 0.10),
            ],
          ),
          border: Border.all(
            color: brand.withValues(alpha: 0.28 + glow * 0.25),
          ),
          boxShadow: [
            BoxShadow(
              color: brand.withValues(alpha: 0.18 + glow * 0.22),
              blurRadius: 10 + glow * 14,
              spreadRadius: glow * 1.5,
            ),
          ],
        ),
        alignment: Alignment.center,
        child: Icon(
          Icons.auto_awesome,
          size: widget.size * 0.42,
          color: brand,
        ),
      );
    }

    if (!widget.pulse || reduce) {
      return mark();
    }

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) => mark(glow: _controller.value),
    );
  }
}

// ─── Hero empty state ────────────────────────────────────────────────────────

class _HeroState extends StatelessWidget {
  const _HeroState({required this.onSuggestion});

  final ValueChanged<String> onSuggestion;

  static const _icons = [
    Icons.forum_outlined,
    Icons.phone_in_talk_outlined,
    Icons.school_outlined,
    Icons.compare_arrows_rounded,
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final l10n = context.l10n;

    return ListView(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.md,
        AppSpacing.xl,
        AppSpacing.md,
        AppSpacing.sm,
      ),
      children: [
        TweenAnimationBuilder<double>(
          tween: Tween(begin: 0, end: 1),
          duration: const Duration(milliseconds: 520),
          curve: Curves.easeOutCubic,
          builder: (context, t, child) {
            return Opacity(
              opacity: t,
              child: Transform.translate(
                offset: Offset(0, 14 * (1 - t)),
                child: child,
              ),
            );
          },
          child: Column(
            children: [
              const _AiMark(size: 64, pulse: true),
              const SizedBox(height: AppSpacing.md),
              Text(
                l10n.aiEmptyPrompt,
                textAlign: TextAlign.center,
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                l10n.aiEmptySubtitle,
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: colors.muted,
                  height: 1.35,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        for (var i = 0; i < demoAiChats.length; i++)
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: 1),
            duration: Duration(milliseconds: 420 + i * 90),
            curve: Curves.easeOutCubic,
            builder: (context, t, child) {
              return Opacity(
                opacity: t,
                child: Transform.translate(
                  offset: Offset(0, 18 * (1 - t)),
                  child: child,
                ),
              );
            },
            child: Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Material(
                color: colors.sheet.withValues(alpha: 0.88),
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(18),
                  side: BorderSide(color: colors.border),
                ),
                clipBehavior: Clip.antiAlias,
                child: InkWell(
                  onTap: () {
                    PulseHaptics.selection();
                    onSuggestion(demoAiChats[i]);
                  },
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 13,
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            color: brand.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          alignment: Alignment.center,
                          child: Icon(
                            _icons[i % _icons.length],
                            size: 18,
                            color: brand,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            demoAiChats[i],
                            style: theme.textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w600,
                              color: colors.ink,
                            ),
                          ),
                        ),
                        Icon(
                          Icons.arrow_forward_ios_rounded,
                          size: 13,
                          color: colors.muted,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

// ─── Bubbles ─────────────────────────────────────────────────────────────────

class _AiBubble {
  const _AiBubble({required this.text, required this.isUser});
  final String text;
  final bool isUser;
}

class _Bubble extends StatelessWidget {
  const _Bubble({
    super.key,
    required this.message,
    required this.index,
  });

  final _AiBubble message;
  final int index;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final mine = message.isUser;

    final bubble = Container(
      padding: const EdgeInsets.fromLTRB(14, 11, 14, 11),
      constraints: BoxConstraints(
        maxWidth: MediaQuery.sizeOf(context).width * 0.82,
      ),
      decoration: BoxDecoration(
        color: mine ? brand.withValues(alpha: 0.16) : colors.sheet,
        borderRadius: BorderRadius.only(
          topLeft: const Radius.circular(18),
          topRight: const Radius.circular(18),
          bottomLeft: Radius.circular(mine ? 18 : 5),
          bottomRight: Radius.circular(mine ? 5 : 18),
        ),
        border: Border.all(
          color: mine ? brand.withValues(alpha: 0.22) : colors.border,
        ),
        boxShadow: [
          BoxShadow(
            color: colors.ink.withValues(alpha: 0.04),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Text(
        message.text,
        style: theme.textTheme.bodyLarge?.copyWith(
          height: 1.4,
          fontWeight: FontWeight.w500,
          color: colors.ink,
        ),
      ),
    );

    final content = mine
        ? Align(
            alignment: Alignment.centerRight,
            child: Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: bubble,
            ),
          )
        : Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                const _AiMark(size: 28),
                const SizedBox(width: 8),
                Flexible(child: bubble),
              ],
            ),
          );

    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: const Duration(milliseconds: 320),
      curve: Curves.easeOutCubic,
      builder: (context, t, child) {
        return Opacity(
          opacity: t,
          child: Transform.translate(
            offset: Offset(0, 16 * (1 - t)),
            child: child,
          ),
        );
      },
      child: content,
    );
  }
}

class _ThinkingRow extends StatefulWidget {
  const _ThinkingRow();

  @override
  State<_ThinkingRow> createState() => _ThinkingRowState();
}

class _ThinkingRowState extends State<_ThinkingRow>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1100),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final reduce = MediaQuery.disableAnimationsOf(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          const _AiMark(size: 28),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: colors.sheet,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(18),
                topRight: Radius.circular(18),
                bottomLeft: Radius.circular(5),
                bottomRight: Radius.circular(18),
              ),
              border: Border.all(color: colors.border),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  context.l10n.aiThinking,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: colors.muted,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(width: 8),
                if (reduce)
                  Icon(Icons.more_horiz, size: 16, color: colors.muted)
                else
                  AnimatedBuilder(
                    animation: _controller,
                    builder: (context, _) {
                      return Row(
                        mainAxisSize: MainAxisSize.min,
                        children: List.generate(3, (i) {
                          final phase = (_controller.value + i * 0.22) % 1.0;
                          final y = math.sin(phase * math.pi * 2) * 3;
                          final opacity = 0.35 + 0.65 * ((1 - (phase - 0.5).abs() * 2).clamp(0.0, 1.0));
                          return Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 1.5),
                            child: Transform.translate(
                              offset: Offset(0, -y),
                              child: Opacity(
                                opacity: opacity,
                                child: Container(
                                  width: 5,
                                  height: 5,
                                  decoration: BoxDecoration(
                                    color: brand,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                              ),
                            ),
                          );
                        }),
                      );
                    },
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

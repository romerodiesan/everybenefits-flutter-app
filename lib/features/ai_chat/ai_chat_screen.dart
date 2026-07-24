import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/demo_content.dart';
import '../../app/pulse_haptics.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../l10n/l10n.dart';
import 'ai_settings_screen.dart';

/// Pulse-styled AI assistant chat (demo replies until Gemini is wired).
class AiChatScreen extends StatefulWidget {
  const AiChatScreen({super.key});

  @override
  State<AiChatScreen> createState() => _AiChatScreenState();
}

class _AiChatScreenState extends State<AiChatScreen> {
  final _controller = TextEditingController();
  final _scroll = ScrollController();
  final List<_AiBubble> _messages = [];
  String? _title;
  bool _thinking = false;

  void _startNewConversation() {
    PulseHaptics.light();
    setState(() {
      _messages.clear();
      _title = null;
    });
  }

  @override
  void dispose() {
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
    await Future<void>.delayed(const Duration(milliseconds: 600));
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
    await Future<void>.delayed(const Duration(milliseconds: 40));
    if (_scroll.hasClients) {
      _scroll.animateTo(
        _scroll.position.maxScrollExtent + 80,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
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
                leading: Icon(Icons.edit_square, color: AppColors.brandOf(context)),
                title: Text(l10n.aiNewConversation),
                onTap: () {
                  Navigator.pop(context);
                  _startNewConversation();
                },
              ),
              const Divider(height: 1),
              for (final title in demoAiChats)
                ListTile(
                  leading: Icon(Icons.chat_bubble_outline_rounded, color: colors.muted),
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
    final composerBottom =
        keyboard > 0 ? 10.0 : pulseShellListBottomPad(context);

    return PulseScaffold(
      appBar: AppBar(
        titleSpacing: 0,
        leading: IconButton(
          tooltip: l10n.aiHistoryTooltip,
          onPressed: _showHistory,
          icon: const Icon(Icons.menu_rounded),
        ),
        title: Row(
          children: [
            const _AiMark(size: 38),
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
                  Text(
                    l10n.aiAssistantSubtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: colors.muted,
                      fontWeight: FontWeight.w500,
                    ),
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
      body: Column(
        children: [
          Expanded(
            child: _messages.isEmpty
                ? _EmptyState(onSuggestion: _send)
                : ListView.builder(
                    controller: _scroll,
                    padding: EdgeInsets.fromLTRB(
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
                      return _Bubble(message: _messages[index]);
                    },
                  ),
          ),
          DecoratedBox(
            decoration: BoxDecoration(
              color: colors.sheet.withValues(alpha: 0.96),
              border: Border(top: BorderSide(color: colors.border)),
            ),
            child: Padding(
              padding: EdgeInsets.fromLTRB(10, 10, 10, composerBottom),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      minLines: 1,
                      maxLines: 4,
                      textCapitalization: TextCapitalization.sentences,
                      enabled: !_thinking,
                      decoration: InputDecoration(
                        hintText: l10n.aiInputHint,
                        hintStyle: theme.textTheme.bodyMedium?.copyWith(
                          color: colors.muted,
                        ),
                        filled: true,
                        fillColor: colors.glassFill,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(22),
                          borderSide: BorderSide(color: colors.border),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(22),
                          borderSide: BorderSide(color: colors.border),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(22),
                          borderSide: BorderSide(color: brand, width: 1.4),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 12,
                        ),
                      ),
                      onSubmitted: (_) => _send(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Material(
                    color: brand,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: InkWell(
                      onTap: _thinking ? null : () => _send(),
                      borderRadius: BorderRadius.circular(16),
                      child: SizedBox(
                        width: 48,
                        height: 48,
                        child: _thinking
                            ? Padding(
                                padding: const EdgeInsets.all(14),
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: AppColors.onBrandOf(context),
                                ),
                              )
                            : Icon(
                                Icons.send_rounded,
                                size: 20,
                                color: AppColors.onBrandOf(context),
                              ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AiBubble {
  const _AiBubble({required this.text, required this.isUser});
  final String text;
  final bool isUser;
}

class _AiMark extends StatelessWidget {
  const _AiMark({this.size = 38});

  final double size;

  @override
  Widget build(BuildContext context) {
    final brand = AppColors.brandOf(context);
    final colors = AppColors.of(context);

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            brand.withValues(alpha: 0.22),
            brand.withValues(alpha: 0.08),
          ],
        ),
        border: Border.all(color: colors.border),
      ),
      alignment: Alignment.center,
      child: Icon(
        Icons.auto_awesome,
        size: size * 0.42,
        color: brand,
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.message});
  final _AiBubble message;

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

    if (mine) {
      return Align(
        alignment: Alignment.centerRight,
        child: Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: bubble,
        ),
      );
    }

    return Padding(
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
  }
}

class _ThinkingRow extends StatelessWidget {
  const _ThinkingRow();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          const _AiMark(size: 28),
          const SizedBox(width: 8),
          Text(
            context.l10n.aiThinking,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: colors.muted,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.onSuggestion});
  final ValueChanged<String> onSuggestion;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;

    return ListView(
      padding: EdgeInsets.fromLTRB(
        AppSpacing.lg,
        AppSpacing.xl,
        AppSpacing.lg,
        AppSpacing.lg,
      ),
      children: [
        const Center(child: _AiMark(size: 64)),
        const SizedBox(height: AppSpacing.lg),
        Text(
          l10n.aiEmptyPrompt,
          textAlign: TextAlign.center,
          style: theme.textTheme.headlineMedium?.copyWith(
            fontWeight: FontWeight.w800,
            letterSpacing: -0.4,
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        Text(
          l10n.aiEmptySubtitle,
          textAlign: TextAlign.center,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: colors.muted,
            height: 1.4,
          ),
        ),
        const SizedBox(height: AppSpacing.xl),
        for (final s in demoAiChats)
          Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
            child: PulseSheet(
              onTap: () {
                PulseHaptics.selection();
                onSuggestion(s);
              },
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      s,
                      style: theme.textTheme.bodyLarge?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  Icon(
                    Icons.arrow_forward_ios_rounded,
                    size: 14,
                    color: colors.muted,
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

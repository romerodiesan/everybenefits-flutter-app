import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/pulse_haptics.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../firebase/platform_config.dart';
import '../../l10n/l10n.dart';
import '../../users/user_profile.dart';
import '../university/widgets/markdown_body.dart';
import 'ai_settings_screen.dart';
import 'pulse_ai_client.dart';
import 'pulse_ai_models.dart';
import 'pulse_source_navigation.dart';
/// Pulse AI — full-screen conversation (no shell tab bar), ambient aurora,
/// streaming answers from the web `/api/ai/stream` backend.
class AiChatScreen extends StatefulWidget {
  const AiChatScreen({super.key, required this.profile});

  final UserProfile profile;

  @override
  State<AiChatScreen> createState() => _AiChatScreenState();
}

class _AiChatScreenState extends State<AiChatScreen> {
  final _controller = TextEditingController();
  final _scroll = ScrollController();
  final _focus = FocusNode();
  final _client = PulseAiClient();
  final _messages = <PulseChatMessage>[];
  final _localId = _LocalId();

  String? _conversationId;
  String? _title;
  bool _streaming = false;
  String? _errorMessage;
  bool _pulseAiEnabled = false;
  CancelToken? _cancelToken;
  StreamSubscription<PulseStreamEvent>? _streamSub;
  StreamSubscription<bool>? _aiEnabledSub;
  Timer? _deltaTimer;
  String _pendingDelta = '';
  int _historyEpoch = 0;

  @override
  void initState() {
    super.initState();
    _focus.addListener(_onComposerChanged);
    _aiEnabledSub = PlatformConfig().watchPulseAiEnabled().listen(
      (enabled) {
        if (!mounted) return;
        setState(() => _pulseAiEnabled = enabled);
      },
        onError: (_) {
          if (!mounted) return;
          setState(() => _pulseAiEnabled = false);
        },
    );
  }

  void _onComposerChanged() {
    if (!mounted) return;
    setState(() {});
  }

  String get _locale => Localizations.localeOf(context).languageCode;

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      _scroll.animateTo(
        _scroll.position.maxScrollExtent + 120,
        duration: const Duration(milliseconds: 280),
        curve: Curves.easeOutCubic,
      );
    });
  }

  void _startNewConversation() {
    _stopStream();
    PulseHaptics.light();
    setState(() {
      _messages.clear();
      _conversationId = null;
      _title = null;
      _errorMessage = null;
    });
  }

  void _stopStream() {
    _cancelToken?.cancel();
    _cancelToken = null;
    unawaited(_streamSub?.cancel());
    _streamSub = null;
    _flushPendingDelta();
    if (_streaming) {
      setState(() => _streaming = false);
    }
  }

  void _flushPendingDelta() {
    _deltaTimer?.cancel();
    _deltaTimer = null;
    if (_pendingDelta.isEmpty || !mounted) return;
    final delta = _pendingDelta;
    _pendingDelta = '';
    setState(() => _lastAssistant?.text += delta);
  }

  PulseChatMessage? get _lastAssistant {
    if (_messages.isEmpty || _messages.last.isUser) return null;
    return _messages.last;
  }

  void _upsertActivity(PulseActivity activity) {
    final message = _lastAssistant;
    if (message == null) return;
    final index = message.activities.indexWhere((a) => a.id == activity.id);
    if (index >= 0) {
      message.activities[index] = activity;
    } else {
      message.activities.add(activity);
    }
  }

  Future<void> _send([String? preset]) async {
    final text = (preset ?? _controller.text).trim();
    if (text.isEmpty || _streaming) return;

    PulseHaptics.light();
    final userId = _localId.next('user');
    final assistantId = _localId.next('assistant');

    setState(() {
      _errorMessage = null;
      _messages
        ..add(PulseChatMessage(id: userId, role: PulseRole.user, text: text))
        ..add(PulseChatMessage(id: assistantId, role: PulseRole.assistant));
      _controller.clear();
      _streaming = true;
      _title ??= text.length > 28 ? '${text.substring(0, 28)}…' : text;
    });
    _scrollToBottom();

    final token = CancelToken();
    _cancelToken = token;

    try {
      _streamSub = _client
          .streamTurn(
            message: text,
            locale: _locale,
            conversationId: _conversationId,
            cancelToken: token,
          )
          .listen(
            _onStreamEvent,
            onError: _onStreamError,
            onDone: () {
              if (mounted && _streaming) {
                setState(() => _streaming = false);
              }
            },
          );
    } catch (error) {
      _onStreamError(error);
    }
  }

  void _onStreamEvent(PulseStreamEvent event) {
    if (!mounted) return;
    if (event case PulseTextEvent(:final delta)) {
      _pendingDelta += delta;
      _deltaTimer ??= Timer(
        const Duration(milliseconds: 50),
        _flushPendingDelta,
      );
      return;
    }
    _flushPendingDelta();
    setState(() {
      switch (event) {
        case PulseConversationEvent(:final conversationId, :final title):
          _conversationId = conversationId;
          if (title != null && title.trim().isNotEmpty) {
            _title = title.trim();
          }
        case PulseActivityEvent(:final activity):
          _upsertActivity(activity);
        case PulseTextEvent():
          break;
        case PulseSourcesEvent(:final sources):
          final message = _lastAssistant;
          if (message != null) {
            message.sources
              ..clear()
              ..addAll(sources);
          }
        case PulseNoticeEvent(:final notice):
          _lastAssistant?.notices.add(notice);
        case PulseDoneEvent(:final messageId, :final title):
          final message = _lastAssistant;
          if (message != null) {
            message.storedId = messageId;
          }
          if (title != null && title.trim().isNotEmpty) {
            _title = title.trim();
          }
          _streaming = false;
          _historyEpoch++;
        case PulseErrorEvent(:final message):
          _errorMessage = message;
          _streaming = false;
      }
    });
    _scrollToBottom();
  }

  void _onStreamError(Object error) {
    if (!mounted) return;
    setState(() {
      _streaming = false;
      _errorMessage = switch (error) {
        PulseAiException(code: 'ai-disabled') => context.l10n.aiDisabled,
        PulseAiException(:final message) => message,
        _ => context.l10n.aiError,
      };
      final assistant = _lastAssistant;
      if (assistant != null &&
          assistant.text.trim().isEmpty &&
          assistant.activities.isEmpty) {
        _messages.removeLast();
      }
    });
  }

  Future<void> _loadConversation(String id) async {
    _stopStream();
    _deltaTimer?.cancel();
    setState(() {
      _errorMessage = null;
      _messages.clear();
      _conversationId = id;
      _title = null;
    });

    try {
      final stored = await _client.loadMessages(id);
      if (!mounted) return;
      setState(() {
        _messages.addAll([
          for (final message in stored)
            PulseChatMessage(
              id: message.id,
              role: message.role,
              text: message.text,
              sources: List<PulseSource>.from(message.sources),
              storedId: message.role == PulseRole.assistant ? message.id : null,
              feedback: message.feedback,
            ),
        ]);
      });
      _scrollToBottom();
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _errorMessage = switch (error) {
          PulseAiException(code: 'ai-disabled') => context.l10n.aiDisabled,
          PulseAiException(:final message) => message,
          _ => context.l10n.aiError,
        };
      });
    }
  }

  Future<void> _deleteConversation(String id) async {
    if (_conversationId == id) {
      _startNewConversation();
    }
    try {
      await _client.deleteConversation(id);
      if (mounted) setState(() => _historyEpoch++);
    } catch (_) {
      if (mounted) setState(() => _historyEpoch++);
    }
  }

  Future<void> _sendFeedback(PulseChatMessage message, PulseFeedback value) async {
    final storedId = message.storedId;
    final conversationId = _conversationId;
    if (storedId == null || conversationId == null) return;

    final next = message.feedback == value ? null : value;
    setState(() => message.feedback = next);
    try {
      await _client.sendFeedback(
        conversationId: conversationId,
        messageId: storedId,
        feedback: next,
      );
    } catch (_) {}
  }

  Future<void> _showHistory() async {
    final l10n = context.l10n;
    final colors = AppColors.of(context);
    final theme = Theme.of(context);

    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: colors.sheet,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return _HistorySheet(
          key: ValueKey(_historyEpoch),
          client: _client,
          activeId: _conversationId,
          l10n: l10n,
          theme: theme,
          colors: colors,
          onNew: () {
            Navigator.pop(context);
            _startNewConversation();
          },
          onSelect: (id) {
            Navigator.pop(context);
            unawaited(_loadConversation(id));
          },
          onDelete: (id) => unawaited(_deleteConversation(id)),
          onSettings: () {
            Navigator.pop(context);
            Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => const AiSettingsScreen(),
              ),
            );
          },
        );
      },
    );
  }

  List<String> _suggestions(AppLocalizations l10n) => [
        l10n.aiSuggestion1,
        l10n.aiSuggestion2,
        l10n.aiSuggestion3,
        l10n.aiSuggestion4,
      ];

  @override
  void dispose() {
    _cancelToken?.cancel();
    unawaited(_streamSub?.cancel());
    unawaited(_aiEnabledSub?.cancel());
    _deltaTimer?.cancel();
    _pendingDelta = '';
    _client.close();
    _focus.removeListener(_onComposerChanged);
    _focus.dispose();
    _controller.dispose();
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final l10n = context.l10n;
    final keyboard = MediaQuery.viewInsetsOf(context).bottom;

    if (!_pulseAiEnabled) {
      return PulseScaffold(
        appBar: AppBar(
          titleSpacing: 0,
          leading: const BackButton(),
          title: Text(l10n.navAi),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Text(
              l10n.aiDisabled,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyLarge?.copyWith(color: colors.muted),
            ),
          ),
        ),
      );
    }

    final bottomPad = keyboard > 0
        ? keyboard + 8
        : systemBottomInset(context) + 10;

    return PulseScaffold(
      resizeToAvoidBottomInset: false,
      appBar: AppBar(
        titleSpacing: 0,
        leading: const BackButton(),
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
            tooltip: l10n.aiHistoryTooltip,
            onPressed: _showHistory,
            icon: const Icon(Icons.history_rounded),
          ),
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
                    ? _HeroState(
                        suggestions: _suggestions(l10n),
                        onSuggestion: _send,
                      )
                    : ListView.builder(
                        controller: _scroll,
                        padding: const EdgeInsets.fromLTRB(
                          AppSpacing.lg,
                          AppSpacing.sm,
                          AppSpacing.lg,
                          AppSpacing.md,
                        ),
                        itemCount: _messages.length + (_errorMessage != null ? 1 : 0),
                        itemBuilder: (context, index) {
                          if (_errorMessage != null && index == _messages.length) {
                            return _ErrorBanner(message: _errorMessage!);
                          }
                          final message = _messages[index];
                          final isLast = index == _messages.length - 1;
                          final waiting = _streaming &&
                              isLast &&
                              !message.isUser &&
                              message.text.trim().isEmpty &&
                              message.activities.isEmpty;
                          if (message.isUser) {
                            return _UserBubble(message: message, index: index);
                          }
                          return _AssistantBubble(
                            key: ValueKey(message.id),
                            message: message,
                            profile: widget.profile,
                            waiting: waiting,
                            streaming: _streaming && isLast && !message.isUser,
                            onFeedback: (value) =>
                                unawaited(_sendFeedback(message, value)),
                          );
                        },
                      ),
              ),
              if (_messages.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.lg,
                    0,
                    AppSpacing.lg,
                    AppSpacing.xs,
                  ),
                  child: Text(
                    l10n.aiDisclaimer,
                    textAlign: TextAlign.center,
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: colors.muted,
                      height: 1.35,
                    ),
                  ),
                ),
              AnimatedPadding(
                duration: const Duration(milliseconds: 280),
                curve: Curves.easeOutCubic,
                padding: EdgeInsets.fromLTRB(14, 0, 14, bottomPad),
                child: ValueListenableBuilder<TextEditingValue>(
                  valueListenable: _controller,
                  builder: (context, _, child) => _AiComposer(
                    controller: _controller,
                    focusNode: _focus,
                    streaming: _streaming,
                    focused: _focus.hasFocus,
                    onSend: () => unawaited(_send()),
                    onStop: _stopStream,
                    stopLabel: l10n.aiStop,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _LocalId {
  var _seq = 0;
  String next(String prefix) => '$prefix-${++_seq}-${DateTime.now().microsecondsSinceEpoch}';
}

class _HistorySheet extends StatefulWidget {
  const _HistorySheet({
    super.key,
    required this.client,
    required this.activeId,
    required this.l10n,
    required this.theme,
    required this.colors,
    required this.onNew,
    required this.onSelect,
    required this.onDelete,
    required this.onSettings,
  });

  final PulseAiClient client;
  final String? activeId;
  final AppLocalizations l10n;
  final ThemeData theme;
  final AppColors colors;
  final VoidCallback onNew;
  final ValueChanged<String> onSelect;
  final ValueChanged<String> onDelete;
  final VoidCallback onSettings;

  @override
  State<_HistorySheet> createState() => _HistorySheetState();
}

class _HistorySheetState extends State<_HistorySheet> {
  late Future<List<PulseConversationSummary>> _future;

  @override
  void initState() {
    super.initState();
    _future = widget.client.listConversations();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = widget.l10n;
    return SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
            child: Text(
              l10n.aiHistoryTooltip,
              style: widget.theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          ListTile(
            leading: Icon(Icons.edit_square, color: AppColors.brandOf(context)),
            title: Text(l10n.aiNewConversation),
            onTap: widget.onNew,
          ),
          const Divider(height: 1),
          Flexible(
            child: FutureBuilder<List<PulseConversationSummary>>(
              future: _future,
              builder: (context, snapshot) {
                if (snapshot.connectionState != ConnectionState.done) {
                  return Padding(
                    padding: const EdgeInsets.all(24),
                    child: Center(
                      child: Text(
                        l10n.aiLoading,
                        style: widget.theme.textTheme.bodyMedium?.copyWith(
                          color: widget.colors.muted,
                        ),
                      ),
                    ),
                  );
                }
                final conversations = snapshot.data ?? const [];
                if (conversations.isEmpty) {
                  return Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(
                      l10n.aiHistoryEmpty,
                      style: widget.theme.textTheme.bodyMedium?.copyWith(
                        color: widget.colors.muted,
                      ),
                    ),
                  );
                }
                return ListView.builder(
                  shrinkWrap: true,
                  itemCount: conversations.length,
                  itemBuilder: (context, index) {
                    final entry = conversations[index];
                    final title = entry.title.trim().isNotEmpty
                        ? entry.title
                        : l10n.aiUntitled;
                    final selected = entry.id == widget.activeId;
                    return ListTile(
                      leading: Icon(
                        selected
                            ? Icons.chat_bubble_rounded
                            : Icons.chat_bubble_outline_rounded,
                        color: selected
                            ? AppColors.brandOf(context)
                            : widget.colors.muted,
                      ),
                      title: Text(
                        title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      subtitle: entry.lastMessagePreview.trim().isNotEmpty
                          ? Text(
                              entry.lastMessagePreview,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            )
                          : null,
                      trailing: IconButton(
                        tooltip: l10n.aiDeleteChat,
                        icon: Icon(
                          Icons.delete_outline_rounded,
                          color: widget.colors.muted,
                        ),
                        onPressed: () {
                          setState(() {
                            _future = widget.client.listConversations();
                          });
                          widget.onDelete(entry.id);
                        },
                      ),
                      onTap: () => widget.onSelect(entry.id),
                    );
                  },
                );
              },
            ),
          ),
          const Divider(height: 1),
          ListTile(
            leading: Icon(Icons.settings_outlined, color: widget.colors.muted),
            title: Text(l10n.aiSettings),
            onTap: widget.onSettings,
          ),
        ],
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: const Color(0xFFB42318).withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: const Color(0xFFB42318).withValues(alpha: 0.35),
          ),
        ),
        child: Text(
          message,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: const Color(0xFFB42318),
                height: 1.35,
              ),
        ),
      ),
    );
  }
}

class _UserBubble extends StatelessWidget {
  const _UserBubble({required this.message, required this.index});

  final PulseChatMessage message;
  final int index;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);

    return _AnimatedEntry(
      child: Align(
        alignment: Alignment.centerRight,
        child: Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Container(
            padding: const EdgeInsets.fromLTRB(14, 11, 14, 11),
            constraints: BoxConstraints(
              maxWidth: MediaQuery.sizeOf(context).width * 0.82,
            ),
            decoration: BoxDecoration(
              color: brand.withValues(alpha: 0.16),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(18),
                topRight: Radius.circular(18),
                bottomLeft: Radius.circular(18),
                bottomRight: Radius.circular(5),
              ),
              border: Border.all(color: brand.withValues(alpha: 0.22)),
            ),
            child: Text(
              message.text,
              style: theme.textTheme.bodyLarge?.copyWith(
                height: 1.4,
                fontWeight: FontWeight.w500,
                color: colors.ink,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _AssistantBubble extends StatelessWidget {
  const _AssistantBubble({
    super.key,
    required this.message,
    required this.profile,
    required this.waiting,
    required this.streaming,
    required this.onFeedback,
  });

  final PulseChatMessage message;
  final UserProfile profile;
  final bool waiting;
  final bool streaming;
  final ValueChanged<PulseFeedback> onFeedback;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;

    return _AnimatedEntry(
      child: Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const _AiMark(size: 28),
            const SizedBox(width: 8),
            Flexible(
              child: Container(
                padding: const EdgeInsets.fromLTRB(14, 11, 14, 11),
                decoration: BoxDecoration(
                  color: colors.sheet,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(18),
                    topRight: Radius.circular(18),
                    bottomLeft: Radius.circular(5),
                    bottomRight: Radius.circular(18),
                  ),
                  border: Border.all(color: colors.border),
                  boxShadow: [
                    BoxShadow(
                      color: colors.ink.withValues(alpha: 0.04),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (waiting)
                      const _ThinkingDots()
                    else if (message.text.trim().isNotEmpty)
                      MarkdownBody(source: message.text),
                    for (final notice in message.notices)
                      _NoticeBanner(notice: notice),
                    if (message.sources.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      Text(
                        l10n.aiSources,
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: colors.muted,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.4,
                        ),
                      ),
                      const SizedBox(height: 8),
                      for (final source in message.sources)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: _SourceCard(
                            source: source,
                            onTap: () => openPulseSource(
                              context,
                              source: source,
                              profile: profile,
                            ),
                          ),
                        ),
                    ],
                    if (message.storedId != null && !streaming) ...[
                      const SizedBox(height: 6),
                      _FeedbackRow(
                        feedback: message.feedback,
                        onFeedback: onFeedback,
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NoticeBanner extends StatelessWidget {
  const _NoticeBanner({required this.notice});

  final PulseNotice notice;

  String _copy(AppLocalizations l10n) {
    return switch (notice.kind) {
      PulseNoticeKind.refusal => switch (notice.reason) {
          'legal_advice' => l10n.aiNoticeLegal,
          _ => l10n.aiNoticeScope,
        },
      PulseNoticeKind.compliance => l10n.aiNoticeCompliance,
      PulseNoticeKind.noSources => l10n.aiNoticeNoSources,
    };
  }

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final compliance = notice.kind == PulseNoticeKind.compliance;

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: compliance
            ? const Color(0xFFFFB84D).withValues(alpha: 0.12)
            : colors.ink.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: compliance
              ? const Color(0xFFFFB84D).withValues(alpha: 0.45)
              : colors.border,
        ),
      ),
      child: Text(
        _copy(context.l10n),
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: compliance
                  ? const Color(0xFF8A5200)
                  : colors.muted,
              height: 1.4,
            ),
      ),
    );
  }
}

class _SourceCard extends StatelessWidget {
  const _SourceCard({required this.source, required this.onTap});

  final PulseSource source;
  final VoidCallback onTap;

  String _typeLabel(AppLocalizations l10n) {
    return switch (source.type) {
      PulseSourceType.acceptedForumAnswer => l10n.aiSourceForum,
      PulseSourceType.course => l10n.aiSourceCourse,
      PulseSourceType.path => l10n.aiSourcePath,
      PulseSourceType.lesson => l10n.aiSourceLesson,
      PulseSourceType.official => l10n.aiSourceOfficial,
    };
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final label = source.publisher?.trim().isNotEmpty == true
        ? source.publisher!.trim()
        : _typeLabel(context.l10n);
    final external = source.url.startsWith('http');

    return Material(
      color: colors.canvas,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: colors.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 5),
                    constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: brand.withValues(alpha: 0.16),
                      borderRadius: BorderRadius.circular(5),
                    ),
                    child: Text(
                      source.number,
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: brand,
                        fontWeight: FontWeight.w800,
                        fontSize: 10,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      label.toUpperCase(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: colors.muted,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.4,
                        fontSize: 10,
                      ),
                    ),
                  ),
                  if (external)
                    Icon(Icons.open_in_new_rounded, size: 14, color: colors.muted),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                source.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  height: 1.3,
                ),
              ),
              if (source.excerpt.trim().isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  source.excerpt,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colors.muted,
                    height: 1.35,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _FeedbackRow extends StatelessWidget {
  const _FeedbackRow({
    required this.feedback,
    required this.onFeedback,
  });

  final PulseFeedback? feedback;
  final ValueChanged<PulseFeedback> onFeedback;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);

    Widget button({
      required PulseFeedback value,
      required String label,
      required bool selected,
    }) {
      return TextButton.icon(
        onPressed: () {
          PulseHaptics.selection();
          onFeedback(value);
        },
        style: TextButton.styleFrom(
          visualDensity: VisualDensity.compact,
          foregroundColor: selected ? brand : colors.muted,
          padding: const EdgeInsets.symmetric(horizontal: 8),
        ),
        icon: Icon(
          value == PulseFeedback.up
              ? Icons.thumb_up_outlined
              : Icons.thumb_down_outlined,
          size: 16,
        ),
        label: Text(
          label,
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                fontWeight: FontWeight.w600,
              ),
        ),
      );
    }

    return Row(
      children: [
        button(
          value: PulseFeedback.up,
          label: l10n.aiFeedbackUp,
          selected: feedback == PulseFeedback.up,
        ),
        button(
          value: PulseFeedback.down,
          label: l10n.aiFeedbackDown,
          selected: feedback == PulseFeedback.down,
        ),
      ],
    );
  }
}

class _AnimatedEntry extends StatelessWidget {
  const _AnimatedEntry({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
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
      child: child,
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
    required this.streaming,
    required this.focused,
    required this.onSend,
    required this.onStop,
    required this.stopLabel,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final bool streaming;
  final bool focused;
  final VoidCallback onSend;
  final VoidCallback onStop;
  final String stopLabel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final onBrand = AppColors.onBrandOf(context);
    final hasText = controller.text.trim().isNotEmpty;
    final canSend = hasText && !streaming;

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
                enabled: !streaming,
                style: theme.textTheme.bodyLarge,
                decoration: const InputDecoration(
                  isCollapsed: true,
                  filled: false,
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  contentPadding: EdgeInsets.symmetric(vertical: 14),
                ),
                onSubmitted: (_) {
                  if (canSend) onSend();
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: AnimatedScale(
                scale: canSend || streaming ? 1 : 0.86,
                duration: const Duration(milliseconds: 180),
                curve: Curves.easeOutCubic,
                child: streaming
                    ? IconButton(
                        tooltip: stopLabel,
                        onPressed: onStop,
                        visualDensity: VisualDensity.compact,
                        style: IconButton.styleFrom(
                          backgroundColor: brand.withValues(alpha: 0.16),
                          foregroundColor: brand,
                          minimumSize: const Size(40, 40),
                          shape: const CircleBorder(),
                        ),
                        icon: const Icon(Icons.stop_rounded, size: 20),
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
  const _HeroState({
    required this.suggestions,
    required this.onSuggestion,
  });

  final List<String> suggestions;
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
        for (var i = 0; i < suggestions.length; i++)
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
                    onSuggestion(suggestions[i]);
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
                            suggestions[i],
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

class _ThinkingDots extends StatefulWidget {
  const _ThinkingDots();

  @override
  State<_ThinkingDots> createState() => _ThinkingDotsState();
}

class _ThinkingDotsState extends State<_ThinkingDots>
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

    return Row(
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
                  final opacity =
                      0.35 + 0.65 * ((1 - (phase - 0.5).abs() * 2).clamp(0.0, 1.0));
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
    );
  }
}

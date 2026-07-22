import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/demo_content.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import 'ai_settings_screen.dart';

/// Minimal AI assistant chat.
class AiChatScreen extends StatefulWidget {
  const AiChatScreen({super.key});

  @override
  State<AiChatScreen> createState() => _AiChatScreenState();
}

class _AiChatScreenState extends State<AiChatScreen> {
  final _controller = TextEditingController();
  final _scroll = ScrollController();
  final List<_AiBubble> _messages = [];
  String _title = 'Nueva conversación';
  bool _thinking = false;

  @override
  void dispose() {
    _controller.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _send([String? preset]) async {
    final text = (preset ?? _controller.text).trim();
    if (text.isEmpty || _thinking) return;
    setState(() {
      _messages.add(_AiBubble(text: text, isUser: true));
      _controller.clear();
      _thinking = true;
      if (_title == 'Nueva conversación') {
        _title = text.length > 28 ? '${text.substring(0, 28)}…' : text;
      }
    });
    await Future<void>.delayed(const Duration(milliseconds: 600));
    if (!mounted) return;
    setState(() {
      _messages.add(
        const _AiBubble(
          text:
              'Respuesta demo. Cuando conectemos Gemini, verás ayuda real aquí.',
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
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppColors.of(context).sheet,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return SafeArea(
          child: ListView(
            shrinkWrap: true,
            children: [
              ListTile(
                leading: const Icon(Icons.edit_square),
                title: const Text('Nueva conversación'),
                onTap: () {
                  Navigator.pop(context);
                  setState(() {
                    _messages.clear();
                    _title = 'Nueva conversación';
                  });
                },
              ),
              const Divider(height: 1),
              for (final title in demoAiChats)
                ListTile(
                  title: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis),
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
              ListTile(
                leading: const Icon(Icons.settings_outlined),
                title: const Text('Ajustes'),
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

    return PulseScaffold(
      appBar: AppBar(
        leading: IconButton(
          tooltip: 'Historial',
          onPressed: _showHistory,
          icon: const Icon(Icons.menu_rounded),
        ),
        title: Text(
          _title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        actions: [
          IconButton(
            tooltip: 'Nueva',
            onPressed: () {
              setState(() {
                _messages.clear();
                _title = 'Nueva conversación';
              });
            },
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
                    padding: const EdgeInsets.fromLTRB(
                      AppSpacing.lg,
                      AppSpacing.sm,
                      AppSpacing.lg,
                      AppSpacing.md,
                    ),
                    itemCount: _messages.length + (_thinking ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (_thinking && index == _messages.length) {
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          child: Text(
                            'Pensando…',
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: colors.muted,
                            ),
                          ),
                        );
                      }
                      return _Bubble(message: _messages[index]);
                    },
                  ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.md,
                0,
                AppSpacing.md,
                AppSpacing.md,
              ),
              child: TextField(
                controller: _controller,
                minLines: 1,
                maxLines: 4,
                textCapitalization: TextCapitalization.sentences,
                decoration: InputDecoration(
                  hintText: 'Pregunta lo que sea',
                  filled: true,
                  fillColor: colors.sheet,
                  suffixIcon: IconButton(
                    onPressed: _thinking ? null : () => _send(),
                    icon: Icon(
                      Icons.arrow_upward_rounded,
                      color: _thinking ? colors.muted : AppColors.brandOf(context),
                    ),
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(20),
                  ),
                ),
                onSubmitted: (_) => _send(),
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

class _Bubble extends StatelessWidget {
  const _Bubble({required this.message});
  final _AiBubble message;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);

    if (message.isUser) {
      return Align(
        alignment: Alignment.centerRight,
        child: Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          constraints: BoxConstraints(
            maxWidth: MediaQuery.sizeOf(context).width * 0.82,
          ),
          decoration: BoxDecoration(
            color: AppColors.brandOf(context).withValues(alpha: 0.2),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: colors.border),
          ),
          child: Text(message.text, style: theme.textTheme.bodyLarge),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.auto_awesome, size: 18, color: AppColors.brandOf(context)),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message.text,
              style: theme.textTheme.bodyLarge?.copyWith(height: 1.45),
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
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      children: [
        const SizedBox(height: 48),
        Text(
          '¿En qué puedo ayudarte?',
          textAlign: TextAlign.center,
          style: theme.textTheme.headlineMedium,
        ),
        const SizedBox(height: AppSpacing.xl),
        for (final s in demoAiChats)
          Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
            child: PulseSheet(
              onTap: () => onSuggestion(s),
              child: Text(s, style: theme.textTheme.bodyLarge),
            ),
          ),
      ],
    );
  }
}

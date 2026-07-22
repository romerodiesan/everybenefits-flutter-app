import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../users/users.dart';
import 'forum_models.dart';
import 'forum_repository.dart';
import 'forum_tags.dart';
import 'thread_detail_screen.dart';
import 'widgets/forum_filter_chip.dart';
import 'widgets/forum_tag_wrap.dart';

class CreateThreadScreen extends StatefulWidget {
  const CreateThreadScreen({
    super.key,
    required this.profile,
    required this.forumRepository,
    this.initialTags = const [],
  });

  final UserProfile profile;
  final ForumRepository forumRepository;
  final List<String> initialTags;

  @override
  State<CreateThreadScreen> createState() => _CreateThreadScreenState();
}

class _CreateThreadScreenState extends State<CreateThreadScreen> {
  final _formKey = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _body = TextEditingController();
  final _tagInput = TextEditingController();
  late final Set<String> _tags = {
    ...normalizeForumTags(widget.initialTags),
  };
  bool _busy = false;

  static const _radius = BorderRadius.all(Radius.circular(16));

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    _tagInput.dispose();
    super.dispose();
  }

  void _removeTag(String tag) {
    setState(() => _tags.remove(tag));
  }

  void _addTag([String? raw]) {
    final tag = normalizeForumTag(raw ?? _tagInput.text);
    if (tag.isEmpty) return;
    if (_tags.contains(tag)) {
      if (raw == null) _tagInput.clear();
      return;
    }
    if (_tags.length >= 5) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Máximo 5 tags por hilo.')),
      );
      return;
    }
    setState(() {
      _tags.add(tag);
      if (raw == null) _tagInput.clear();
    });
  }

  void _toggleSuggestedTag(String tag, bool selected) {
    if (selected) {
      _addTag(tag);
      return;
    }
    setState(() => _tags.remove(normalizeForumTag(tag)));
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_tags.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Agrega al menos un tag.')),
      );
      return;
    }
    setState(() => _busy = true);
    try {
      final thread = await widget.forumRepository.createThread(
        tags: _tags.toList(),
        title: _title.text,
        body: _body.text,
        author: widget.profile,
      );
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute<void>(
          builder: (_) => ThreadDetailScreen(
            threadId: thread.id,
            profile: widget.profile,
            forumRepository: widget.forumRepository,
          ),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(friendlyForumError(error))),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  InputDecoration _decoration(
    BuildContext context, {
    required String label,
    String? hint,
    bool alignHint = false,
  }) {
    return InputDecoration(
      labelText: label,
      hintText: hint,
      alignLabelWithHint: alignHint,
      border: const OutlineInputBorder(borderRadius: _radius),
      enabledBorder: const OutlineInputBorder(borderRadius: _radius),
      focusedBorder: OutlineInputBorder(
        borderRadius: _radius,
        borderSide: BorderSide(
          color: AppColors.brandOf(context),
          width: 1.4,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);

    return PulseScaffold(
      appBar: AppBar(title: const Text('Nueva publicación')),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.lg,
                AppSpacing.sm,
                AppSpacing.lg,
                AppSpacing.xl,
              ),
              children: [
                TextFormField(
                  controller: _title,
                  textCapitalization: TextCapitalization.sentences,
                  textInputAction: TextInputAction.next,
                  decoration: _decoration(
                    context,
                    label: 'Pregunta',
                    hint: '¿Qué necesitas resolver?',
                  ),
                  validator: (value) {
                    if (value == null || value.trim().length < 4) {
                      return 'Escribe un título más descriptivo.';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: AppSpacing.md),
                TextFormField(
                  controller: _body,
                  textCapitalization: TextCapitalization.sentences,
                  minLines: 8,
                  maxLines: 14,
                  decoration: _decoration(
                    context,
                    label: 'Contexto',
                    hint: 'Detalles, lo que ya intentaste, y el resultado esperado…',
                    alignHint: true,
                  ),
                  validator: (value) {
                    if (value == null || value.trim().length < 8) {
                      return 'Añade un poco más de contexto.';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: AppSpacing.lg),
                Text('Temas', style: theme.textTheme.titleMedium),
                const SizedBox(height: 4),
                Text(
                  'Hasta 5 etiquetas para que otros encuentren tu pregunta.',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: colors.muted,
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _tagInput,
                        textInputAction: TextInputAction.done,
                        onSubmitted: (_) => _addTag(),
                        decoration: _decoration(
                          context,
                          label: 'Etiqueta',
                          hint: 'ej. npn',
                        ),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    TextButton(
                      onPressed: _addTag,
                      child: const Text('Agregar'),
                    ),
                  ],
                ),
                if (_tags.isNotEmpty) ...[
                  const SizedBox(height: AppSpacing.md),
                  ForumTagWrap(
                    tags: _tags.toList(),
                    onTagRemove: _removeTag,
                  ),
                ],
                const SizedBox(height: AppSpacing.md),
                Text(
                  'Temas frecuentes',
                  style: theme.textTheme.labelLarge?.copyWith(
                    color: colors.muted,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final tag in kSuggestedForumTags)
                      ForumTagPill(
                        tag: tag,
                        selected: _tags.contains(tag),
                        onTap: () => _toggleSuggestedTag(
                          tag,
                          !_tags.contains(tag),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: AppSpacing.xl),
                FilledButton(
                  onPressed: _busy ? null : _submit,
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(56),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: _busy
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Publicar'),
                ),
              ],
            ),
          ),
        ),
    );
  }
}

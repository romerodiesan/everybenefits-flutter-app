import 'package:flutter/material.dart';

import '../../../app/app_spacing.dart';
import '../../../app/pulse_haptics.dart';
import '../../../app/theme.dart';
import '../../../app/widgets/pulse_chrome.dart';
import '../../../l10n/l10n.dart';
import '../course_models.dart';
import '../course_repository.dart';
import 'markdown_body.dart';

/// Playlist glyph per lesson type, shared by the player and the course detail.
IconData lessonTypeIcon(LessonType type) => switch (type) {
      LessonType.video => Icons.play_circle_outline_rounded,
      LessonType.reading => Icons.article_outlined,
      LessonType.quiz => Icons.quiz_outlined,
    };

/// Reading lesson: Markdown body plus an explicit completion CTA.
class ReadingStage extends StatelessWidget {
  const ReadingStage({
    super.key,
    required this.lesson,
    required this.completed,
    required this.onComplete,
  });

  final Lesson lesson;
  final bool completed;
  final VoidCallback onComplete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;
    final body = lesson.bodyMarkdown?.trim() ?? '';

    if (body.isEmpty) {
      return PulseSheet(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Center(
          child: Text(
            l10n.readingEmpty,
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium?.copyWith(color: colors.muted),
          ),
        ),
      );
    }

    return PulseSheet(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          MarkdownBody(source: body),
          const SizedBox(height: AppSpacing.md),
          Divider(color: colors.border, height: 1),
          const SizedBox(height: AppSpacing.md),
          if (completed)
            Row(
              children: [
                Icon(
                  Icons.check_circle_rounded,
                  size: 18,
                  color: AppColors.brandOf(context),
                ),
                const SizedBox(width: 8),
                Text(
                  l10n.readingCompleted,
                  style: theme.textTheme.labelLarge?.copyWith(
                    color: AppColors.brandOf(context),
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            )
          else
            SignalButton(
              label: l10n.readingMarkComplete,
              onPressed: () {
                PulseHaptics.light();
                onComplete();
              },
            ),
        ],
      ),
    );
  }
}

/// Quiz lesson: the callable grades the attempt and owns lesson completion.
class QuizStage extends StatefulWidget {
  const QuizStage({
    super.key,
    required this.course,
    required this.lesson,
    required this.repository,
    this.onGraded,
  });

  final Course course;
  final Lesson lesson;
  final CourseRepository repository;

  /// Fires after a graded attempt so the player can refresh progress.
  final ValueChanged<QuizAttemptResult>? onGraded;

  @override
  State<QuizStage> createState() => _QuizStageState();
}

class _QuizStageState extends State<QuizStage> {
  final _answers = <String, List<int>>{};

  QuizAttemptResult? _result;
  bool _grading = false;
  String? _error;

  bool get _locked => _result != null;

  void _toggle(QuizQuestion question, int option) {
    setState(() {
      _result = null;
      _error = null;
      final selected = _answers[question.id] ?? const <int>[];
      if (!question.isMulti) {
        _answers[question.id] = [option];
        return;
      }
      _answers[question.id] = selected.contains(option)
          ? (List.of(selected)..remove(option))
          : (List.of(selected)..add(option)..sort());
    });
  }

  Future<void> _submit() async {
    final l10n = context.l10n;
    setState(() {
      _grading = true;
      _error = null;
    });
    try {
      final result = await widget.repository.submitQuizAttempt(
        course: widget.course,
        lesson: widget.lesson,
        answers: _answers,
      );
      if (!mounted) return;
      setState(() => _result = result);
      widget.onGraded?.call(result);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = friendlyCourseError(error, l10n));
    } finally {
      if (mounted) setState(() => _grading = false);
    }
  }

  void _retry() {
    setState(() {
      _answers.clear();
      _result = null;
      _error = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final danger = theme.colorScheme.error;
    final l10n = context.l10n;
    final questions = widget.lesson.questions;

    if (questions.isEmpty) {
      return PulseSheet(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Center(
          child: Text(
            l10n.quizEmpty,
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium?.copyWith(color: colors.muted),
          ),
        ),
      );
    }

    final result = _result;
    final unanswered = questions.any(
      (question) => (_answers[question.id] ?? const []).isEmpty,
    );

    return PulseSheet(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l10n.quizPassRequirement(widget.lesson.passPercent),
            style: theme.textTheme.labelLarge?.copyWith(color: colors.muted),
          ),
          const SizedBox(height: AppSpacing.md),
          for (var i = 0; i < questions.length; i++) ...[
            if (i > 0) const SizedBox(height: AppSpacing.lg),
            _QuestionBlock(
              question: questions[i],
              index: i,
              total: questions.length,
              selected: _answers[questions[i].id] ?? const [],
              locked: _locked,
              outcome: result?.correctByQuestion[questions[i].id],
              onToggle: (option) => _toggle(questions[i], option),
            ),
          ],
          const SizedBox(height: AppSpacing.md),
          Divider(color: colors.border, height: 1),
          const SizedBox(height: AppSpacing.md),
          if (result != null) ...[
            Row(
              children: [
                Expanded(
                  child: Text(
                    l10n.quizScore(result.score),
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: (result.passed ? brand : danger)
                        .withValues(alpha: 0.16),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    result.passed ? l10n.quizPassed : l10n.quizFailed,
                    style: theme.textTheme.labelMedium?.copyWith(
                      color: result.passed ? brand : danger,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ],
            ),
            if (!result.passed) ...[
              const SizedBox(height: AppSpacing.sm),
              SignalButton(label: l10n.quizRetry, onPressed: _retry),
            ],
          ] else
            SignalButton(
              label: _grading ? l10n.quizGrading : l10n.quizSubmit,
              onPressed: _grading || unanswered ? null : () => _submit(),
            ),
          if (_error != null) ...[
            const SizedBox(height: AppSpacing.xs),
            Text(
              _error!,
              style: theme.textTheme.bodyMedium?.copyWith(color: danger),
            ),
          ],
        ],
      ),
    );
  }
}

class _QuestionBlock extends StatelessWidget {
  const _QuestionBlock({
    required this.question,
    required this.index,
    required this.total,
    required this.selected,
    required this.locked,
    required this.outcome,
    required this.onToggle,
  });

  final QuizQuestion question;
  final int index;
  final int total;
  final List<int> selected;
  final bool locked;

  /// `null` until the attempt is graded.
  final bool? outcome;

  final ValueChanged<int> onToggle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final danger = theme.colorScheme.error;
    final l10n = context.l10n;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '${l10n.quizQuestionOf(index + 1, total)} · '
          '${question.isMulti ? l10n.quizPickMany : l10n.quizPickOne}',
          style: theme.textTheme.labelSmall?.copyWith(
            color: colors.muted,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          question.prompt,
          style: theme.textTheme.titleSmall
              ?.copyWith(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: AppSpacing.xs),
        for (var i = 0; i < question.options.length; i++)
          Padding(
            padding: EdgeInsets.only(top: i == 0 ? 0 : 6),
            child: _OptionTile(
              label: question.options[i],
              selected: selected.contains(i),
              multi: question.isMulti,
              enabled: !locked,
              onTap: () => onToggle(i),
            ),
          ),
        if (outcome != null) ...[
          const SizedBox(height: 6),
          Text(
            outcome! ? l10n.quizAnswerCorrect : l10n.quizAnswerIncorrect,
            style: theme.textTheme.labelMedium?.copyWith(
              color: outcome! ? brand : danger,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ],
    );
  }
}

class _OptionTile extends StatelessWidget {
  const _OptionTile({
    required this.label,
    required this.selected,
    required this.multi,
    required this.enabled,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final bool multi;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);

    return InkWell(
      onTap: enabled ? onTap : null,
      borderRadius: BorderRadius.circular(14),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          color: selected ? brand.withValues(alpha: 0.10) : Colors.transparent,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected ? brand.withValues(alpha: 0.6) : colors.border,
          ),
        ),
        child: Row(
          children: [
            Icon(
              multi
                  ? (selected
                      ? Icons.check_box_rounded
                      : Icons.check_box_outline_blank_rounded)
                  : (selected
                      ? Icons.radio_button_checked_rounded
                      : Icons.radio_button_unchecked_rounded),
              size: 20,
              color: selected ? brand : colors.muted,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                label,
                style: theme.textTheme.bodyLarge?.copyWith(
                  fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

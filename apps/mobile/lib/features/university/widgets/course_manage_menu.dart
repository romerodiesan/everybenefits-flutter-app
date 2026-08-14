import '../../../users/users.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../app/app_spacing.dart';
import '../../../app/layout/pulse_adaptive_sheet.dart';
import '../../../app/pulse_haptics.dart';
import '../../../app/theme.dart';
import '../../../app/widgets/pulse_chrome.dart';
import '../../../l10n/l10n.dart';
import '../../../users/user_profile.dart';
import '../course_models.dart';
import '../course_repository.dart';

enum _ManageAction {
  edit,
  submitReview,
  publish,
  unpublish,
  rejectToDraft,
  delete,
}

/// Video uploads and module ordering live in the adjacent Studio web app.
const kPulseStudioUrl = String.fromEnvironment(
  'PULSE_STUDIO_URL',
  defaultValue: 'http://localhost:3001',
);

Future<void> openPulseStudio() async {
  final uri = Uri.parse(kPulseStudioUrl);
  await launchUrl(uri, mode: LaunchMode.externalApplication);
}

void showStudioHint(BuildContext context) {
  final l10n = context.l10n;
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(l10n.studioWebOnlyHint),
      action: SnackBarAction(
        label: l10n.academyStudio,
        onPressed: () => openPulseStudio(),
      ),
    ),
  );
}

/// Quick management actions for authors (instructor/manager) and admins.
class CourseManageMenu extends StatelessWidget {
  const CourseManageMenu({
    super.key,
    required this.course,
    required this.profile,
    required this.repository,
    this.onChanged,
  });

  final Course course;
  final UserProfile profile;
  final CourseRepository repository;

  /// Called after a successful mutation (screens on live streams can skip it).
  final VoidCallback? onChanged;

  bool _isAdmin(BuildContext context) => canManageCourses(
        AccessScope.accessOf(context, fallbackRoleId: profile.roleId),
      );

  bool _canEdit(BuildContext context) => canEditCourse(
        course: course,
        uid: profile.uid,
        roleOrPermissions:
            AccessScope.accessOf(context, fallbackRoleId: profile.roleId),
      );

  List<_ManageAction> _actions(BuildContext context) {
    final actions = <_ManageAction>[];
    final canEdit = _canEdit(context);
    final isAdmin = _isAdmin(context);
    if (canEdit) actions.add(_ManageAction.edit);
    if (canEdit && course.status == CourseStatus.draft && !isAdmin) {
      actions.add(_ManageAction.submitReview);
    }
    if (isAdmin && course.status != CourseStatus.published) {
      actions.add(_ManageAction.publish);
    }
    if (isAdmin && course.status == CourseStatus.published) {
      actions.add(_ManageAction.unpublish);
    }
    if (isAdmin && course.status == CourseStatus.pending) {
      actions.add(_ManageAction.rejectToDraft);
    }
    if (isAdmin || canEdit) actions.add(_ManageAction.delete);
    return actions;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final colors = AppColors.of(context);
    final actions = _actions(context);
    if (actions.isEmpty) return const SizedBox.shrink();

    return PopupMenuButton<_ManageAction>(
      tooltip: l10n.courseManageTitle,
      icon: Icon(Icons.more_horiz_rounded, color: colors.muted),
      padding: EdgeInsets.zero,
      onSelected: (action) => _run(context, action),
      itemBuilder: (context) => [
        for (final action in actions)
          PopupMenuItem<_ManageAction>(
            value: action,
            child: Row(
              children: [
                Icon(_iconFor(action), size: 18),
                const SizedBox(width: 10),
                Text(_labelFor(action, l10n)),
              ],
            ),
          ),
      ],
    );
  }

  IconData _iconFor(_ManageAction action) => switch (action) {
        _ManageAction.edit => Icons.edit_outlined,
        _ManageAction.submitReview => Icons.send_outlined,
        _ManageAction.publish => Icons.verified_outlined,
        _ManageAction.unpublish => Icons.visibility_off_outlined,
        _ManageAction.rejectToDraft => Icons.undo_rounded,
        _ManageAction.delete => Icons.delete_outline_rounded,
      };

  String _labelFor(_ManageAction action, AppLocalizations l10n) =>
      switch (action) {
        _ManageAction.edit => l10n.actionEdit,
        _ManageAction.submitReview => l10n.courseActionSubmitReview,
        _ManageAction.publish => l10n.courseActionApprove,
        _ManageAction.unpublish => l10n.courseActionUnpublish,
        _ManageAction.rejectToDraft => l10n.courseActionRejectToDraft,
        _ManageAction.delete => l10n.actionDelete,
      };

  Future<void> _run(BuildContext context, _ManageAction action) async {
    final l10n = context.l10n;
    final messenger = ScaffoldMessenger.of(context);

    if (action == _ManageAction.edit) {
      final saved = await showCourseEditSheet(
        context,
        course: course,
        profile: profile,
        repository: repository,
      );
      if (saved == true) onChanged?.call();
      return;
    }

    if (action == _ManageAction.delete) {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: Text(l10n.actionDelete),
          content: Text(l10n.courseDeleteConfirm(course.title)),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: Text(l10n.actionCancel),
            ),
            FilledButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: Text(l10n.actionDelete),
            ),
          ],
        ),
      );
      if (confirmed != true) return;
    }

    PulseHaptics.light();
    try {
      switch (action) {
        case _ManageAction.edit:
          return;
        case _ManageAction.submitReview:
          await repository.submitForReview(actor: profile, course: course);
          messenger.showSnackBar(
            SnackBar(content: Text(l10n.courseSubmittedToast)),
          );
        case _ManageAction.publish:
          await repository.setCourseStatus(
            actor: profile,
            course: course,
            status: CourseStatus.published,
          );
          messenger.showSnackBar(
            SnackBar(content: Text(l10n.coursePublishedToast)),
          );
        case _ManageAction.unpublish:
          await repository.setCourseStatus(
            actor: profile,
            course: course,
            status: CourseStatus.draft,
          );
          messenger.showSnackBar(
            SnackBar(content: Text(l10n.courseUnpublishedToast)),
          );
        case _ManageAction.rejectToDraft:
          await repository.setCourseStatus(
            actor: profile,
            course: course,
            status: CourseStatus.draft,
          );
          messenger.showSnackBar(
            SnackBar(content: Text(l10n.courseUnpublishedToast)),
          );
        case _ManageAction.delete:
          await repository.deleteCourse(actor: profile, course: course);
          messenger.showSnackBar(
            SnackBar(content: Text(l10n.courseDeletedToast)),
          );
      }
      onChanged?.call();
    } catch (error) {
      messenger.showSnackBar(
        SnackBar(content: Text(friendlyCourseError(error, l10n))),
      );
    }
  }
}

/// Metadata editor. Content (modules, lessons, videos) lives in the web Studio.
Future<bool?> showCourseEditSheet(
  BuildContext context, {
  required Course course,
  required UserProfile profile,
  required CourseRepository repository,
}) {
  return showPulseSheet<bool>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (sheetContext) => _CourseEditSheet(
      course: course,
      profile: profile,
      repository: repository,
    ),
  );
}

class _CourseEditSheet extends StatefulWidget {
  const _CourseEditSheet({
    required this.course,
    required this.profile,
    required this.repository,
  });

  final Course course;
  final UserProfile profile;
  final CourseRepository repository;

  @override
  State<_CourseEditSheet> createState() => _CourseEditSheetState();
}

class _CourseEditSheetState extends State<_CourseEditSheet> {
  late final _title = TextEditingController(text: widget.course.title);
  late final _description =
      TextEditingController(text: widget.course.description);
  late final _teacher = TextEditingController(text: widget.course.teacherName);
  late CourseLevel _level = widget.course.level;
  bool _saving = false;

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    _teacher.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final l10n = context.l10n;
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _saving = true);
    try {
      await widget.repository.updateCourseMeta(
        actor: widget.profile,
        course: widget.course,
        title: _title.text,
        description: _description.text,
        teacherName: _teacher.text,
        level: _level,
      );
      if (!mounted) return;
      Navigator.of(context).pop(true);
      messenger.showSnackBar(SnackBar(content: Text(l10n.courseSavedToast)));
    } catch (error) {
      if (!mounted) return;
      setState(() => _saving = false);
      messenger.showSnackBar(
        SnackBar(content: Text(friendlyCourseError(error, l10n))),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;
    final keyboard = MediaQuery.viewInsetsOf(context).bottom;

    return Padding(
      padding: EdgeInsets.only(bottom: keyboard),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: colors.canvas,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          border: Border.all(color: colors.border),
        ),
        child: SafeArea(
          top: false,
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.sizeOf(context).height * 0.88 - keyboard,
            ),
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    l10n.courseEditTitle,
                    style: theme.textTheme.titleLarge,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  TextField(
                    controller: _title,
                    textCapitalization: TextCapitalization.sentences,
                    decoration:
                        InputDecoration(labelText: l10n.courseFieldTitle),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  TextField(
                    controller: _description,
                    maxLines: 4,
                    minLines: 2,
                    textCapitalization: TextCapitalization.sentences,
                    decoration: InputDecoration(
                      labelText: l10n.courseFieldDescription,
                      alignLabelWithHint: true,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  TextField(
                    controller: _teacher,
                    textCapitalization: TextCapitalization.words,
                    decoration:
                        InputDecoration(labelText: l10n.courseFieldTeacher),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    l10n.courseFieldLevel,
                    style: theme.textTheme.labelLarge?.copyWith(
                      color: colors.muted,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: [
                      for (final level in CourseLevel.values)
                        ChoiceChip(
                          label: Text(level.label(l10n)),
                          selected: _level == level,
                          onSelected: (_) => setState(() => _level = level),
                        ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    l10n.studioWebOnlyHint,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colors.muted,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  SignalButton(
                    label: l10n.actionSave,
                    onPressed: _saving ? null : _save,
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

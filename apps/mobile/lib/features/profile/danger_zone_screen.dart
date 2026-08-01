import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../app/app_feedback.dart';
import '../../app/app_spacing.dart';
import '../../app/pulse_haptics.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../auth/auth.dart';
import '../../l10n/l10n.dart';
import '../../users/users.dart';

enum _DangerMode { none, deactivate, delete }

class DangerZoneScreen extends StatefulWidget {
  const DangerZoneScreen({
    super.key,
    required this.authService,
    this.lifecycle,
  });

  final AuthService authService;
  final AccountLifecycleCallable? lifecycle;

  @override
  State<DangerZoneScreen> createState() => _DangerZoneScreenState();
}

class _DangerZoneScreenState extends State<DangerZoneScreen> {
  late final AccountLifecycleCallable _lifecycle =
      widget.lifecycle ?? AccountLifecycleCallable();
  _DangerMode _mode = _DangerMode.none;
  final _password = TextEditingController();
  bool _busy = false;
  String? _graceLabel;

  bool get _needsPassword => widget.authService.hasPasswordProvider();

  @override
  void dispose() {
    _password.dispose();
    super.dispose();
  }

  Future<void> _deactivate() async {
    setState(() => _busy = true);
    try {
      await _lifecycle.deactivateAccount();
      await widget.authService.signOut();
    } catch (error, stack) {
      if (!mounted) return;
      showAppError(context, error, stackTrace: stack);
      setState(() => _busy = false);
    }
  }

  Future<void> _delete() async {
    final l10n = context.l10n;
    setState(() => _busy = true);
    try {
      await widget.authService.reauthenticate(
        password: _needsPassword ? _password.text : null,
      );
    } catch (error, stack) {
      if (!mounted) return;
      showAppError(
        context,
        error,
        stackTrace: stack,
        fallbackMessage: l10n.dangerReauthFailed,
      );
      setState(() => _busy = false);
      return;
    }
    try {
      await _lifecycle.requestAccountDeletion();
      await widget.authService.signOut();
    } catch (error, stack) {
      if (!mounted) return;
      showAppError(context, error, stackTrace: stack);
      setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;
    final errorColor = theme.colorScheme.error;

    return PulseScaffold(
      appBar: AppBar(
        title: Text(
          l10n.dangerTitle,
          style: theme.textTheme.headlineMedium?.copyWith(fontSize: 22),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.lg,
          AppSpacing.sm,
          AppSpacing.lg,
          AppSpacing.xl,
        ),
        children: [
          Text(
            l10n.dangerSubtitle,
            style: theme.textTheme.bodyMedium?.copyWith(color: colors.muted),
          ),
          const SizedBox(height: AppSpacing.lg),
          _DangerCard(
            title: l10n.dangerDeactivate,
            body: l10n.dangerDeactivateHint,
            child: _mode == _DangerMode.deactivate
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        l10n.dangerDeactivateConfirmHint,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colors.muted,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      FilledButton(
                        onPressed: _busy
                            ? null
                            : () {
                                PulseHaptics.medium();
                                _deactivate();
                              },
                        style: FilledButton.styleFrom(
                          backgroundColor: errorColor,
                        ),
                        child: Text(l10n.dangerDeactivateConfirm),
                      ),
                      TextButton(
                        onPressed: _busy
                            ? null
                            : () => setState(() => _mode = _DangerMode.none),
                        child: Text(l10n.actionCancel),
                      ),
                    ],
                  )
                : OutlinedButton(
                    onPressed: () {
                      PulseHaptics.selection();
                      setState(() => _mode = _DangerMode.deactivate);
                    },
                    child: Text(l10n.dangerDeactivate),
                  ),
          ),
          const SizedBox(height: AppSpacing.md),
          _DangerCard(
            title: l10n.dangerDelete,
            body: l10n.dangerDeleteHint,
            danger: true,
            child: _mode == _DangerMode.delete
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        l10n.dangerDeleteConfirmHint(_graceLabel ?? ''),
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: errorColor,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        l10n.dangerDeleteAnonymizeHint,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colors.muted,
                        ),
                      ),
                      if (_needsPassword) ...[
                        const SizedBox(height: AppSpacing.md),
                        TextField(
                          controller: _password,
                          obscureText: true,
                          onChanged: (_) => setState(() {}),
                          decoration: InputDecoration(
                            labelText: l10n.dangerCurrentPassword,
                          ),
                        ),
                      ],
                      const SizedBox(height: AppSpacing.md),
                      FilledButton(
                        onPressed: _busy ||
                                (_needsPassword && _password.text.isEmpty)
                            ? null
                            : () {
                                PulseHaptics.medium();
                                _delete();
                              },
                        style: FilledButton.styleFrom(
                          backgroundColor: errorColor,
                        ),
                        child: Text(l10n.dangerDeleteConfirm),
                      ),
                      TextButton(
                        onPressed: _busy
                            ? null
                            : () => setState(() {
                                  _mode = _DangerMode.none;
                                  _password.clear();
                                }),
                        child: Text(l10n.actionCancel),
                      ),
                    ],
                  )
                : FilledButton(
                    onPressed: () {
                      PulseHaptics.selection();
                      final locale = Localizations.localeOf(context);
                      final grace = DateTime.now()
                          .add(const Duration(days: 90));
                      setState(() {
                        _mode = _DangerMode.delete;
                        _graceLabel = DateFormat.yMMMMd(locale.toString())
                            .format(grace);
                      });
                    },
                    style: FilledButton.styleFrom(
                      backgroundColor: errorColor,
                    ),
                    child: Text(l10n.dangerDelete),
                  ),
          ),
        ],
      ),
    );
  }
}

class _DangerCard extends StatelessWidget {
  const _DangerCard({
    required this.title,
    required this.body,
    required this.child,
    this.danger = false,
  });

  final String title;
  final String body;
  final Widget child;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final borderColor = danger
        ? theme.colorScheme.error.withValues(alpha: 0.35)
        : colors.border;

    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: borderColor),
        color: colors.glassFill,
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              title,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w800,
                color: danger ? theme.colorScheme.error : null,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              body,
              style: theme.textTheme.bodySmall?.copyWith(
                color: colors.muted,
                height: 1.4,
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            child,
          ],
        ),
      ),
    );
  }
}

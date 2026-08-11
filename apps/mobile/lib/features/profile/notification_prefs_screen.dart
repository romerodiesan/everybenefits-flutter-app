import 'dart:async';

import 'package:flutter/material.dart';

import '../../app/app_feedback.dart';
import '../../app/app_spacing.dart';
import '../../app/pulse_haptics.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../l10n/l10n.dart';
import '../notifications/notification_models.dart';
import '../notifications/notification_repository.dart';

class NotificationPrefsScreen extends StatefulWidget {
  const NotificationPrefsScreen({
    super.key,
    required this.uid,
    this.repository,
  });

  final String uid;
  final NotificationRepository? repository;

  @override
  State<NotificationPrefsScreen> createState() =>
      _NotificationPrefsScreenState();
}

class _NotificationPrefsScreenState extends State<NotificationPrefsScreen> {
  late final NotificationRepository _repo =
      widget.repository ?? NotificationRepository();
  StreamSubscription<NotificationState>? _sub;
  NotificationPrefs _prefs = const NotificationPrefs();
  bool _pushReady = false;
  bool _pushBusy = false;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _sub = _repo.watchState(widget.uid).listen((state) {
      if (!mounted) return;
      setState(() {
        _prefs = state.prefs;
        _loaded = true;
      });
    });
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  Future<void> _toggle(
    NotificationPrefs Function(NotificationPrefs) update,
  ) async {
    final next = update(_prefs);
    setState(() => _prefs = next);
    PulseHaptics.selection();
    try {
      await _repo.savePrefs(widget.uid, next);
    } catch (error, stack) {
      if (!mounted) return;
      showAppError(context, error, stackTrace: stack);
    }
  }

  Future<void> _enablePush() async {
    setState(() => _pushBusy = true);
    try {
      final token = await _repo.registerPushToken(widget.uid);
      if (!mounted) return;
      setState(() => _pushReady = token != null && token.isNotEmpty);
      if (!_pushReady) {
        showAppError(context, context.l10n.notificationsPushUnavailable);
      } else {
        showAppSuccess(context, context.l10n.notificationsPushEnabled);
      }
    } catch (error, stack) {
      if (!mounted) return;
      showAppError(context, error, stackTrace: stack);
    } finally {
      if (mounted) setState(() => _pushBusy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;

    return PulseScaffold(
      appBar: AppBar(
        title: Text(
          l10n.notificationsPrefsTitle,
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
            l10n.notificationsPrefsHint,
            style: theme.textTheme.bodyMedium?.copyWith(color: colors.muted),
          ),
          const SizedBox(height: AppSpacing.lg),
          if (_pushReady)
            DecoratedBox(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                color: colors.glassFill,
                border: Border.all(color: colors.border),
              ),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Text(
                  l10n.notificationsPushEnabled,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            )
          else
            OutlinedButton(
              onPressed: _pushBusy ? null : _enablePush,
              child: Text(l10n.notificationsEnablePush),
            ),
          const SizedBox(height: AppSpacing.lg),
          if (!_loaded)
            const Center(child: CircularProgressIndicator())
          else ...[
            _PrefTile(
              label: l10n.notificationsPrefChats,
              value: _prefs.pushChats,
              onChanged: (v) => _toggle(
                (p) => p.copyWith(pushChats: v),
              ),
            ),
            _PrefTile(
              label: l10n.notificationsPrefForums,
              value: _prefs.pushForums,
              onChanged: (v) => _toggle(
                (p) => p.copyWith(pushForums: v),
              ),
            ),
            _PrefTile(
              label: l10n.notificationsPrefAcademy,
              value: _prefs.pushAcademy,
              onChanged: (v) => _toggle(
                (p) => p.copyWith(pushAcademy: v),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _PrefTile extends StatelessWidget {
  const _PrefTile({
    required this.label,
    required this.value,
    required this.onChanged,
  });

  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Material(
        color: colors.glassFill,
        borderRadius: BorderRadius.circular(18),
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: colors.border),
          ),
          child: SwitchListTile.adaptive(
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 14,
              vertical: 4,
            ),
            title: Text(
              label,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            value: value,
            onChanged: onChanged,
          ),
        ),
      ),
    );
  }
}

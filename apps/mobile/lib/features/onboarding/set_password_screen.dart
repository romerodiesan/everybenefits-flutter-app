import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../auth/auth.dart';
import '../../l10n/l10n.dart';
import 'widgets/auth_form_widgets.dart';

/// Blocking screen: link a backup password for Google-only (etc.) accounts.
class SetPasswordScreen extends StatefulWidget {
  const SetPasswordScreen({
    super.key,
    required this.authService,
    this.onLinked,
  });

  final AuthService authService;
  final VoidCallback? onLinked;

  @override
  State<SetPasswordScreen> createState() => _SetPasswordScreenState();
}

class _SetPasswordScreenState extends State<SetPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate() || _busy) return;
    setState(() => _busy = true);
    try {
      await widget.authService.linkPassword(_password.text);
      await widget.authService.currentUser?.reload();
      if (!mounted) return;
      widget.onLinked?.call();
    } catch (error, stack) {
      if (!mounted) return;
      showAuthError(context, error, stackTrace: stack);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = context.l10n;
    return PulseScaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.lg,
            AppSpacing.xl,
            AppSpacing.lg,
            AppSpacing.xl,
          ),
          children: [
            Text(l10n.setPasswordTitle, style: theme.textTheme.headlineMedium),
            const SizedBox(height: AppSpacing.sm),
            Text(l10n.setPasswordSubtitle, style: theme.textTheme.bodyMedium),
            const SizedBox(height: AppSpacing.xl),
            Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextFormField(
                    controller: _password,
                    obscureText: true,
                    autofillHints: const [AutofillHints.newPassword],
                    decoration: InputDecoration(labelText: l10n.fieldPassword),
                    validator: (value) {
                      if (value == null || value.length < 6) {
                        return l10n.authErrWeakPassword;
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: AppSpacing.md),
                  TextFormField(
                    controller: _confirm,
                    obscureText: true,
                    autofillHints: const [AutofillHints.newPassword],
                    decoration:
                        InputDecoration(labelText: l10n.fieldConfirmPassword),
                    validator: (value) {
                      if (value != _password.text) {
                        return l10n.setPasswordMismatch;
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  FilledButton(
                    onPressed: _busy ? null : _save,
                    child: _busy
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text(l10n.setPasswordSave),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  TextButton(
                    onPressed:
                        _busy ? null : () => widget.authService.signOut(),
                    child: Text(l10n.profileCompleteSignOut),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

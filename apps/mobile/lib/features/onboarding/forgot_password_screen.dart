import 'package:flutter/material.dart';

import '../../../app/app_spacing.dart';
import '../../../auth/auth.dart';
import '../../../l10n/l10n.dart';
import 'widgets/auth_form_widgets.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({
    super.key,
    required this.authService,
    this.initialEmail = '',
  });

  final AuthService authService;
  final String initialEmail;

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _email =
      TextEditingController(text: widget.initialEmail);
  bool _busy = false;
  bool _sent = false;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      await widget.authService.sendPasswordResetEmail(_email.text);
      if (!mounted) return;
      setState(() => _sent = true);
      showAppSuccess(
        context,
        context.l10n.forgotLinkSent(_email.text.trim()),
      );
    } catch (error, stackTrace) {
      if (!mounted) return;
      showAuthError(context, error, stackTrace: stackTrace);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return AuthFlowScaffold(
      title: l10n.forgotTitle,
      subtitle: _sent ? l10n.forgotSubtitleSent : l10n.forgotSubtitle,
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextFormField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.done,
              autofillHints: const [AutofillHints.email],
              decoration: InputDecoration(labelText: l10n.fieldEmail),
              validator: (value) {
                if (value == null || !value.contains('@')) {
                  return l10n.validationEmail;
                }
                return null;
              },
              onFieldSubmitted: (_) => _send(),
            ),
            const SizedBox(height: AppSpacing.lg),
            FilledButton(
              onPressed: _busy ? null : _send,
              child: _busy
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text(_sent ? l10n.forgotResendLink : l10n.forgotSendLink),
            ),
          ],
        ),
      ),
    );
  }
}

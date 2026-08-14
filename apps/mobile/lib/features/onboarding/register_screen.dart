import 'package:flutter/material.dart';

import '../../../app/app_spacing.dart';
import '../../../auth/auth.dart';
import '../../../l10n/l10n.dart';
import '../../../users/profile_validation.dart';
import 'login_screen.dart';
import 'mfa_challenge_screen.dart';
import 'phone_auth_screen.dart';
import 'widgets/auth_form_widgets.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key, required this.authService});

  final AuthService authService;

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _givenName = TextEditingController();
  final _familyName = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _givenName.dispose();
    _familyName.dispose();
    _email.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _run(Future<void> Function() action) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await action();
    } catch (error, stackTrace) {
      if (!mounted) return;
      final handled = await presentMfaIfNeeded(
        context,
        authService: widget.authService,
        error: error,
      );
      if (!handled && mounted) {
        showAuthError(context, error, stackTrace: stackTrace);
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _register() async {
    if (!_formKey.currentState!.validate()) return;
    final displayName = composeDisplayName(_givenName.text, _familyName.text);
    await _run(() async {
      await widget.authService.signUpWithEmail(
        email: _email.text,
        password: _password.text,
        displayName: displayName,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return AuthFlowScaffold(
      title: l10n.registerTitle,
      subtitle: l10n.registerSubtitle,
      child: AutofillGroup(
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextFormField(
                controller: _givenName,
                textCapitalization: TextCapitalization.words,
                textInputAction: TextInputAction.next,
                autofillHints: const [AutofillHints.givenName],
                decoration: InputDecoration(labelText: l10n.fieldGivenName),
                validator: (value) {
                  final result = validateGivenName(value ?? '');
                  if (result.ok) return null;
                  if (result.issue == DisplayNameIssue.emailAsName) {
                    return l10n.validationNameEmail;
                  }
                  if (result.issue == DisplayNameIssue.tooShort) {
                    return l10n.validationNameShort;
                  }
                  return l10n.validationName;
                },
              ),
              const SizedBox(height: AppSpacing.md),
              TextFormField(
                controller: _familyName,
                textCapitalization: TextCapitalization.words,
                textInputAction: TextInputAction.next,
                autofillHints: const [AutofillHints.familyName],
                decoration: InputDecoration(labelText: l10n.fieldFamilyName),
                validator: (value) {
                  final result = validateFamilyName(value ?? '');
                  if (result.ok) return null;
                  if (result.issue == DisplayNameIssue.tooShort) {
                    return l10n.validationNameShort;
                  }
                  return l10n.validationNameLast;
                },
              ),
              const SizedBox(height: AppSpacing.md),
              TextFormField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                autofillHints: const [AutofillHints.email],
                decoration: InputDecoration(labelText: l10n.fieldEmail),
                validator: (value) {
                  if (value == null || !value.contains('@')) {
                    return l10n.validationEmail;
                  }
                  return null;
                },
              ),
              const SizedBox(height: AppSpacing.md),
              AuthPasswordField(
                controller: _password,
                textInputAction: TextInputAction.next,
              ),
              const SizedBox(height: AppSpacing.md),
              AuthPasswordField(
                controller: _confirm,
                label: l10n.fieldConfirmPassword,
                validator: (value) {
                  if (value != _password.text) {
                    return l10n.validationPasswordsMismatch;
                  }
                  if (value == null || value.length < 6) {
                    return l10n.validationPasswordMin;
                  }
                  return null;
                },
                onFieldSubmitted: (_) => _register(),
              ),
              const SizedBox(height: AppSpacing.lg),
              FilledButton(
                onPressed: _busy ? null : _register,
                child: _busy
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(l10n.registerSubmit),
              ),
              const SizedBox(height: AppSpacing.lg),
              const AuthDivider(),
              const SizedBox(height: AppSpacing.md),
              GoogleAuthButton(
                busy: _busy,
                onPressed: () => _run(() async {
                  await widget.authService.signInWithGoogle();
                }),
              ),
              const SizedBox(height: AppSpacing.sm),
              PhoneAuthButton(
                onPressed: _busy
                    ? null
                    : () {
                        Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) => PhoneAuthScreen(
                              authService: widget.authService,
                            ),
                          ),
                        );
                      },
              ),
              const SizedBox(height: AppSpacing.lg),
              TextButton(
                onPressed: _busy
                    ? null
                    : () {
                        Navigator.of(context).pushReplacement(
                          MaterialPageRoute<void>(
                            builder: (_) => LoginScreen(
                              authService: widget.authService,
                            ),
                          ),
                        );
                      },
                child: Text(l10n.registerHaveAccount),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

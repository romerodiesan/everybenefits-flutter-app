import 'package:flutter/material.dart';

import '../../../app/app_spacing.dart';
import '../../../auth/auth.dart';
import '../../../l10n/l10n.dart';
import 'forgot_password_screen.dart';
import 'phone_auth_screen.dart';
import 'register_screen.dart';
import 'widgets/auth_form_widgets.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.authService});

  final AuthService authService;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  bool _magicLinkSent = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _run(Future<void> Function() action) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await action();
    } catch (error, stackTrace) {
      if (!mounted) return;
      showAuthError(context, error, stackTrace: stackTrace);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _signIn() async {
    if (!_formKey.currentState!.validate()) return;
    await _run(() async {
      await widget.authService.signInWithEmail(
        email: _email.text,
        password: _password.text,
      );
    });
  }

  Future<void> _sendMagicLink() async {
    final l10n = context.l10n;
    final email = _email.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      showAuthError(
        context,
        AuthException(
          code: 'invalid-email',
          message: l10n.loginMagicLinkInvalid,
        ),
      );
      return;
    }
    await _run(() async {
      await widget.authService.sendSignInLinkToEmail(
        email: email,
        actionCodeSettings: everyInsuranceEmailLinkSettings(),
      );
      if (!mounted) return;
      setState(() => _magicLinkSent = true);
      showAppSuccess(context, l10n.loginMagicLinkSent(email));
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return AuthFlowScaffold(
      title: l10n.loginTitle,
      subtitle: l10n.loginSubtitle,
      child: AutofillGroup(
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
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
                onFieldSubmitted: (_) => _signIn(),
              ),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: _busy
                      ? null
                      : () {
                          Navigator.of(context).push(
                            MaterialPageRoute<void>(
                              builder: (_) => ForgotPasswordScreen(
                                authService: widget.authService,
                                initialEmail: _email.text.trim(),
                              ),
                            ),
                          );
                        },
                  child: Text(l10n.loginForgotPassword),
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              FilledButton(
                onPressed: _busy ? null : _signIn,
                child: _busy
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(l10n.loginSubmit),
              ),
              const SizedBox(height: AppSpacing.sm),
              TextButton(
                onPressed: _busy ? null : _sendMagicLink,
                child: Text(
                  _magicLinkSent
                      ? l10n.loginMagicLinkResend
                      : l10n.loginMagicLink,
                ),
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
                            builder: (_) => RegisterScreen(
                              authService: widget.authService,
                            ),
                          ),
                        );
                      },
                child: Text(l10n.loginNoAccount),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

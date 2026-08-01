import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../app/app_spacing.dart';
import '../../../auth/auth.dart';
import '../../../l10n/l10n.dart';
import 'widgets/auth_form_widgets.dart';

class PhoneAuthScreen extends StatefulWidget {
  const PhoneAuthScreen({super.key, required this.authService});

  final AuthService authService;

  @override
  State<PhoneAuthScreen> createState() => _PhoneAuthScreenState();
}

class _PhoneAuthScreenState extends State<PhoneAuthScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phone = TextEditingController(text: '+');
  final _code = TextEditingController();

  bool _busy = false;
  bool _codeSent = false;
  String? _verificationId;
  int? _resendToken;

  @override
  void dispose() {
    _phone.dispose();
    _code.dispose();
    super.dispose();
  }

  Future<void> _sendCode() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _busy = true);

    try {
      await widget.authService.verifyPhoneNumber(
        phoneNumber: _phone.text,
        forceResendingToken: _resendToken,
        onVerificationCompleted: (credential) async {
          try {
            await widget.authService.signInWithPhoneCredential(credential);
          } catch (error, stackTrace) {
            if (!mounted) return;
            showAuthError(context, error, stackTrace: stackTrace);
          }
        },
        onVerificationFailed: (error) {
          if (!mounted) return;
          showAuthError(context, AuthException.fromFirebase(error));
          setState(() => _busy = false);
        },
        onCodeSent: (verificationId, resendToken) {
          if (!mounted) return;
          setState(() {
            _verificationId = verificationId;
            _resendToken = resendToken;
            _codeSent = true;
            _busy = false;
          });
          showAppSuccess(context, context.l10n.phoneSmsSent);
        },
        onCodeAutoRetrievalTimeout: (verificationId) {
          _verificationId = verificationId;
        },
      );
    } catch (error, stackTrace) {
      if (!mounted) return;
      showAuthError(context, error, stackTrace: stackTrace);
      setState(() => _busy = false);
    }
  }

  Future<void> _verifyCode() async {
    final id = _verificationId;
    if (id == null) return;
    if (_code.text.trim().length < 6) {
      showAuthError(
        context,
        AuthException(
          code: 'invalid-verification-code',
          message: context.l10n.validationSmsCode,
        ),
      );
      return;
    }

    setState(() => _busy = true);
    try {
      await widget.authService.signInWithSmsCode(
        verificationId: id,
        smsCode: _code.text,
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
      title: _codeSent ? l10n.phoneCodeTitle : l10n.phoneTitle,
      subtitle: _codeSent
          ? l10n.phoneSubtitleCode(_phone.text.trim())
          : l10n.validationPhoneCountry,
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (!_codeSent) ...[
              TextFormField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                textInputAction: TextInputAction.done,
                autofillHints: const [AutofillHints.telephoneNumber],
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'[0-9+]')),
                ],
                decoration: InputDecoration(
                  labelText: l10n.fieldPhoneNumber,
                  hintText: '+506…',
                ),
                validator: (value) {
                  final phone = value?.trim() ?? '';
                  if (!phone.startsWith('+') || phone.length < 10) {
                    return l10n.validationPhoneCountry;
                  }
                  return null;
                },
                onFieldSubmitted: (_) => _sendCode(),
              ),
              const SizedBox(height: AppSpacing.lg),
              FilledButton(
                onPressed: _busy ? null : _sendCode,
                child: _busy
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(l10n.phoneSendCode),
              ),
            ] else ...[
              TextFormField(
                controller: _code,
                keyboardType: TextInputType.number,
                textInputAction: TextInputAction.done,
                maxLength: 6,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                decoration: InputDecoration(
                  labelText: l10n.fieldVerificationCode,
                  counterText: '',
                ),
                onFieldSubmitted: (_) => _verifyCode(),
              ),
              const SizedBox(height: AppSpacing.lg),
              FilledButton(
                onPressed: _busy ? null : _verifyCode,
                child: _busy
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(l10n.phoneVerifyEnter),
              ),
              const SizedBox(height: AppSpacing.sm),
              TextButton(
                onPressed: _busy
                    ? null
                    : () {
                        setState(() {
                          _codeSent = false;
                          _code.clear();
                        });
                      },
                child: Text(l10n.phoneChangeNumber),
              ),
              TextButton(
                onPressed: _busy ? null : _sendCode,
                child: Text(l10n.phoneResendCode),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

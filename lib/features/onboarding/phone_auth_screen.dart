import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../app/app_spacing.dart';
import '../../../auth/auth.dart';
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
          } on AuthException catch (error) {
            if (!mounted) return;
            showAuthError(context, error);
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
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Código SMS enviado')),
          );
        },
        onCodeAutoRetrievalTimeout: (verificationId) {
          _verificationId = verificationId;
        },
      );
    } on AuthException catch (error) {
      if (!mounted) return;
      showAuthError(context, error);
      setState(() => _busy = false);
    }
  }

  Future<void> _verifyCode() async {
    final id = _verificationId;
    if (id == null) return;
    if (_code.text.trim().length < 6) {
      showAuthError(
        context,
        const AuthException(
          code: 'invalid-verification-code',
          message: 'Ingresa el código de 6 dígitos.',
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
    } on AuthException catch (error) {
      if (!mounted) return;
      showAuthError(context, error);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthFlowScaffold(
      title: _codeSent ? 'Código SMS' : 'Teléfono',
      subtitle: _codeSent
          ? 'Escribe el código que enviamos a ${_phone.text.trim()}.'
          : 'Usa formato internacional, por ejemplo +50688887777.',
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
                decoration: const InputDecoration(
                  labelText: 'Número de teléfono',
                  hintText: '+506…',
                ),
                validator: (value) {
                  final phone = value?.trim() ?? '';
                  if (!phone.startsWith('+') || phone.length < 10) {
                    return 'Incluye el código de país (+…)';
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
                    : const Text('Enviar código'),
              ),
            ] else ...[
              TextFormField(
                controller: _code,
                keyboardType: TextInputType.number,
                textInputAction: TextInputAction.done,
                maxLength: 6,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                decoration: const InputDecoration(
                  labelText: 'Código de verificación',
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
                    : const Text('Verificar y entrar'),
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
                child: const Text('Cambiar número'),
              ),
              TextButton(
                onPressed: _busy ? null : _sendCode,
                child: const Text('Reenviar código'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

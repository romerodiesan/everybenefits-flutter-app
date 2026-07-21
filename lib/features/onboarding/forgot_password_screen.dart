import 'package:flutter/material.dart';

import '../../../app/app_spacing.dart';
import '../../../auth/auth.dart';
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
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Enviamos un enlace a ${_email.text.trim()}'),
        ),
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
      title: 'Recuperar acceso',
      subtitle: _sent
          ? 'Revisa tu correo y sigue el enlace para crear una nueva contraseña.'
          : 'Te enviaremos un enlace para restablecer tu contraseña.',
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
              decoration: const InputDecoration(labelText: 'Correo'),
              validator: (value) {
                if (value == null || !value.contains('@')) {
                  return 'Ingresa un correo válido.';
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
                  : Text(_sent ? 'Reenviar enlace' : 'Enviar enlace'),
            ),
          ],
        ),
      ),
    );
  }
}

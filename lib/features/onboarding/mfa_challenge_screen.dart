import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../auth/auth.dart';
import '../../l10n/l10n.dart';
import 'widgets/auth_form_widgets.dart';

/// Completes sign-in when Firebase requires a second factor (SMS or TOTP).
class MfaChallengeScreen extends StatefulWidget {
  const MfaChallengeScreen({
    super.key,
    required this.authService,
    required this.resolver,
  });

  final AuthService authService;
  final MultiFactorResolver resolver;

  @override
  State<MfaChallengeScreen> createState() => _MfaChallengeScreenState();
}

class _MfaChallengeScreenState extends State<MfaChallengeScreen> {
  MultiFactorInfo? _selected;
  final _code = TextEditingController();
  String? _verificationId;
  bool _busy = false;
  bool _smsSent = false;

  @override
  void initState() {
    super.initState();
    final hints = widget.resolver.hints;
    if (hints.length == 1) {
      _selected = hints.first;
    }
  }

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  bool get _isTotp => _selected?.factorId == 'totp';

  bool get _isSms =>
      _selected is PhoneMultiFactorInfo || _selected?.factorId == 'phone';

  Future<void> _sendSms() async {
    final hint = _selected;
    if (hint is! PhoneMultiFactorInfo || _busy) return;
    setState(() => _busy = true);
    try {
      await widget.authService.verifyPhoneNumber(
        multiFactorSession: widget.resolver.session,
        multiFactorInfo: hint,
        onVerificationCompleted: (_) {},
        onVerificationFailed: (error) {
          if (!mounted) return;
          showAuthError(context, AuthException.fromFirebase(error));
          setState(() => _busy = false);
        },
        onCodeSent: (verificationId, _) {
          if (!mounted) return;
          setState(() {
            _verificationId = verificationId;
            _smsSent = true;
            _busy = false;
          });
          showAppSuccess(context, context.l10n.phoneSmsSent);
        },
        onCodeAutoRetrievalTimeout: (_) {},
      );
    } catch (error, stack) {
      if (!mounted) return;
      showAuthError(context, error, stackTrace: stack);
      setState(() => _busy = false);
    }
  }

  Future<void> _verify() async {
    final selected = _selected;
    if (selected == null || _busy) return;
    final code = _code.text.trim();
    if (code.length < 6) {
      showAuthError(
        context,
        AuthException(code: 'invalid-verification-code'),
      );
      return;
    }
    setState(() => _busy = true);
    try {
      if (_isTotp) {
        await widget.authService.resolveMfaWithTotp(
          resolver: widget.resolver,
          enrollmentId: selected.uid,
          oneTimePassword: code,
        );
      } else {
        final vid = _verificationId;
        if (vid == null) {
          throw const AuthException(code: 'session-expired');
        }
        final cred = PhoneAuthProvider.credential(
          verificationId: vid,
          smsCode: code,
        );
        await widget.authService.resolveMfaWithSms(
          resolver: widget.resolver,
          credential: cred,
        );
      }
      if (!mounted) return;
      Navigator.of(context).popUntil((route) => route.isFirst);
    } catch (error, stack) {
      if (!mounted) return;
      showAuthError(context, error, stackTrace: stack);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final hints = widget.resolver.hints;

    return AuthFlowScaffold(
      title: l10n.mfaTitle,
      subtitle: l10n.mfaSubtitle,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_selected == null) ...[
            Text(l10n.mfaChooseFactor),
            const SizedBox(height: AppSpacing.md),
            for (final hint in hints)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: OutlinedButton(
                  onPressed: () => setState(() => _selected = hint),
                  child: Text(
                    hint.factorId == 'totp'
                        ? (hint.displayName ?? l10n.mfaTotpLabel)
                        : (hint.displayName ??
                            (hint is PhoneMultiFactorInfo
                                ? hint.phoneNumber
                                : l10n.mfaSmsLabel)),
                  ),
                ),
              ),
          ] else ...[
            if (hints.length > 1)
              TextButton(
                onPressed: _busy
                    ? null
                    : () => setState(() {
                          _selected = null;
                          _smsSent = false;
                          _verificationId = null;
                          _code.clear();
                        }),
                child: Text(l10n.mfaChooseFactor),
              ),
            if (_isSms && !_smsSent) ...[
              FilledButton(
                onPressed: _busy ? null : _sendSms,
                child: Text(l10n.mfaSendSms),
              ),
            ],
            if (_isTotp || _smsSent) ...[
              const SizedBox(height: AppSpacing.md),
              TextFormField(
                controller: _code,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(labelText: l10n.mfaCodeLabel),
              ),
              const SizedBox(height: AppSpacing.lg),
              FilledButton(
                onPressed: _busy ? null : _verify,
                child: Text(l10n.mfaVerify),
              ),
            ],
          ],
        ],
      ),
    );
  }
}

/// Opens [MfaChallengeScreen] when [error] is a multi-factor challenge.
/// Returns true if the MFA UI was shown.
Future<bool> presentMfaIfNeeded(
  BuildContext context, {
  required AuthService authService,
  required Object error,
}) async {
  if (error is! FirebaseAuthMultiFactorException) return false;
  await Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => MfaChallengeScreen(
        authService: authService,
        resolver: error.resolver,
      ),
    ),
  );
  return true;
}

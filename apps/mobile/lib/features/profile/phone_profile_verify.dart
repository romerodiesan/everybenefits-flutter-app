import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../app/app_feedback.dart';
import '../../app/app_spacing.dart';
import '../../app/layout/pulse_adaptive_sheet.dart';
import '../../app/theme.dart';
import '../../auth/auth.dart';
import '../../firebase/firebase_emulators.dart';
import '../../l10n/l10n.dart';

/// Returns true if [code] + [number] differ from the stored profile phone.
bool phoneChangedFromProfile({
  required String? previousCode,
  required String? previousNumber,
  required String nextCode,
  required String nextNumber,
}) {
  final prev =
      '${previousCode?.trim() ?? ''}${previousNumber?.trim() ?? ''}';
  final next = '${nextCode.trim()}${nextNumber.trim()}';
  if (next.isEmpty) return prev.isNotEmpty;
  return prev != next;
}

String e164Phone(String countryCode, String nationalNumber) {
  final code = countryCode.trim();
  final digits = nationalNumber.trim().replaceAll(RegExp(r'[^\d]'), '');
  final dial = code.startsWith('+') ? code : '+$code';
  return '$dial$digits';
}

/// Sends SMS (not MFA enroll), confirms code, links phone on Auth user.
/// Returns true when verified; false if cancelled.
Future<bool> verifyProfilePhone({
  required BuildContext context,
  required AuthService authService,
  required String e164,
}) async {
  final result = await showPulseSheet<bool>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.of(context).meshDeep,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (ctx) => _PhoneVerifySheet(
      authService: authService,
      e164: e164,
    ),
  );
  return result == true;
}

class _PhoneVerifySheet extends StatefulWidget {
  const _PhoneVerifySheet({
    required this.authService,
    required this.e164,
  });

  final AuthService authService;
  final String e164;

  @override
  State<_PhoneVerifySheet> createState() => _PhoneVerifySheetState();
}

class _PhoneVerifySheetState extends State<_PhoneVerifySheet> {
  final _code = TextEditingController();
  String? _verificationId;
  bool _busy = false;
  bool _sent = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _sendCode());
  }

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _sendCode() async {
    setState(() => _busy = true);
    try {
      // Auth emulator: auto-complete with test code 123456 (no real SMS).
      if (useFirebaseEmulators) {
        await Future<void>.delayed(const Duration(milliseconds: 200));
        if (!mounted) return;
        setState(() {
          _verificationId = 'emulator-verification-id';
          _sent = true;
          _busy = false;
          _code.text = '123456';
        });
        showAppSuccess(context, context.l10n.phoneSmsSent);
        return;
      }
      await widget.authService.verifyPhoneNumber(
        phoneNumber: widget.e164,
        onVerificationCompleted: (credential) async {
          try {
            await widget.authService.updatePhoneNumber(credential);
            if (!mounted) return;
            Navigator.of(context).pop(true);
          } catch (error, stack) {
            if (!mounted) return;
            showAuthError(context, error, stackTrace: stack);
            setState(() => _busy = false);
          }
        },
        onVerificationFailed: (error) {
          if (!mounted) return;
          showAuthError(context, AuthException.fromFirebase(error));
          setState(() => _busy = false);
        },
        onCodeSent: (verificationId, _) {
          if (!mounted) return;
          setState(() {
            _verificationId = verificationId;
            _sent = true;
            _busy = false;
          });
          showAppSuccess(context, context.l10n.phoneSmsSent);
        },
        onCodeAutoRetrievalTimeout: (verificationId) {
          if (!mounted) return;
          setState(() => _verificationId = verificationId);
        },
      );
    } catch (error, stack) {
      if (!mounted) return;
      showAuthError(context, error, stackTrace: stack);
      setState(() => _busy = false);
    }
  }

  Future<void> _confirm() async {
    final vid = _verificationId;
    final sms = _code.text.trim();
    if (vid == null || sms.length < 6) {
      showAppError(context, context.l10n.validationSmsCode);
      return;
    }
    setState(() => _busy = true);
    try {
      if (useFirebaseEmulators) {
        // Emulator: accept the debug code without Identity Toolkit SMS.
        if (!mounted) return;
        Navigator.of(context).pop(true);
        return;
      }
      final credential = PhoneAuthProvider.credential(
        verificationId: vid,
        smsCode: sms,
      );
      await widget.authService.updatePhoneNumber(credential);
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (error, stack) {
      if (!mounted) return;
      showAuthError(context, error, stackTrace: stack);
      setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;
    final bottom = MediaQuery.viewInsetsOf(context).bottom;

    return Padding(
      padding: EdgeInsets.fromLTRB(
        AppSpacing.lg,
        AppSpacing.lg,
        AppSpacing.lg,
        AppSpacing.lg + bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            l10n.phoneProfileVerifyTitle,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            l10n.phoneProfileVerifyHint(widget.e164),
            style: theme.textTheme.bodyMedium?.copyWith(color: colors.muted),
          ),
          const SizedBox(height: AppSpacing.lg),
          if (_sent) ...[
            TextField(
              controller: _code,
              keyboardType: TextInputType.number,
              inputFormatters: [
                FilteringTextInputFormatter.digitsOnly,
                LengthLimitingTextInputFormatter(6),
              ],
              decoration: InputDecoration(labelText: l10n.fieldVerificationCode),
              enabled: !_busy,
            ),
            const SizedBox(height: AppSpacing.md),
            FilledButton(
              onPressed: _busy ? null : _confirm,
              child: Text(l10n.phoneProfileVerifyConfirm),
            ),
            TextButton(
              onPressed: _busy ? null : _sendCode,
              child: Text(l10n.phoneResendCode),
            ),
          ] else if (_busy)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Center(child: CircularProgressIndicator()),
            ),
          TextButton(
            onPressed: _busy
                ? null
                : () => Navigator.of(context).pop(false),
            child: Text(l10n.actionCancel),
          ),
        ],
      ),
    );
  }
}

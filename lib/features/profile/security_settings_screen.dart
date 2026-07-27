import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../app/app_feedback.dart';
import '../../app/app_spacing.dart';
import '../../app/pulse_haptics.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../auth/auth.dart';
import '../../l10n/l10n.dart';

/// Password + MFA enrollment for signed-in members.
class SecuritySettingsScreen extends StatefulWidget {
  const SecuritySettingsScreen({super.key, required this.authService});

  final AuthService authService;

  @override
  State<SecuritySettingsScreen> createState() => _SecuritySettingsScreenState();
}

class _SecuritySettingsScreenState extends State<SecuritySettingsScreen> {
  List<MultiFactorInfo> _factors = const [];
  bool _loading = true;
  bool _busy = false;

  final _currentPassword = TextEditingController();
  final _newPassword = TextEditingController();
  final _confirmPassword = TextEditingController();
  final _mfaReauthPassword = TextEditingController();
  final _totpCode = TextEditingController();
  final _phone = TextEditingController();
  final _smsCode = TextEditingController();

  TotpSecret? _pendingTotp;
  String? _totpQrUrl;
  String? _phoneVerificationId;
  bool _smsSent = false;

  @override
  void initState() {
    super.initState();
    _reloadFactors();
  }

  @override
  void dispose() {
    _currentPassword.dispose();
    _newPassword.dispose();
    _confirmPassword.dispose();
    _mfaReauthPassword.dispose();
    _totpCode.dispose();
    _phone.dispose();
    _smsCode.dispose();
    super.dispose();
  }

  Future<void> _reloadFactors() async {
    setState(() => _loading = true);
    try {
      final factors = await widget.authService.listEnrolledFactors();
      if (!mounted) return;
      setState(() {
        _factors = factors;
        _loading = false;
      });
    } catch (error, stack) {
      if (!mounted) return;
      setState(() => _loading = false);
      showAuthError(context, error, stackTrace: stack);
    }
  }

  Future<bool> _ensureRecentLogin() async {
    if (!widget.authService.hasPasswordProvider()) {
      try {
        await widget.authService.reauthenticate();
        return true;
      } catch (error, stack) {
        if (!mounted) return false;
        showAuthError(context, error, stackTrace: stack);
        return false;
      }
    }
    final password = _mfaReauthPassword.text;
    if (password.isEmpty) {
      showAppError(
        context,
        'reauth-required',
        fallbackMessage: context.l10n.securityReauthHint,
      );
      return false;
    }
    try {
      await widget.authService.reauthenticate(password: password);
      return true;
    } catch (error, stack) {
      if (!mounted) return false;
      showAuthError(context, error, stackTrace: stack);
      return false;
    }
  }

  Future<void> _savePassword() async {
    final l10n = context.l10n;
    final hasPassword = widget.authService.hasPasswordProvider();
    if (_newPassword.text.length < 6) {
      showAuthError(context, const AuthException(code: 'weak-password'));
      return;
    }
    if (_newPassword.text != _confirmPassword.text) {
      showAppError(context, l10n.setPasswordMismatch);
      return;
    }
    setState(() => _busy = true);
    try {
      if (hasPassword) {
        await widget.authService.changePassword(
          currentPassword: _currentPassword.text,
          newPassword: _newPassword.text,
        );
      } else {
        await widget.authService.linkPassword(_newPassword.text);
        await widget.authService.currentUser?.reload();
      }
      if (!mounted) return;
      _currentPassword.clear();
      _newPassword.clear();
      _confirmPassword.clear();
      showAppSuccess(context, l10n.securityPasswordSaved);
      setState(() {});
    } catch (error, stack) {
      if (!mounted) return;
      showAuthError(context, error, stackTrace: stack);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _startTotp() async {
    if (!await _ensureRecentLogin()) return;
    setState(() => _busy = true);
    try {
      final secret = await widget.authService.startTotpEnrollment();
      final email = widget.authService.currentUser?.email ?? 'user';
      final url = await secret.generateQrCodeUrl(
        accountName: email,
        issuer: 'Every Benefits',
      );
      if (!mounted) return;
      setState(() {
        _pendingTotp = secret;
        _totpQrUrl = url;
      });
    } catch (error, stack) {
      if (!mounted) return;
      showAuthError(context, error, stackTrace: stack);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _finishTotp() async {
    final secret = _pendingTotp;
    if (secret == null) return;
    setState(() => _busy = true);
    try {
      await widget.authService.finishTotpEnrollment(
        secret: secret,
        oneTimePassword: _totpCode.text,
      );
      if (!mounted) return;
      _totpCode.clear();
      setState(() {
        _pendingTotp = null;
        _totpQrUrl = null;
      });
      showAppSuccess(context, context.l10n.securityFactorAdded);
      await _reloadFactors();
    } catch (error, stack) {
      if (!mounted) return;
      showAuthError(context, error, stackTrace: stack);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _sendPhoneSms() async {
    final phone = _phone.text.trim();
    if (phone.isEmpty) return;
    if (!await _ensureRecentLogin()) return;
    setState(() => _busy = true);
    try {
      final session =
          await widget.authService.currentUser!.multiFactor.getSession();
      await widget.authService.verifyPhoneNumber(
        phoneNumber: phone,
        multiFactorSession: session,
        onVerificationCompleted: (_) {},
        onVerificationFailed: (error) {
          if (!mounted) return;
          showAuthError(context, AuthException.fromFirebase(error));
          setState(() => _busy = false);
        },
        onCodeSent: (verificationId, _) {
          if (!mounted) return;
          setState(() {
            _phoneVerificationId = verificationId;
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

  Future<void> _finishPhone() async {
    final vid = _phoneVerificationId;
    if (vid == null) return;
    setState(() => _busy = true);
    try {
      final cred = PhoneAuthProvider.credential(
        verificationId: vid,
        smsCode: _smsCode.text.trim(),
      );
      await widget.authService.enrollPhoneFactor(credential: cred);
      if (!mounted) return;
      _smsCode.clear();
      _phone.clear();
      setState(() {
        _smsSent = false;
        _phoneVerificationId = null;
      });
      showAppSuccess(context, context.l10n.securityFactorAdded);
      await _reloadFactors();
    } catch (error, stack) {
      if (!mounted) return;
      showAuthError(context, error, stackTrace: stack);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _removeFactor(MultiFactorInfo info) async {
    if (!await _ensureRecentLogin()) return;
    setState(() => _busy = true);
    try {
      await widget.authService.unenrollFactor(multiFactorInfo: info);
      if (!mounted) return;
      showAppSuccess(context, context.l10n.securityFactorRemoved);
      await _reloadFactors();
    } catch (error, stack) {
      if (!mounted) return;
      showAuthError(context, error, stackTrace: stack);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _factorSubtitle(MultiFactorInfo factor, AppLocalizations l10n) {
    if (factor is PhoneMultiFactorInfo && factor.phoneNumber.isNotEmpty) {
      return factor.phoneNumber;
    }
    return factor.factorId;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;
    final hasPassword = widget.authService.hasPasswordProvider();
    final qrUrl = _totpQrUrl;

    return PulseScaffold(
      appBar: AppBar(
        title: Text(
          l10n.settingsSecurity,
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
            l10n.settingsSecurityHint,
            style: theme.textTheme.bodyMedium?.copyWith(color: colors.muted),
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(
            hasPassword
                ? l10n.securityChangePassword
                : l10n.securitySetPassword,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          if (hasPassword)
            TextField(
              controller: _currentPassword,
              obscureText: true,
              decoration:
                  InputDecoration(labelText: l10n.securityCurrentPassword),
            ),
          if (hasPassword) const SizedBox(height: AppSpacing.sm),
          TextField(
            controller: _newPassword,
            obscureText: true,
            decoration: InputDecoration(labelText: l10n.securityNewPassword),
          ),
          const SizedBox(height: AppSpacing.sm),
          TextField(
            controller: _confirmPassword,
            obscureText: true,
            decoration: InputDecoration(labelText: l10n.fieldConfirmPassword),
          ),
          const SizedBox(height: AppSpacing.md),
          FilledButton(
            onPressed: _busy ? null : _savePassword,
            child: Text(
              hasPassword
                  ? l10n.securityChangePassword
                  : l10n.securitySetPassword,
            ),
          ),
          const SizedBox(height: AppSpacing.xl),
          Text(
            l10n.securityMfaTitle,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            l10n.securityMfaHint,
            style: theme.textTheme.bodyMedium?.copyWith(color: colors.muted),
          ),
          if (hasPassword) ...[
            const SizedBox(height: AppSpacing.md),
            Text(
              l10n.securityReauthHint,
              style: theme.textTheme.bodySmall?.copyWith(color: colors.muted),
            ),
            const SizedBox(height: AppSpacing.sm),
            TextField(
              controller: _mfaReauthPassword,
              obscureText: true,
              decoration: InputDecoration(
                labelText: l10n.securityCurrentPassword,
              ),
            ),
          ],
          const SizedBox(height: AppSpacing.md),
          if (_loading)
            const Center(child: CircularProgressIndicator())
          else if (_factors.isEmpty)
            Text(
              l10n.securityNoFactors,
              style: theme.textTheme.bodyMedium?.copyWith(color: colors.muted),
            )
          else
            for (final factor in _factors)
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(
                  factor.displayName ??
                      (factor.factorId == 'totp'
                          ? l10n.mfaTotpLabel
                          : l10n.mfaSmsLabel),
                ),
                subtitle: Text(_factorSubtitle(factor, l10n)),
                trailing: TextButton(
                  onPressed: _busy
                      ? null
                      : () {
                          PulseHaptics.selection();
                          _removeFactor(factor);
                        },
                  child: Text(l10n.securityFactorRemove),
                ),
              ),
          const SizedBox(height: AppSpacing.md),
          if (_pendingTotp == null) ...[
            OutlinedButton(
              onPressed: _busy ? null : _startTotp,
              child: Text(l10n.securityEnrollTotp),
            ),
          ] else ...[
            Text(l10n.securityTotpScan),
            const SizedBox(height: AppSpacing.sm),
            if (qrUrl != null && qrUrl.isNotEmpty)
              Center(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: colors.border),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Image.network(
                      'https://api.qrserver.com/v1/create-qr-code/'
                      '?size=180x180&data=${Uri.encodeComponent(qrUrl)}',
                      width: 180,
                      height: 180,
                      errorBuilder: (_, _, _) => SelectableText(
                        qrUrl,
                        style: theme.textTheme.bodySmall,
                      ),
                    ),
                  ),
                ),
              ),
            const SizedBox(height: AppSpacing.sm),
            SelectableText(
              _pendingTotp!.secretKey,
              style: theme.textTheme.bodySmall,
            ),
            TextButton(
              onPressed: () {
                Clipboard.setData(
                  ClipboardData(text: _pendingTotp!.secretKey),
                );
              },
              child: Text(l10n.securityTotpSecret),
            ),
            TextField(
              controller: _totpCode,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(labelText: l10n.mfaCodeLabel),
            ),
            const SizedBox(height: AppSpacing.sm),
            FilledButton(
              onPressed: _busy ? null : _finishTotp,
              child: Text(l10n.mfaVerify),
            ),
          ],
          const SizedBox(height: AppSpacing.md),
          TextField(
            controller: _phone,
            keyboardType: TextInputType.phone,
            decoration: InputDecoration(labelText: l10n.securityPhoneHint),
          ),
          const SizedBox(height: AppSpacing.sm),
          if (!_smsSent)
            OutlinedButton(
              onPressed: _busy ? null : _sendPhoneSms,
              child: Text(l10n.securityEnrollSms),
            )
          else ...[
            TextField(
              controller: _smsCode,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(labelText: l10n.mfaCodeLabel),
            ),
            const SizedBox(height: AppSpacing.sm),
            FilledButton(
              onPressed: _busy ? null : _finishPhone,
              child: Text(l10n.mfaVerify),
            ),
          ],
        ],
      ),
    );
  }
}

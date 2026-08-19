import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/layout/pulse_constrained.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../auth/auth.dart';
import '../../l10n/l10n.dart';
import '../../users/users.dart';
import 'phone_profile_verify.dart';
import 'widgets/profile_form_widgets.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({
    super.key,
    required this.profile,
    required this.userRepository,
    required this.authService,
  });

  final UserProfile profile;
  final UserRepository userRepository;
  final AuthService authService;

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  bool _busy = false;

  Future<void> _save(ProfileFormData data) async {
    setState(() => _busy = true);
    try {
      final isAgentFields = requiresLicenseProfile(widget.profile.roleId);

      final changed = phoneChangedFromProfile(
        previousCode: widget.profile.phoneCountryCode,
        previousNumber: widget.profile.phoneNumber,
        nextCode: data.phoneCountryCode,
        nextNumber: data.phoneNumber,
      );

      var phoneVerified = widget.profile.phoneVerified;
      if (changed) {
        final nextDigits = data.phoneNumber.trim();
        if (nextDigits.isEmpty) {
          phoneVerified = false;
        } else {
          final ok = await verifyProfilePhone(
            context: context,
            authService: widget.authService,
            e164: e164Phone(data.phoneCountryCode, data.phoneNumber),
          );
          if (!ok) {
            if (mounted) setState(() => _busy = false);
            return;
          }
          phoneVerified = true;
        }
      }

      final nextEmail = data.email?.trim().toLowerCase();
      final currentEmail = widget.profile.email?.trim().toLowerCase() ?? '';
      if (nextEmail != null &&
          nextEmail.isNotEmpty &&
          nextEmail != currentEmail) {
        await widget.userRepository.updateAccountEmail(nextEmail);
      }

      final nextUsername = data.username?.trim().toLowerCase() ?? '';
      final currentUsername = widget.profile.username?.trim().toLowerCase() ?? '';
      if (nextUsername.isNotEmpty && nextUsername != currentUsername) {
        await widget.userRepository.updateUsername(nextUsername);
      }

      final next = widget.profile.copyWith(
        displayName: data.displayName,
        email: nextEmail ?? widget.profile.email,
        bio: data.bio,
        clearBio: data.bio == null || data.bio!.isEmpty,
        phoneCountryCode: data.phoneCountryCode,
        phoneCountryIso2: data.phoneCountryIso2,
        phoneNumber: data.phoneNumber,
        phoneVerified: phoneVerified,
        // Role is frozen after completion — never written from edit.
        role: widget.profile.role,
        roleId: widget.profile.roleId,
        profileCompleted: true,
        npn: widget.profile.npn,
        addressStreet: data.addressStreet,
        addressApt: data.addressApt,
        addressCity: data.addressCity,
        addressState: data.addressState,
        addressZip: data.addressZip,
        agency: data.agency ?? kDefaultAgency,
        clearNpn: false,
        clearAddress: !isAgentFields,
        clearAgency: !isAgentFields,
      );
      await widget.userRepository.updateProfile(next);
      if (!mounted) return;
      Navigator.of(context).pop();
    } catch (error) {
      if (!mounted) return;
      final message = error is FirebaseFunctionsException
          ? (error.code.contains('already-exists')
              ? (error.message?.contains('taken') == true
                  ? context.l10n.usernameTaken
                  : context.l10n.errEmailInUse)
              : error.code.contains('invalid-argument')
                  ? (error.message?.contains('invalid') == true
                      ? context.l10n.usernameInvalid
                      : context.l10n.validationEmail)
                  : context.l10n.editProfileUpdateFailed(
                      error.message ?? error.code,
                    ))
          : context.l10n.editProfileUpdateFailed('$error');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message)),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final l10n = context.l10n;
    final profile = widget.profile;

    return PulseScaffold(
      appBar: AppBar(
        title: Text(
          l10n.editProfileTitle,
          style: theme.textTheme.headlineMedium?.copyWith(fontSize: 22),
        ),
      ),
      body: SafeArea(
        child: PulseConstrained(
          maxWidth: PulseContentWidth.form,
          padding: EdgeInsets.zero,
          child: ListView(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.lg,
            AppSpacing.sm,
            AppSpacing.lg,
            AppSpacing.xl,
          ),
          children: [
            Text(
              l10n.editProfileRoleSection.toUpperCase(),
              style: theme.textTheme.labelLarge?.copyWith(
                letterSpacing: 1.6,
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: colors.muted,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            DecoratedBox(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: colors.border),
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    brand.withValues(alpha: 0.12),
                    colors.meshDeep,
                  ],
                ),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Text(
                      roleLabelForId(profile.roleId, l10n),
                      style: theme.textTheme.labelLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.4,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        profile.phoneVerified
                            ? l10n.phoneProfileVerifiedBadge
                            : l10n.editProfileRoleFrozen,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: colors.muted,
                          height: 1.35,
                        ),
                      ),
                    ),
                    Icon(
                      Icons.lock_outline_rounded,
                      color: colors.muted,
                      size: 20,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
            ProfileDetailsForm(
              accountType: profile.role,
              busy: _busy,
              lockName: false,
              lockNpn: true,
              lockAgency: true,
              showEmail: true,
              showUsername: true,
              submitLabel: l10n.editProfileSave,
              initialName: profile.displayName,
              initialEmail: profile.email,
              initialUsername: profile.username,
              initialBio: profile.bio,
              initialCountryCode: profile.phoneCountryCode,
              initialCountryIso2: profile.phoneCountryIso2,
              initialPhoneNumber: profile.phoneNumber,
              initialNpn: profile.npn,
              initialAddressStreet: profile.effectiveAddressStreet,
              initialAddressApt: profile.addressApt,
              initialAddressCity: profile.addressCity,
              initialAddressState: profile.addressState,
              initialAddressZip: profile.addressZip,
              initialAgency: profile.agency ?? kDefaultAgency,
              onSubmit: _save,
            ),
          ],
        ),
        ),
      ),
    );
  }
}

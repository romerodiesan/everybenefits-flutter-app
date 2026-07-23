import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../app/widgets/role_badge.dart';
import '../../l10n/l10n.dart';
import '../../users/users.dart';
import 'widgets/profile_form_widgets.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({
    super.key,
    required this.profile,
    required this.userRepository,
  });

  final UserProfile profile;
  final UserRepository userRepository;

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  bool _busy = false;

  Future<void> _save(ProfileFormData data) async {
    setState(() => _busy = true);
    try {
      final isAgentFields = widget.profile.role == UserRole.agent ||
          widget.profile.role == UserRole.instructor ||
          widget.profile.role == UserRole.admin;
      final next = widget.profile.copyWith(
        // Name and NPN are locked after setup — keep existing values.
        displayName: widget.profile.displayName,
        phoneCountryCode: data.phoneCountryCode,
        phoneNumber: data.phoneNumber,
        // Role is frozen after completion — never written from edit.
        role: widget.profile.role,
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
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.l10n.editProfileUpdateFailed('$error'))),
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
                    RoleBadge(role: profile.role),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        l10n.editProfileRoleFrozen,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: colors.muted,
                          height: 1.35,
                        ),
                      ),
                    ),
                    Icon(Icons.lock_outline_rounded, color: colors.muted, size: 20),
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
            ProfileDetailsForm(
              accountType: profile.role,
              busy: _busy,
              lockName: true,
              lockNpn: true,
              submitLabel: l10n.editProfileSave,
              initialName: profile.displayName,
              initialCountryCode: profile.phoneCountryCode,
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
    );
  }
}

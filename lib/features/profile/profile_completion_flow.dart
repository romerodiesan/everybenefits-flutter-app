import 'package:flutter/material.dart';

import '../../app/app_feedback.dart';
import '../../app/app_spacing.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../auth/auth.dart';
import '../../l10n/l10n.dart';
import '../../users/users.dart';
import '../chats/chat_default_group_callable.dart';
import 'widgets/profile_form_widgets.dart';

class ProfileCompletionFlow extends StatefulWidget {
  const ProfileCompletionFlow({
    super.key,
    required this.profile,
    required this.userRepository,
    required this.authService,
  });

  final UserProfile profile;
  final UserRepository userRepository;
  final AuthService authService;

  @override
  State<ProfileCompletionFlow> createState() => _ProfileCompletionFlowState();
}

class _ProfileCompletionFlowState extends State<ProfileCompletionFlow> {
  UserRole? _type;
  bool _busy = false;
  int _step = 0;

  Future<void> _save(ProfileFormData data) async {
    final type = _type;
    if (type == null) return;

    setState(() => _busy = true);
    try {
      final completed = widget.profile.copyWith(
        displayName: data.displayName,
        phoneCountryCode: data.phoneCountryCode,
        phoneNumber: data.phoneNumber,
        role: type,
        profileCompleted: true,
        npn: data.npn,
        addressStreet: data.addressStreet,
        addressApt: data.addressApt,
        addressCity: data.addressCity,
        addressState: data.addressState,
        addressZip: data.addressZip,
        agency: data.agency ?? kDefaultAgency,
        clearNpn: type == UserRole.student,
        clearAddress: type == UserRole.student,
        clearAgency: type == UserRole.student,
      );
      await widget.userRepository.updateProfile(completed);
      if (type == UserRole.agent) {
        try {
          await DefaultAgentGroupCallable().ensureMembership();
        } catch (_) {
          // Membership can be repaired on next Chats open.
        }
      }
    } catch (error, stackTrace) {
      if (!mounted) return;
      showAppError(
        context,
        error,
        stackTrace: stackTrace,
        fallbackMessage: context.l10n.profileSaveFailed,
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;

    return PulseScaffold(
      appBar: AppBar(
        title: Text(
          _step == 0 ? l10n.profileCompleteRoleTitle : l10n.profileCompleteDataTitle,
        ),
        actions: [
          TextButton(
            onPressed: _busy ? null : widget.authService.signOut,
            child: Text(l10n.profileCompleteSignOut),
          ),
        ],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.lg,
            AppSpacing.md,
            AppSpacing.lg,
            AppSpacing.xl,
          ),
          children: [
            if (_step == 0) ...[
              Text(
                l10n.profileCompleteHeadline,
                style: theme.textTheme.displaySmall?.copyWith(fontSize: 34),
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                l10n.profileCompleteSubtitle,
                style: theme.textTheme.bodyLarge?.copyWith(color: colors.muted),
              ),
              const SizedBox(height: AppSpacing.xl),
              _RoleHeroCard(
                title: l10n.profileCompleteAgentTitle,
                subtitle: l10n.profileCompleteAgentSubtitle,
                selected: _type == UserRole.agent,
                onTap: () => setState(() => _type = UserRole.agent),
              ),
              const SizedBox(height: AppSpacing.md),
              _RoleHeroCard(
                title: l10n.profileCompleteStudentTitle,
                subtitle: l10n.profileCompleteStudentSubtitle,
                selected: _type == UserRole.student,
                onTap: () => setState(() => _type = UserRole.student),
              ),
              const SizedBox(height: AppSpacing.xl),
              SignalButton(
                label: l10n.actionContinue,
                onPressed: _type == null
                    ? null
                    : () => setState(() => _step = 1),
              ),
            ] else ...[
              TextButton(
                onPressed: _busy ? null : () => setState(() => _step = 0),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text(l10n.profileCompleteChangeRole),
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                l10n.profileCompleteTellMore,
                style: theme.textTheme.headlineMedium,
              ),
              const SizedBox(height: AppSpacing.lg),
              ProfileDetailsForm(
                accountType: _type!,
                busy: _busy,
                submitLabel: l10n.profileCompleteFinish,
                initialName: widget.profile.displayName,
                initialCountryCode: widget.profile.phoneCountryCode,
                initialPhoneNumber: widget.profile.phoneNumber,
                initialNpn: widget.profile.npn,
                initialAddressStreet: widget.profile.effectiveAddressStreet,
                initialAddressApt: widget.profile.addressApt,
                initialAddressCity: widget.profile.addressCity,
                initialAddressState: widget.profile.addressState,
                initialAddressZip: widget.profile.addressZip,
                initialAgency: widget.profile.agency ?? kDefaultAgency,
                onSubmit: _save,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _RoleHeroCard extends StatelessWidget {
  const _RoleHeroCard({
    required this.title,
    required this.subtitle,
    required this.selected,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);

    return PulseSheet(
      onTap: onTap,
      padding: const EdgeInsets.all(20),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: theme.textTheme.headlineMedium?.copyWith(fontSize: 24),
                ),
                const SizedBox(height: 6),
                Text(subtitle, style: theme.textTheme.bodyMedium),
              ],
            ),
          ),
          Icon(
            selected ? Icons.check_circle_rounded : Icons.circle_outlined,
            color: selected ? AppColors.brandOf(context) : colors.muted,
            size: 28,
          ),
        ],
      ),
    );
  }
}

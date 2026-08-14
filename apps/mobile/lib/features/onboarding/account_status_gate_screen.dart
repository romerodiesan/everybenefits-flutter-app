import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../auth/auth_service.dart';
import '../../l10n/l10n.dart';
import '../../users/user_profile.dart';

/// Full-page stop for deactivated / pending-deletion accounts (web AccountGate).
class AccountStatusGateScreen extends StatelessWidget {
  const AccountStatusGateScreen({
    super.key,
    required this.profile,
    required this.authService,
  });

  final UserProfile profile;
  final AuthService authService;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;
    final pendingDeletion = profile.accountStatus == 'pendingDeletion';

    return PulseScaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(),
              Icon(
                pendingDeletion
                    ? Icons.delete_forever_rounded
                    : Icons.lock_outline_rounded,
                size: 56,
                color: AppColors.brandOf(context),
              ),
              const SizedBox(height: AppSpacing.lg),
              Text(
                pendingDeletion
                    ? l10n.accountGateDeletionTitle
                    : l10n.accountGateDeactivatedTitle,
                textAlign: TextAlign.center,
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                pendingDeletion
                    ? l10n.accountGateDeletionBody
                    : l10n.accountGateDeactivatedBody,
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: colors.muted,
                  height: 1.45,
                ),
              ),
              const Spacer(),
              OutlinedButton(
                onPressed: () => authService.signOut(),
                child: Text(l10n.settingsSignOut),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

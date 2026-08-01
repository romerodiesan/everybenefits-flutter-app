import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../auth/auth_service.dart';
import '../../l10n/l10n.dart';
import '../../users/user_profile.dart';

class PendingApprovalScreen extends StatelessWidget {
  const PendingApprovalScreen({
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
    final rejected = profile.approvalStatus == 'rejected';

    return PulseScaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(),
              Icon(
                rejected ? Icons.block_rounded : Icons.hourglass_top_rounded,
                size: 56,
                color: AppColors.brandOf(context),
              ),
              const SizedBox(height: AppSpacing.lg),
              Text(
                rejected
                    ? (l10n.localeName.startsWith('es')
                        ? 'Cuenta no aprobada'
                        : 'Account not approved')
                    : (l10n.localeName.startsWith('es')
                        ? 'Esperando aprobación'
                        : 'Waiting for approval'),
                textAlign: TextAlign.center,
                style: theme.textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                rejected
                    ? (l10n.localeName.startsWith('es')
                        ? 'Un administrador rechazó el acceso. Contacta soporte si crees que es un error.'
                        : 'An administrator declined access. Contact support if you think this is a mistake.')
                    : (l10n.localeName.startsWith('es')
                        ? 'Gracias por unirte a Pulse. Un admin o manager revisará tu cuenta pronto.'
                        : 'Thanks for joining Pulse. An admin or manager will review your account shortly.'),
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyLarge?.copyWith(
                  color: colors.muted,
                  height: 1.4,
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

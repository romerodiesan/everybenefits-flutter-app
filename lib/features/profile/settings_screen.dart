import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/theme.dart';
import '../../app/theme_controller.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../app/widgets/role_badge.dart';
import '../../auth/auth.dart';
import '../../users/users.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({
    super.key,
    required this.authService,
    required this.userRepository,
    required this.profile,
    this.onEditProfile,
  });

  final AuthService authService;
  final UserRepository userRepository;
  final UserProfile profile;
  final VoidCallback? onEditProfile;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final themeController = ThemeScope.of(context);

    return PulseScaffold(
      appBar: AppBar(title: const Text('Ajustes')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.lg,
          AppSpacing.sm,
          AppSpacing.lg,
          AppSpacing.xl,
        ),
        children: [
          Text('Tu información', style: theme.textTheme.titleMedium),
          const SizedBox(height: AppSpacing.sm),
          PulseSheet(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                RoleBadge(role: profile.role),
                const SizedBox(height: AppSpacing.md),
                _InfoRow(label: 'Nombre', value: profile.headlineName),
                Divider(color: colors.border),
                _InfoRow(
                  label: 'Email',
                  value: profile.email ?? 'Sin email vinculado',
                ),
              ],
            ),
          ),
          if (onEditProfile != null) ...[
            const SizedBox(height: AppSpacing.sm),
            OutlinedButton(
              onPressed: onEditProfile,
              child: const Text('Editar perfil'),
            ),
          ],
          const SizedBox(height: AppSpacing.xl),
          Text('Tema', style: theme.textTheme.titleMedium),
          const SizedBox(height: AppSpacing.sm),
          SegmentedButton<ThemeMode>(
            segments: const [
              ButtonSegment(value: ThemeMode.system, label: Text('Auto')),
              ButtonSegment(value: ThemeMode.light, label: Text('Claro')),
              ButtonSegment(value: ThemeMode.dark, label: Text('Oscuro')),
            ],
            selected: {themeController.mode},
            onSelectionChanged: (value) {
              themeController.setMode(value.first);
            },
          ),
          const SizedBox(height: AppSpacing.xl),
          Text('Color de acento', style: theme.textTheme.titleMedium),
          const SizedBox(height: 4),
          Text(
            'Se aplica a botones, tabs y acentos de la app.',
            style: theme.textTheme.bodyMedium?.copyWith(color: colors.muted),
          ),
          const SizedBox(height: AppSpacing.md),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              for (final seed in kPrimarySeeds)
                _ColorSwatch(
                  seed: seed,
                  selected: themeController.primarySeedId == seed.id,
                  onTap: () => themeController.setPrimarySeed(seed.id),
                ),
            ],
          ),
          const SizedBox(height: AppSpacing.xl),
          TextButton(
            onPressed: authService.signOut,
            child: Text(
              'Cerrar sesión',
              style: theme.textTheme.labelLarge?.copyWith(
                color: theme.colorScheme.error,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ColorSwatch extends StatelessWidget {
  const _ColorSwatch({
    required this.seed,
    required this.selected,
    required this.onTap,
  });

  final PrimarySeed seed;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Semantics(
      button: true,
      selected: selected,
      label: seed.label,
      child: InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: seed.color,
            shape: BoxShape.circle,
            border: Border.all(
              color: selected ? colors.ink : colors.border,
              width: selected ? 2.5 : 1,
            ),
            boxShadow: selected
                ? [
                    BoxShadow(
                      color: seed.color.withValues(alpha: 0.35),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: selected
              ? Icon(
                  Icons.check_rounded,
                  color: onBrandFor(seed.color),
                  size: 22,
                )
              : null,
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 88,
            child: Text(
              label,
              style: theme.textTheme.bodyMedium?.copyWith(color: colors.muted),
            ),
          ),
          Expanded(child: Text(value, style: theme.textTheme.bodyLarge)),
        ],
      ),
    );
  }
}

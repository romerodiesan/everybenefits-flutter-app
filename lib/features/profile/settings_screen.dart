import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/theme.dart';
import '../../app/widgets/glass_card.dart';
import '../../app/widgets/mesh_background.dart';
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

    return MeshBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
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
            GlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  RoleBadge(role: profile.role),
                  const SizedBox(height: AppSpacing.md),
                  _InfoRow(
                    label: 'Nombre',
                    value: profile.headlineName,
                  ),
                  const Divider(),
                  _InfoRow(
                    label: 'Email',
                    value: profile.email ?? 'Sin email vinculado',
                  ),
                  if (!profile.isAnonymous) ...[
                    const Divider(),
                    _InfoRow(
                      label: 'Teléfono',
                      value: profile.fullPhone ?? 'Sin teléfono',
                    ),
                    if (profile.role == UserRole.agent) ...[
                      const Divider(),
                      _InfoRow(label: 'NPN', value: profile.npn ?? '—'),
                      const Divider(),
                      _InfoRow(
                        label: 'Dirección',
                        value: profile.address ?? '—',
                      ),
                      const Divider(),
                      _InfoRow(
                        label: 'Agencia',
                        value: profile.agency ?? kDefaultAgency,
                      ),
                    ],
                  ],
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            Text('Cuenta', style: theme.textTheme.titleMedium),
            const SizedBox(height: AppSpacing.sm),
            GlassCard(
              padding: EdgeInsets.zero,
              child: Column(
                children: [
                  if (!profile.isAnonymous)
                    _SettingsTile(
                      icon: Icons.edit_outlined,
                      title: 'Editar perfil',
                      onTap: onEditProfile,
                    ),
                  if (!profile.isAnonymous) const Divider(height: 1),
                  _SettingsTile(
                    icon: Icons.notifications_outlined,
                    title: 'Notificaciones',
                    subtitle: 'Próximamente',
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Las notificaciones llegan pronto.'),
                        ),
                      );
                    },
                  ),
                  const Divider(height: 1),
                  _SettingsTile(
                    icon: Icons.lock_outline_rounded,
                    title: 'Privacidad',
                    subtitle: 'Próximamente',
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Ajustes de privacidad llegan pronto.'),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            Text('Sesión', style: theme.textTheme.titleMedium),
            const SizedBox(height: AppSpacing.sm),
            GlassCard(
              padding: EdgeInsets.zero,
              child: _SettingsTile(
                icon: Icons.logout_rounded,
                title: 'Cerrar sesión',
                destructive: true,
                onTap: authService.signOut,
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
            Text(
              'Every Insurance',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium,
            ),
          ],
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
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 96,
            child: Text(label, style: theme.textTheme.bodyMedium),
          ),
          Expanded(
            child: Text(value, style: theme.textTheme.bodyLarge),
          ),
        ],
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  const _SettingsTile({
    required this.icon,
    required this.title,
    this.subtitle,
    this.onTap,
    this.destructive = false,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback? onTap;
  final bool destructive;

  @override
  Widget build(BuildContext context) {
    final color = destructive ? const Color(0xFFFF8A80) : AppColors.ink;
    return ListTile(
      leading: Icon(icon, color: destructive ? color : AppColors.accent),
      title: Text(
        title,
        style: Theme.of(context).textTheme.titleMedium?.copyWith(color: color),
      ),
      subtitle: subtitle == null
          ? null
          : Text(subtitle!, style: Theme.of(context).textTheme.bodyMedium),
      trailing: Icon(
        Icons.chevron_right_rounded,
        color: AppColors.muted.withValues(alpha: 0.7),
      ),
      onTap: onTap,
    );
  }
}

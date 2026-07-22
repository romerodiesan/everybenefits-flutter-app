import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/theme.dart';
import '../../app/widgets/glass_card.dart';
import '../../app/widgets/orb_visual.dart';
import '../../users/user_profile.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({
    super.key,
    required this.profile,
    required this.onOpenAi,
    required this.onOpenChats,
    required this.onOpenUniversity,
    required this.onOpenProfile,
    required this.onOpenCommunity,
  });

  final UserProfile profile;
  final VoidCallback onOpenAi;
  final VoidCallback onOpenChats;
  final VoidCallback onOpenUniversity;
  final VoidCallback onOpenProfile;
  final VoidCallback onOpenCommunity;

  String get _greeting {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }

  String get _initial => profile.initials;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.lg,
            AppSpacing.md,
            AppSpacing.lg,
            AppSpacing.xl,
          ),
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _greeting,
                        style: theme.textTheme.headlineMedium?.copyWith(
                          fontSize: 30,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Tu comunidad profesional',
                        style: theme.textTheme.bodyMedium,
                      ),
                    ],
                  ),
                ),
                GestureDetector(
                  onTap: onOpenProfile,
                  child: Container(
                    width: 48,
                    height: 48,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.of(context).glassFill,
                      border: Border.all(color: AppColors.of(context).glassBorder),
                      image: profile.photoUrl == null
                          ? null
                          : DecorationImage(
                              image: NetworkImage(profile.photoUrl!),
                              fit: BoxFit.cover,
                            ),
                    ),
                    child: profile.photoUrl == null
                        ? Text(
                            _initial,
                            style: theme.textTheme.titleLarge?.copyWith(
                              color: AppColors.accent,
                            ),
                          )
                        : null,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.lg),
            GlassCard(
              onTap: onOpenAi,
              padding: const EdgeInsets.fromLTRB(20, 20, 16, 20),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Asistente IA',
                          style: theme.textTheme.titleLarge,
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Pregunta lo que necesites',
                          style: theme.textTheme.bodyMedium,
                        ),
                        const SizedBox(height: AppSpacing.md),
                        Icon(
                          Icons.arrow_forward_rounded,
                          color: AppColors.accent,
                          size: 22,
                        ),
                      ],
                    ),
                  ),
                  const OrbVisual(size: 108),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            Row(
              children: [
                Expanded(
                  child: _GridTile(
                    label: 'Comunidad',
                    icon: Icons.forum_outlined,
                    onTap: onOpenCommunity,
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: _GridTile(
                    label: 'Chats',
                    icon: Icons.chat_bubble_outline,
                    onTap: onOpenChats,
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: _GridTile(
                    label: 'Universidad',
                    icon: Icons.school_outlined,
                    onTap: onOpenUniversity,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.lg),
            GlassCard(
              onTap: onOpenUniversity,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'CURSO DESTACADO',
                    style: theme.textTheme.labelLarge?.copyWith(
                      color: AppColors.accent,
                      fontSize: 11,
                      letterSpacing: 1.2,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    'Fundamentos de seguros para agentes',
                    style: theme.textTheme.titleLarge?.copyWith(fontSize: 20),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(999),
                    child: LinearProgressIndicator(
                      value: 0.65,
                      minHeight: 8,
                      backgroundColor: Colors.white.withValues(alpha: 0.08),
                      color: AppColors.accent,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '65% completado',
                    style: theme.textTheme.bodyMedium?.copyWith(fontSize: 12),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Align(
                    alignment: Alignment.centerRight,
                    child: Text(
                      'Continuar →',
                      style: theme.textTheme.labelLarge?.copyWith(
                        color: AppColors.accent,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _GridTile extends StatelessWidget {
  const _GridTile({
    required this.label,
    required this.icon,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      onTap: onTap,
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: AppColors.accent, size: 24),
          const SizedBox(height: 12),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  fontSize: 14,
                ),
          ),
        ],
      ),
    );
  }
}

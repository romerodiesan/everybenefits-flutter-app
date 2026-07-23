import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/locale_controller.dart';
import '../../app/pulse_haptics.dart';
import '../../app/theme.dart';
import '../../app/theme_controller.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../app/widgets/role_badge.dart';
import '../../auth/auth.dart';
import '../../l10n/l10n.dart';
import '../../users/users.dart';
import 'admin_promote_screen.dart';
import 'widgets/profile_avatar.dart';

/// Studio-style settings — appearance, language, brand signal, account.
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
    final brand = AppColors.brandOf(context);
    final themeController = ThemeScope.of(context);
    final localeController = LocaleScope.of(context);
    final l10n = context.l10n;

    return PulseScaffold(
      appBar: AppBar(
        title: Text(
          l10n.settingsTitle,
          style: theme.textTheme.headlineMedium?.copyWith(fontSize: 22),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.lg,
          AppSpacing.sm,
          AppSpacing.lg,
          AppSpacing.xl + 24,
        ),
        children: [
          _AccountStrip(
            profile: profile,
            onEdit: onEditProfile,
          ),
          const SizedBox(height: AppSpacing.xl),
          _SectionLabel(label: l10n.settingsAppearance),
          const SizedBox(height: 6),
          Text(
            l10n.settingsThemeHint,
            style: theme.textTheme.bodyMedium?.copyWith(color: colors.muted),
          ),
          const SizedBox(height: AppSpacing.md),
          _ModePicker(
            selected: themeController.mode,
            onChanged: (mode) {
              PulseHaptics.selection();
              themeController.setMode(mode);
            },
          ),
          const SizedBox(height: AppSpacing.xl),
          _SectionLabel(label: l10n.settingsAccentStudio),
          const SizedBox(height: 6),
          Text(
            l10n.settingsAccentHint,
            style: theme.textTheme.bodyMedium?.copyWith(color: colors.muted),
          ),
          const SizedBox(height: AppSpacing.md),
          _AccentRibbon(
            selectedId: themeController.primarySeedId,
            onSelect: (id) {
              PulseHaptics.selection();
              themeController.setPrimarySeed(id);
            },
          ),
          const SizedBox(height: AppSpacing.xl),
          _SectionLabel(label: l10n.settingsPreferences),
          const SizedBox(height: 6),
          Text(
            l10n.settingsLanguageHint,
            style: theme.textTheme.bodyMedium?.copyWith(color: colors.muted),
          ),
          const SizedBox(height: AppSpacing.md),
          _LanguagePicker(
            selected: localeController.locale?.languageCode ?? 'system',
            onChanged: (code) {
              PulseHaptics.selection();
              localeController.setLanguageCode(code);
            },
          ),
          if (profile.role == UserRole.admin) ...[
            const SizedBox(height: AppSpacing.xl),
            _SectionLabel(label: l10n.settingsAdmin),
            const SizedBox(height: 6),
            Text(
              l10n.settingsAdminHint,
              style: theme.textTheme.bodyMedium?.copyWith(color: colors.muted),
            ),
            const SizedBox(height: AppSpacing.md),
            Material(
              color: colors.glassFill,
              borderRadius: BorderRadius.circular(18),
              child: InkWell(
                borderRadius: BorderRadius.circular(18),
                onTap: () {
                  PulseHaptics.light();
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => AdminPromoteScreen(
                        userRepository: userRepository,
                      ),
                    ),
                  );
                },
                child: Ink(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: colors.border),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 16,
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.admin_panel_settings_outlined, color: brand),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            l10n.settingsAdminPromote,
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        Icon(Icons.chevron_right_rounded, color: colors.muted),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
          const SizedBox(height: AppSpacing.xl + 8),
          Divider(color: colors.border),
          const SizedBox(height: AppSpacing.md),
          Text(
            l10n.settingsSignOutHint,
            style: theme.textTheme.bodySmall?.copyWith(color: colors.muted),
          ),
          const SizedBox(height: AppSpacing.sm),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () {
                PulseHaptics.medium();
                authService.signOut();
              },
              style: OutlinedButton.styleFrom(
                foregroundColor: theme.colorScheme.error,
                side: BorderSide(
                  color: theme.colorScheme.error.withValues(alpha: 0.45),
                ),
                minimumSize: const Size.fromHeight(52),
              ),
              child: Text(l10n.settingsSignOut),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Center(
            child: Text(
              'EVERY',
              style: theme.textTheme.labelLarge?.copyWith(
                color: brand.withValues(alpha: 0.55),
                letterSpacing: 4,
                fontWeight: FontWeight.w800,
                fontSize: 11,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Resolves a [PrimarySeed.id] to its localized display label.
String seedLabel(AppLocalizations l10n, String id) {
  switch (id) {
    case 'green':
      return l10n.seedGreen;
    case 'amber':
      return l10n.seedAmber;
    case 'teal':
      return l10n.seedTeal;
    case 'blue':
      return l10n.seedBlue;
    case 'violet':
      return l10n.seedViolet;
    case 'rose':
      return l10n.seedRose;
    default:
      return id;
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Text(
      label.toUpperCase(),
      style: Theme.of(context).textTheme.labelLarge?.copyWith(
            letterSpacing: 1.8,
            fontSize: 11,
            fontWeight: FontWeight.w800,
            color: AppColors.of(context).muted,
          ),
    );
  }
}

class _AccountStrip extends StatelessWidget {
  const _AccountStrip({
    required this.profile,
    required this.onEdit,
  });

  final UserProfile profile;
  final VoidCallback? onEdit;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final l10n = context.l10n;

    return Material(
      color: colors.meshDeep,
      borderRadius: BorderRadius.circular(24),
      child: InkWell(
        onTap: onEdit,
        borderRadius: BorderRadius.circular(24),
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: colors.border),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                brand.withValues(alpha: 0.14),
                colors.meshDeep,
              ],
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                ProfileAvatar(profile: profile, size: 56),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      RoleBadge(role: profile.role),
                      const SizedBox(height: 6),
                      Text(
                        profile.headlineName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        profile.email ?? l10n.settingsNoEmail,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: colors.muted,
                        ),
                      ),
                      if (onEdit != null) ...[
                        const SizedBox(height: 6),
                        Text(
                          l10n.settingsEditAccount,
                          style: theme.textTheme.labelLarge?.copyWith(
                            color: brand,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                if (onEdit != null)
                  Icon(Icons.chevron_right_rounded, color: colors.muted),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ModePicker extends StatelessWidget {
  const _ModePicker({
    required this.selected,
    required this.onChanged,
  });

  final ThemeMode selected;
  final ValueChanged<ThemeMode> onChanged;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Column(
      children: [
        _ChoiceTile(
          selected: selected == ThemeMode.system,
          icon: Icons.brightness_auto_rounded,
          title: l10n.themeModeAuto,
          onTap: () => onChanged(ThemeMode.system),
        ),
        const SizedBox(height: 8),
        _ChoiceTile(
          selected: selected == ThemeMode.light,
          icon: Icons.light_mode_rounded,
          title: l10n.themeModeLight,
          onTap: () => onChanged(ThemeMode.light),
        ),
        const SizedBox(height: 8),
        _ChoiceTile(
          selected: selected == ThemeMode.dark,
          icon: Icons.dark_mode_rounded,
          title: l10n.themeModeDark,
          onTap: () => onChanged(ThemeMode.dark),
        ),
      ],
    );
  }
}

class _LanguagePicker extends StatelessWidget {
  const _LanguagePicker({
    required this.selected,
    required this.onChanged,
  });

  final String selected;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Column(
      children: [
        _ChoiceTile(
          selected: selected == 'system',
          icon: Icons.language_rounded,
          title: l10n.settingsLanguageSystem,
          onTap: () => onChanged('system'),
        ),
        const SizedBox(height: 8),
        _ChoiceTile(
          selected: selected == 'en',
          icon: Icons.translate_rounded,
          title: l10n.settingsLanguageEnglish,
          onTap: () => onChanged('en'),
        ),
        const SizedBox(height: 8),
        _ChoiceTile(
          selected: selected == 'es',
          icon: Icons.translate_rounded,
          title: l10n.settingsLanguageSpanish,
          onTap: () => onChanged('es'),
        ),
      ],
    );
  }
}

class _ChoiceTile extends StatelessWidget {
  const _ChoiceTile({
    required this.selected,
    required this.icon,
    required this.title,
    required this.onTap,
  });

  final bool selected;
  final IconData icon;
  final String title;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);

    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      curve: Curves.easeOutCubic,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: selected ? brand.withValues(alpha: 0.65) : colors.border,
          width: selected ? 1.6 : 1,
        ),
        color: selected ? brand.withValues(alpha: 0.12) : colors.glassFill,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(18),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            child: Row(
              children: [
                Icon(icon, color: selected ? brand : colors.muted),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    title,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: colors.ink,
                    ),
                  ),
                ),
                AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  width: 22,
                  height: 22,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: selected ? brand : colors.border,
                      width: 2,
                    ),
                    color: selected ? brand : Colors.transparent,
                  ),
                  child: selected
                      ? Icon(
                          Icons.check_rounded,
                          size: 14,
                          color: onBrandFor(brand),
                        )
                      : null,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _AccentRibbon extends StatelessWidget {
  const _AccentRibbon({
    required this.selectedId,
    required this.onSelect,
  });

  final String selectedId;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;

    return SizedBox(
      height: 92,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: kPrimarySeeds.length,
        separatorBuilder: (_, _) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          final seed = kPrimarySeeds[index];
          final selected = seed.id == selectedId;
          final label = seedLabel(l10n, seed.id);
          return Semantics(
            button: true,
            selected: selected,
            label: label,
            container: true,
            child: GestureDetector(
              onTap: () => onSelect(seed.id),
              behavior: HitTestBehavior.opaque,
              child: SizedBox(
                width: 72,
                child: Column(
                  children: [
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      width: selected ? 56 : 48,
                      height: selected ? 56 : 48,
                      decoration: BoxDecoration(
                        color: seed.color,
                        borderRadius: BorderRadius.circular(selected ? 20 : 16),
                        border: Border.all(
                          color: selected ? colors.ink : colors.border,
                          width: selected ? 2.5 : 1,
                        ),
                        boxShadow: selected
                            ? [
                                BoxShadow(
                                  color: seed.color.withValues(alpha: 0.4),
                                  blurRadius: 14,
                                  offset: const Offset(0, 6),
                                ),
                              ]
                            : null,
                      ),
                      child: selected
                          ? Icon(
                              Icons.check_rounded,
                              color: onBrandFor(seed.color),
                            )
                          : null,
                    ),
                    const SizedBox(height: 8),
                    ExcludeSemantics(
                      child: Text(
                        label,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.center,
                        style: theme.textTheme.labelLarge?.copyWith(
                          fontSize: 12,
                          fontWeight:
                              selected ? FontWeight.w800 : FontWeight.w600,
                          color: selected ? colors.ink : colors.muted,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

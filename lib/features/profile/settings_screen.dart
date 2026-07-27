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
import '../../privacy/telemetry.dart';
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
          _ThemeModeDropdown(
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
          _LanguageDropdown(
            selected: localeController.locale?.languageCode ?? 'system',
            onChanged: (code) {
              PulseHaptics.selection();
              localeController.setLanguageCode(code);
            },
          ),
          const SizedBox(height: AppSpacing.xl),
          _SectionLabel(label: l10n.settingsPrivacy),
          const SizedBox(height: 6),
          Text(
            l10n.settingsPrivacyHint,
            style: theme.textTheme.bodyMedium?.copyWith(color: colors.muted),
          ),
          const SizedBox(height: AppSpacing.md),
          const _AnalyticsConsentTile(),
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

class _AnalyticsConsentTile extends StatefulWidget {
  const _AnalyticsConsentTile();

  @override
  State<_AnalyticsConsentTile> createState() => _AnalyticsConsentTileState();
}

class _AnalyticsConsentTileState extends State<_AnalyticsConsentTile> {
  bool? _enabled;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    TelemetryPrefs.isAnalyticsEnabled().then((value) {
      if (mounted) setState(() => _enabled = value);
    });
  }

  Future<void> _onChanged(bool next) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _enabled = next;
    });
    PulseHaptics.selection();
    try {
      await TelemetryPrefs.setAnalyticsEnabled(next);
    } catch (_) {
      if (mounted) setState(() => _enabled = !next);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;
    final enabled = _enabled ?? false;

    return Material(
      color: colors.glassFill,
      borderRadius: BorderRadius.circular(18),
      child: Ink(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: colors.border),
        ),
        child: SwitchListTile.adaptive(
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 14,
            vertical: 4,
          ),
          title: Text(
            l10n.settingsAnalytics,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          subtitle: Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              l10n.settingsAnalyticsHint,
              style: theme.textTheme.bodySmall?.copyWith(color: colors.muted),
            ),
          ),
          value: enabled,
          onChanged: _enabled == null || _busy ? null : _onChanged,
        ),
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

class _ThemeModeDropdown extends StatelessWidget {
  const _ThemeModeDropdown({
    required this.selected,
    required this.onChanged,
  });

  final ThemeMode selected;
  final ValueChanged<ThemeMode> onChanged;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return _SettingsDropdown<ThemeMode>(
      value: selected,
      icon: switch (selected) {
        ThemeMode.light => Icons.light_mode_rounded,
        ThemeMode.dark => Icons.dark_mode_rounded,
        ThemeMode.system => Icons.brightness_auto_rounded,
      },
      items: [
        DropdownMenuItem(
          value: ThemeMode.system,
          child: Text(l10n.themeModeAuto),
        ),
        DropdownMenuItem(
          value: ThemeMode.light,
          child: Text(l10n.themeModeLight),
        ),
        DropdownMenuItem(
          value: ThemeMode.dark,
          child: Text(l10n.themeModeDark),
        ),
      ],
      onChanged: (mode) {
        if (mode != null) onChanged(mode);
      },
    );
  }
}

class _LanguageDropdown extends StatelessWidget {
  const _LanguageDropdown({
    required this.selected,
    required this.onChanged,
  });

  final String selected;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return _SettingsDropdown<String>(
      value: selected,
      icon: Icons.language_rounded,
      items: [
        DropdownMenuItem(
          value: 'system',
          child: Text(l10n.settingsLanguageSystem),
        ),
        DropdownMenuItem(
          value: 'en',
          child: Text(l10n.settingsLanguageEnglish),
        ),
        DropdownMenuItem(
          value: 'es',
          child: Text(l10n.settingsLanguageSpanish),
        ),
      ],
      onChanged: (code) {
        if (code != null) onChanged(code);
      },
    );
  }
}

class _SettingsDropdown<T> extends StatelessWidget {
  const _SettingsDropdown({
    required this.value,
    required this.icon,
    required this.items,
    required this.onChanged,
  });

  final T value;
  final IconData icon;
  final List<DropdownMenuItem<T>> items;
  final ValueChanged<T?> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);

    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: colors.border),
        color: colors.glassFill,
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14),
        child: Row(
          children: [
            Icon(icon, color: brand),
            const SizedBox(width: 12),
            Expanded(
              child: DropdownButtonHideUnderline(
                child: DropdownButton<T>(
                  value: value,
                  isExpanded: true,
                  borderRadius: BorderRadius.circular(16),
                  dropdownColor: colors.sheet,
                  icon: Icon(
                    Icons.expand_more_rounded,
                    color: colors.muted,
                  ),
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: colors.ink,
                  ),
                  items: items,
                  onChanged: onChanged,
                ),
              ),
            ),
          ],
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

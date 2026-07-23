import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';

import '../../app/app_spacing.dart';
import '../../app/pulse_haptics.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../app/widgets/role_badge.dart';
import '../../auth/auth.dart';
import '../../l10n/l10n.dart';
import '../../users/users.dart';
import 'edit_profile_screen.dart';
import 'settings_screen.dart';
import 'widgets/profile_avatar.dart';

/// Identity tab — editorial Pulse portrait + dossier of contact details.
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({
    super.key,
    required this.authService,
    required this.userRepository,
    required this.profile,
  });

  final AuthService authService;
  final UserRepository userRepository;
  final UserProfile profile;

  @override
  State<ProfileScreen> createState() => ProfileScreenState();
}

class ProfileScreenState extends State<ProfileScreen> {
  bool _uploading = false;

  Future<void> _pickAvatar() async {
    final l10n = context.l10n;
    final colors = AppColors.of(context);
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: colors.sheet,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(8, 8, 8, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: colors.border,
                    borderRadius: BorderRadius.circular(99),
                  ),
                ),
                ListTile(
                  leading: Icon(
                    Icons.photo_library_outlined,
                    color: AppColors.brandOf(context),
                  ),
                  title: Text(l10n.profilePickGallery),
                  onTap: () => Navigator.pop(context, ImageSource.gallery),
                ),
                ListTile(
                  leading: Icon(
                    Icons.photo_camera_outlined,
                    color: AppColors.brandOf(context),
                  ),
                  title: Text(l10n.profileTakePhoto),
                  onTap: () => Navigator.pop(context, ImageSource.camera),
                ),
              ],
            ),
          ),
        );
      },
    );
    if (source == null || !mounted) return;

    try {
      final file = await ImagePicker().pickImage(
        source: source,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
      );
      if (file == null || !mounted) return;

      setState(() => _uploading = true);
      final bytes = await file.readAsBytes();
      await widget.userRepository.updateAvatar(
        profile: widget.profile,
        bytes: bytes,
      );
    } on PlatformException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(l10n.profilePickImageFailed('${error.message}')),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.profileUploadFailed('$error'))),
      );
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  void openEdit() {
    PulseHaptics.light();
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => EditProfileScreen(
          profile: widget.profile,
          userRepository: widget.userRepository,
        ),
      ),
    );
  }

  void openSupport() {
    PulseHaptics.light();
    final l10n = context.l10n;
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: colors.sheet,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.lg,
              AppSpacing.md,
              AppSpacing.lg,
              AppSpacing.lg,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: colors.border,
                      borderRadius: BorderRadius.circular(99),
                    ),
                  ),
                ),
                Row(
                  children: [
                    Icon(Icons.support_outlined, color: brand),
                    const SizedBox(width: 10),
                    Text(
                      l10n.supportSheetTitle,
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                            fontSize: 22,
                          ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  l10n.supportSheetBody,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: colors.muted,
                        height: 1.4,
                      ),
                ),
                const SizedBox(height: AppSpacing.md),
                SelectableText(
                  l10n.supportSheetEmail,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: brand,
                      ),
                ),
                const SizedBox(height: AppSpacing.lg),
                OutlinedButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text(l10n.supportSheetClose),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _openSettings() {
    PulseHaptics.light();
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => SettingsScreen(
          authService: widget.authService,
          userRepository: widget.userRepository,
          profile: widget.profile,
          onEditProfile: openEdit,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;
    final profile = widget.profile;
    final handle = profile.email?.split('@').first ??
        (profile.uid.length <= 6 ? profile.uid : profile.uid.substring(0, 6));
    final bottomPad = pulseShellListBottomPad(context, hasFab: true);

    return PulseScaffold(
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          SliverToBoxAdapter(
            child: _PulseIdentityHero(
              profile: profile,
              handle: handle,
              uploading: _uploading,
              onAvatarTap: _pickAvatar,
              onEdit: openEdit,
              onSettings: _openSettings,
            ),
          ),
          SliverPadding(
            padding: EdgeInsets.fromLTRB(
              AppSpacing.lg,
              AppSpacing.lg,
              AppSpacing.lg,
              bottomPad,
            ),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                if (profile.isAnonymous) ...[
                  Text(
                    l10n.profileBioGuest,
                    style: theme.textTheme.bodyLarge?.copyWith(
                      height: 1.45,
                      color: colors.ink.withValues(alpha: 0.85),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                ],
                if (profile.photoUrl == null) ...[
                  TextButton.icon(
                    onPressed: _uploading ? null : _pickAvatar,
                    icon: const Icon(Icons.add_a_photo_outlined, size: 18),
                    label: Text(l10n.profileTapToAddPhoto),
                  ),
                ],
                if (_hasDossier(profile)) ...[
                  if (profile.photoUrl == null || profile.isAnonymous)
                    const SizedBox(height: AppSpacing.xl)
                  else
                    const SizedBox(height: AppSpacing.sm),
                  _IdentityDossier(profile: profile),
                ],
                if (profile.role == UserRole.student &&
                    profile.profileCompleted) ...[
                  const SizedBox(height: AppSpacing.lg),
                  Text(
                    l10n.profileRoleLockedHint,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colors.muted,
                      height: 1.4,
                    ),
                  ),
                ],
              ]),
            ),
          ),
        ],
      ),
    );
  }

  bool _hasDossier(UserProfile profile) {
    return profile.fullPhone != null ||
        profile.email != null ||
        profile.agency?.trim().isNotEmpty == true ||
        profile.npn?.trim().isNotEmpty == true ||
        profile.hasAddressDetails;
  }
}

class _PulseIdentityHero extends StatelessWidget {
  const _PulseIdentityHero({
    required this.profile,
    required this.handle,
    required this.uploading,
    required this.onAvatarTap,
    required this.onEdit,
    required this.onSettings,
  });

  final UserProfile profile;
  final String handle;
  final bool uploading;
  final VoidCallback onAvatarTap;
  final VoidCallback onEdit;
  final VoidCallback onSettings;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final l10n = context.l10n;
    final top = MediaQuery.paddingOf(context).top;

    return SizedBox(
      height: 320 + top * 0.35,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    brand.withValues(alpha: 0.22),
                    colors.meshBase,
                    colors.meshDeep.withValues(alpha: 0.9),
                  ],
                  stops: const [0.0, 0.55, 1.0],
                ),
              ),
            ),
          ),
          Positioned(
            right: -40,
            top: top + 20,
            child: IgnorePointer(
              child: Container(
                width: 180,
                height: 180,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: brand.withValues(alpha: 0.18),
                ),
              ),
            ),
          ),
          Positioned(
            left: -60,
            bottom: 40,
            child: IgnorePointer(
              child: Container(
                width: 140,
                height: 140,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: brand.withValues(alpha: 0.10),
                ),
              ),
            ),
          ),
          Positioned(
            top: top + 8,
            left: AppSpacing.md,
            right: AppSpacing.md,
            child: Row(
              children: [
                Text(
                  l10n.profilePulseEyebrow.toUpperCase(),
                  style: theme.textTheme.labelLarge?.copyWith(
                    letterSpacing: 2.2,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: colors.ink.withValues(alpha: 0.7),
                  ),
                ),
                const Spacer(),
                IconButton(
                  tooltip: l10n.profileSettingsTooltip,
                  onPressed: onSettings,
                  style: IconButton.styleFrom(
                    backgroundColor: colors.glassFill.withValues(alpha: 0.7),
                    foregroundColor: colors.ink,
                  ),
                  icon: const Icon(Icons.settings_outlined),
                ),
              ],
            ),
          ),
          Positioned(
            left: AppSpacing.lg,
            right: AppSpacing.lg,
            bottom: 28,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                ProfileAvatar(
                  profile: profile,
                  size: 108,
                  busy: uploading,
                  showEditBadge: true,
                  onTap: onAvatarTap,
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      RoleBadge(role: profile.role),
                      const SizedBox(height: 8),
                      Text(
                        profile.headlineName,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.headlineMedium?.copyWith(
                          fontSize: 28,
                          height: 1.05,
                          letterSpacing: -0.8,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '@$handle',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: colors.muted,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 10),
                      TextButton(
                        onPressed: onEdit,
                        style: TextButton.styleFrom(
                          foregroundColor: brand,
                          padding: EdgeInsets.zero,
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: Text(l10n.fabEditProfile),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Vertical identity file — labeled rows with a brand spine, not chip soup.
class _IdentityDossier extends StatelessWidget {
  const _IdentityDossier({required this.profile});

  final UserProfile profile;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    final l10n = context.l10n;

    final rows = <({String label, String value})>[
      if (profile.email != null)
        (label: l10n.profileDetailEmail, value: profile.email!),
      if (profile.fullPhone != null)
        (label: l10n.profileDetailPhone, value: profile.fullPhone!),
      if (profile.agency?.trim().isNotEmpty == true)
        (label: l10n.profileDetailAgency, value: profile.agency!.trim()),
      if (profile.npn?.trim().isNotEmpty == true)
        (label: l10n.profileDetailNpn, value: profile.npn!.trim()),
      if (profile.formattedAddress != null)
        (
          label: l10n.profileDetailAddress,
          value: profile.formattedAddress!,
        ),
    ];

    if (rows.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          l10n.profileDossierEyebrow.toUpperCase(),
          style: theme.textTheme.labelLarge?.copyWith(
            color: colors.muted,
            letterSpacing: 1.6,
            fontSize: 11,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: colors.border),
            color: colors.meshDeep.withValues(alpha: 0.55),
          ),
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  width: 4,
                  decoration: BoxDecoration(
                    color: brand,
                    borderRadius: const BorderRadius.horizontal(
                      left: Radius.circular(22),
                    ),
                  ),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                    child: Column(
                      children: [
                        for (var i = 0; i < rows.length; i++) ...[
                          if (i > 0)
                            Divider(
                              height: 1,
                              color: colors.border.withValues(alpha: 0.7),
                            ),
                          _DossierRow(
                            label: rows[i].label,
                            value: rows[i].value,
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _DossierRow extends StatelessWidget {
  const _DossierRow({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 88,
            child: Text(
              label.toUpperCase(),
              style: theme.textTheme.labelSmall?.copyWith(
                color: brand,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.7,
                fontSize: 10,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
                height: 1.3,
                color: colors.ink,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

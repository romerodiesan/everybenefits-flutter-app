import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';

import '../../../app/app_spacing.dart';
import '../../../app/layout/pulse_adaptive_sheet.dart';
import '../../../app/theme.dart';
import '../../../l10n/l10n.dart';
import '../../../users/social_repository.dart';
import '../../../users/user_profile.dart';
import '../../../users/user_role.dart';
import 'profile_avatar.dart';

const kPulseWebOrigin = String.fromEnvironment(
  'PULSE_WEB_URL',
  defaultValue: 'https://pulse.everybenefits.us',
);

String memberSharePath(UserProfile person) {
  if (person.hasUsername) return '/members/${person.username}';
  return '/members/${person.uid}';
}

String memberShareUrl(BuildContext context, UserProfile person) {
  final locale = Localizations.localeOf(context).languageCode;
  final code = locale == 'es' ? 'es' : 'en';
  return '$kPulseWebOrigin/$code${memberSharePath(person)}';
}

Future<void> sharePublicProfile(BuildContext context, UserProfile person) async {
  final l10n = context.l10n;
  final url = memberShareUrl(context, person);
  try {
    await SharePlus.instance.share(ShareParams(text: url, uri: Uri.parse(url)));
  } catch (_) {
    await Clipboard.setData(ClipboardData(text: url));
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(l10n.profileLinkCopied)),
    );
  }
}

class ProfileAboutSection extends StatelessWidget {
  const ProfileAboutSection({
    super.key,
    required this.person,
    this.showLocation = true,
    this.bottomPad = 24,
  });

  final UserProfile person;
  final bool showLocation;
  final double bottomPad;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final location = showLocation ? person.publicLocation : null;
    final locale = Localizations.localeOf(context);
    final joined = DateFormat.yMMMM(locale.toString()).format(person.createdAt.toLocal());

    return Padding(
      padding: EdgeInsets.fromLTRB(
        AppSpacing.lg,
        AppSpacing.md,
        AppSpacing.lg,
        bottomPad,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _AboutBlock(value: roleLabelForId(person.roleId, l10n)),
          if (person.agency?.trim().isNotEmpty == true)
            _AboutBlock(
              kicker: l10n.fieldAgency,
              value: person.agency!.trim(),
            ),
          if (location != null) _AboutBlock(value: location),
          _AboutBlock(value: l10n.profileJoined(joined)),
          if (person.bio?.trim().isNotEmpty == true)
            _AboutBlock(value: person.bio!.trim(), body: true),
        ],
      ),
    );
  }
}

class _AboutBlock extends StatelessWidget {
  const _AboutBlock({
    required this.value,
    this.kicker,
    this.body = false,
  });

  final String value;
  final String? kicker;
  final bool body;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 22),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (kicker != null)
            Text(
              kicker!.toUpperCase(),
              style: theme.textTheme.labelSmall?.copyWith(
                color: colors.muted,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.6,
                fontSize: 11,
              ),
            ),
          if (kicker != null) const SizedBox(height: 4),
          Text(
            value,
            style: body
                ? theme.textTheme.bodyLarge?.copyWith(
                    height: 1.5,
                    fontSize: 17,
                    color: colors.ink,
                  )
                : theme.textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.7,
                    height: 1.15,
                    fontSize: 26,
                    color: colors.ink,
                  ),
          ),
        ],
      ),
    );
  }
}

class ProfileTabBar extends StatelessWidget {
  const ProfileTabBar({
    super.key,
    required this.index,
    required this.onChanged,
  });

  final int index;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(AppSpacing.lg, 20, AppSpacing.lg, 0),
      child: DecoratedBox(
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(color: colors.border),
          ),
        ),
        child: Row(
          children: [
            _Tab(
              label: l10n.profilePosts,
              selected: index == 0,
              color: brand,
              muted: colors.muted,
              onTap: () => onChanged(0),
            ),
            const SizedBox(width: 22),
            _Tab(
              label: l10n.profileAbout,
              selected: index == 1,
              color: brand,
              muted: colors.muted,
              onTap: () => onChanged(1),
            ),
          ],
        ),
      ),
    );
  }
}

class _Tab extends StatelessWidget {
  const _Tab({
    required this.label,
    required this.selected,
    required this.color,
    required this.muted,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final Color color;
  final Color muted;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.only(bottom: 10, top: 4),
        child: Column(
          children: [
            Text(
              label,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontFamily: 'Outfit',
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.4,
                    color: selected ? color : muted,
                  ),
            ),
            const SizedBox(height: 8),
            Container(
              height: 2,
              width: 28,
              color: selected ? color : Colors.transparent,
            ),
          ],
        ),
      ),
    );
  }
}

Future<void> showFollowListSheet({
  required BuildContext context,
  required String title,
  required String empty,
  required Future<List<UserProfile>> Function() load,
  required void Function(UserProfile person) onOpen,
}) async {
  final colors = AppColors.of(context);
  await showPulseSheet<void>(
    context: context,
    backgroundColor: colors.sheet,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (context) {
      return SafeArea(
        child: FutureBuilder<List<UserProfile>>(
          future: load(),
          builder: (context, snap) {
            final items = snap.data ?? const <UserProfile>[];
            return Padding(
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
                  Text(
                    title,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                  const SizedBox(height: 8),
                  if (snap.connectionState != ConnectionState.done)
                    const Padding(
                      padding: EdgeInsets.all(24),
                      child: CircularProgressIndicator(),
                    )
                  else if (items.isEmpty)
                    Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(empty),
                    )
                  else
                    ConstrainedBox(
                      constraints: const BoxConstraints(maxHeight: 360),
                      child: ListView.builder(
                        shrinkWrap: true,
                        itemCount: items.length,
                        itemBuilder: (context, index) {
                          final person = items[index];
                          return ListTile(
                            leading: ProfileAvatar(profile: person, size: 40),
                            title: Text(person.headlineName),
                            subtitle: Text('@${person.handle}'),
                            onTap: () {
                              Navigator.pop(context);
                              onOpen(person);
                            },
                          );
                        },
                      ),
                    ),
                ],
              ),
            );
          },
        ),
      );
    },
  );
}

Future<void> showReportMemberSheet({
  required BuildContext context,
  required Future<void> Function(MemberReportReason reason, String details) onSubmit,
}) async {
  final colors = AppColors.of(context);
  final l10n = context.l10n;
  var reason = MemberReportReason.spam;
  final details = TextEditingController();
  try {
    final submitted = await showPulseSheet<bool>(
      context: context,
      backgroundColor: colors.sheet,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModal) {
            return Padding(
              padding: EdgeInsets.fromLTRB(
                16,
                8,
                16,
                16 + MediaQuery.viewInsetsOf(context).bottom,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: colors.border,
                        borderRadius: BorderRadius.circular(99),
                      ),
                    ),
                  ),
                  Text(
                    l10n.profileReportTitle,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    l10n.profileReportHint,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: colors.muted,
                        ),
                  ),
                  const SizedBox(height: 8),
                  for (final item in MemberReportReason.values)
                    ListTile(
                      dense: true,
                      title: Text(_reasonLabel(l10n, item)),
                      leading: Icon(
                        reason == item
                            ? Icons.radio_button_checked_rounded
                            : Icons.radio_button_off_rounded,
                        color: reason == item
                            ? AppColors.brandOf(context)
                            : colors.muted,
                      ),
                      onTap: () => setModal(() => reason = item),
                    ),
                  TextField(
                    controller: details,
                    maxLength: 500,
                    maxLines: 3,
                    decoration: InputDecoration(
                      labelText: l10n.profileReportDetails,
                    ),
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () => Navigator.pop(context, true),
                      child: Text(l10n.profileReportSubmit),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
    if (submitted == true) {
      await onSubmit(reason, details.text);
    }
  } finally {
    details.dispose();
  }
}

String _reasonLabel(AppLocalizations l10n, MemberReportReason reason) {
  return switch (reason) {
    MemberReportReason.spam => l10n.profileReportSpam,
    MemberReportReason.harassment => l10n.profileReportHarassment,
    MemberReportReason.impersonation => l10n.profileReportImpersonation,
    MemberReportReason.other => l10n.profileReportOther,
  };
}

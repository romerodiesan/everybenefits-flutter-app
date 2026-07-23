import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/pulse_haptics.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../app/widgets/role_badge.dart';
import '../../l10n/l10n.dart';
import '../../users/users.dart';
import 'widgets/profile_avatar.dart';

/// Minimal admin surface: promote students to agents via [UserRoleCallable].
class AdminPromoteScreen extends StatefulWidget {
  const AdminPromoteScreen({
    super.key,
    required this.userRepository,
    this.roleCallable,
  });

  final UserRepository userRepository;
  final UserRoleCallable? roleCallable;

  @override
  State<AdminPromoteScreen> createState() => _AdminPromoteScreenState();
}

class _AdminPromoteScreenState extends State<AdminPromoteScreen> {
  late Future<List<UserProfile>> _future;
  final Set<String> _busyUids = {};

  UserRoleCallable get _callable =>
      widget.roleCallable ?? UserRoleCallable();

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<UserProfile>> _load() async {
    final all = await widget.userRepository.listDirectory(limit: 120);
    return all.where((p) => p.role == UserRole.student).toList();
  }

  Future<void> _promote(UserProfile profile) async {
    final l10n = context.l10n;
    setState(() => _busyUids.add(profile.uid));
    try {
      await _callable.setRole(uid: profile.uid, role: UserRole.agent.wireValue);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.settingsAdminPromoteOk)),
      );
      setState(() {
        _future = _load();
      });
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.settingsAdminPromoteFailed('$error'))),
      );
    } finally {
      if (mounted) {
        setState(() => _busyUids.remove(profile.uid));
      }
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
          l10n.settingsAdmin,
          style: theme.textTheme.headlineMedium?.copyWith(fontSize: 22),
        ),
      ),
      body: FutureBuilder<List<UserProfile>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.lg),
                child: Text(
                  l10n.settingsAdminPromoteFailed('${snapshot.error}'),
                  textAlign: TextAlign.center,
                ),
              ),
            );
          }
          final students = snapshot.data ?? const <UserProfile>[];
          if (students.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.lg),
                child: Text(
                  l10n.settingsAdminEmpty,
                  style: theme.textTheme.bodyLarge?.copyWith(color: colors.muted),
                  textAlign: TextAlign.center,
                ),
              ),
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.lg,
              AppSpacing.sm,
              AppSpacing.lg,
              AppSpacing.xl,
            ),
            itemCount: students.length,
            separatorBuilder: (_, _) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              final profile = students[index];
              final busy = _busyUids.contains(profile.uid);
              return DecoratedBox(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: colors.border),
                  color: colors.glassFill,
                ),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(12, 12, 8, 12),
                  child: Row(
                    children: [
                      ProfileAvatar(profile: profile, size: 48),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              profile.headlineName,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(height: 4),
                            RoleBadge(role: profile.role),
                          ],
                        ),
                      ),
                      TextButton(
                        onPressed: busy
                            ? null
                            : () {
                                PulseHaptics.selection();
                                _promote(profile);
                              },
                        child: busy
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : Text(l10n.settingsAdminPromote),
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}

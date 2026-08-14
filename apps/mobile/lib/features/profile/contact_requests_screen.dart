import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../l10n/l10n.dart';
import '../../users/social_repository.dart';
import '../../users/user_profile.dart';
import 'public_profile_screen.dart';
import 'widgets/profile_avatar.dart';

class ContactRequestsScreen extends StatefulWidget {
  const ContactRequestsScreen({
    super.key,
    required this.profile,
    this.socialRepository,
  });

  final UserProfile profile;
  final SocialRepository? socialRepository;

  @override
  State<ContactRequestsScreen> createState() => _ContactRequestsScreenState();
}

class _ContactRequestsScreenState extends State<ContactRequestsScreen> {
  late final SocialRepository _social =
      widget.socialRepository ?? SocialRepository();
  late Future<List<UserProfile>> _future;

  @override
  void initState() {
    super.initState();
    _future = _social.listIncomingRequests();
  }

  void _reload() {
    setState(() => _future = _social.listIncomingRequests());
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final colors = AppColors.of(context);

    return PulseScaffold(
      appBar: AppBar(title: Text(l10n.memberRequestsTitle)),
      body: FutureBuilder<List<UserProfile>>(
        future: _future,
        builder: (context, snapshot) {
          if (!snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          final people = snapshot.data!;
          if (people.isEmpty) {
            return Center(child: Text(l10n.memberRequestsEmpty));
          }
          return ListView.separated(
            padding: const EdgeInsets.all(AppSpacing.md),
            itemCount: people.length,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              final person = people[index];
              return PulseSheet(
                onTap: () async {
                  await Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => PublicProfileScreen(
                        uid: person.uid,
                        viewer: widget.profile,
                        socialRepository: _social,
                      ),
                    ),
                  );
                  _reload();
                },
                child: Row(
                  children: [
                    ProfileAvatar(
                      profile: person,
                      size: 44,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        person.headlineName,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                    ),
                    Icon(Icons.chevron_right_rounded, color: colors.muted),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }
}

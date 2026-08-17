import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../app/app_spacing.dart';
import '../../app/layout/pulse_adaptive_sheet.dart';
import '../../app/layout/pulse_constrained.dart';
import '../../app/pulse_haptics.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../auth/auth.dart';
import '../../l10n/l10n.dart';
import '../../users/users.dart';
import '../forums/forum_models.dart';
import '../forums/forum_repository.dart';
import '../forums/thread_detail_screen.dart';
import '../notifications/notification_bell_button.dart';
import 'edit_profile_screen.dart';
import 'public_profile_screen.dart';
import 'settings_screen.dart';
import 'widgets/profile_public_extras.dart';
import 'widgets/profile_social_header.dart';

/// Identity tab — social cover, stats, and the member's posts.
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({
    super.key,
    required this.authService,
    required this.userRepository,
    required this.profile,
    this.forumRepository,
    this.notificationUnread = 0,
    this.onOpenNotifications,
  });

  final AuthService authService;
  final UserRepository userRepository;
  final UserProfile profile;
  final ForumRepository? forumRepository;
  final int notificationUnread;
  final VoidCallback? onOpenNotifications;

  @override
  State<ProfileScreen> createState() => ProfileScreenState();
}

class ProfileScreenState extends State<ProfileScreen> {
  bool _uploading = false;
  late final ForumRepository _forums =
      widget.forumRepository ?? ForumRepository();
  final _social = SocialRepository();
  StreamSubscription<ForumThreadPage>? _postsSub;
  List<ForumThread> _threads = const [];
  var _postsLoading = true;
  var _tab = 0;
  UserProfile? _publicCard;

  @override
  void initState() {
    super.initState();
    _listenPosts();
    _loadPublicBadge();
  }

  @override
  void didUpdateWidget(covariant ProfileScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.profile.uid != widget.profile.uid) {
      _listenPosts();
      _loadPublicBadge();
    }
  }

  @override
  void dispose() {
    _postsSub?.cancel();
    super.dispose();
  }

  void _listenPosts() {
    _postsSub?.cancel();
    _postsSub = _forums
        .watchThreads(
          authorId: widget.profile.uid,
          sort: ForumSort.recent,
          limit: 24,
        )
        .listen(
          (page) {
            if (!mounted) return;
            setState(() {
              _threads = page.threads;
              _postsLoading = false;
            });
          },
          onError: (_) {
            if (!mounted) return;
            setState(() => _postsLoading = false);
          },
        );
  }

  Future<void> _loadPublicBadge() async {
    try {
      final card = await _social.fetchPublicProfile(widget.profile.uid);
      if (!mounted) return;
      setState(() => _publicCard = card);
    } catch (_) {
      if (!mounted) return;
      setState(() => _publicCard = null);
    }
  }

  Future<void> _pickAvatar() async {
    final l10n = context.l10n;
    final colors = AppColors.of(context);
    final source = await showPulseSheet<ImageSource>(
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
      final previousUrl = widget.profile.photoUrl;
      final updated = await widget.userRepository.updateAvatar(
        profile: widget.profile,
        bytes: bytes,
      );
      if (previousUrl != null) {
        PaintingBinding.instance.imageCache.evict(NetworkImage(previousUrl));
      }
      if (updated.photoUrl != null) {
        PaintingBinding.instance.imageCache.evict(
          NetworkImage(updated.photoUrl!),
        );
      }
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
          authService: widget.authService,
        ),
      ),
    );
  }

  Future<void> _openSupportEmail() async {
    final l10n = context.l10n;
    final email = l10n.supportSheetEmail;
    final uri = Uri(
      scheme: 'mailto',
      path: email,
      queryParameters: {'subject': l10n.supportSheetEmailSubject},
    );
    // Uri.queryParameters encodes spaces as +; mailto prefers %20.
    final mailto = Uri.parse(uri.toString().replaceAll('+', '%20'));
    try {
      final launched = await launchUrl(
        mailto,
        mode: LaunchMode.externalApplication,
      );
      if (!launched && mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(l10n.supportSheetEmailFailed)));
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(l10n.supportSheetEmailFailed)));
    }
  }

  void openSupport() {
    PulseHaptics.light();
    final l10n = context.l10n;
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);
    showPulseSheet<void>(
      context: context,
      backgroundColor: colors.sheet,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetContext) {
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
                      style: Theme.of(
                        context,
                      ).textTheme.headlineMedium?.copyWith(fontSize: 22),
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
                Align(
                  alignment: Alignment.centerLeft,
                  child: InkWell(
                    onTap: _openSupportEmail,
                    borderRadius: BorderRadius.circular(8),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Text(
                        l10n.supportSheetEmail,
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(
                              fontWeight: FontWeight.w800,
                              color: brand,
                              decoration: TextDecoration.underline,
                              decorationColor: brand,
                            ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                OutlinedButton(
                  onPressed: () => Navigator.pop(sheetContext),
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

  void _openThread(ForumThread thread) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ThreadDetailScreen(
          threadId: thread.id,
          profile: widget.profile,
          forumRepository: _forums,
        ),
      ),
    );
  }

  void _openMember(UserProfile person) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PublicProfileScreen(
          uid: person.uid,
          viewer: widget.profile,
          socialRepository: _social,
          forumRepository: _forums,
        ),
      ),
    );
  }

  Future<void> _openFollowList(bool followers) async {
    final l10n = context.l10n;
    await showFollowListSheet(
      context: context,
      title: followers ? l10n.profileStatFollowers : l10n.profileStatFollowing,
      empty: followers
          ? l10n.profileFollowersEmpty
          : l10n.profileFollowingEmpty,
      load: () => followers
          ? _social.listFollowers(widget.profile.uid)
          : _social.listFollowing(widget.profile.uid),
      onOpen: _openMember,
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final profile = widget.profile.copyWith(
      profileBadge: _publicCard?.profileBadge ?? widget.profile.profileBadge,
      followerCount: _publicCard?.followerCount ?? widget.profile.followerCount,
      followingCount:
          _publicCard?.followingCount ?? widget.profile.followingCount,
      createdAt: _publicCard?.createdAt ?? widget.profile.createdAt,
    );
    final bottomPad = pulseShellListBottomPad(context, hasFab: true);
    final posts = _threads.length;

    return PulseScaffold(
      body: PulseConstrained(
        maxWidth: PulseContentWidth.feed,
        padding: EdgeInsets.zero,
        child: ListView(
          clipBehavior: Clip.none,
          physics: const BouncingScrollPhysics(),
          padding: EdgeInsets.zero,
          children: [
            ProfileSocialHeader(
              person: profile,
              posts: posts,
              roleLabel: roleLabelForId(profile.roleId, l10n),
              showLocation: profile.showLocationOnProfile,
              followerCount: profile.followerCount,
              followingCount: profile.followingCount,
              onFollowersTap: () => _openFollowList(true),
              onFollowingTap: () => _openFollowList(false),
              avatarBusy: _uploading,
              showEditBadge: true,
              onAvatarTap: _uploading ? null : _pickAvatar,
              onChooseUsername: openEdit,
              topBar: Row(
                children: [
                  const Spacer(),
                  if (widget.onOpenNotifications != null)
                    NotificationBellButton(
                      unreadCount: widget.notificationUnread,
                      onPressed: widget.onOpenNotifications!,
                      style: IconButton.styleFrom(
                        backgroundColor: const Color(0x6B0C0D10),
                        foregroundColor: const Color(0xFFF4F3F0),
                      ),
                    ),
                  IconButton(
                    tooltip: l10n.profileSettingsTooltip,
                    onPressed: _openSettings,
                    style: IconButton.styleFrom(
                      backgroundColor: const Color(0x6B0C0D10),
                      foregroundColor: const Color(0xFFF4F3F0),
                    ),
                    icon: const Icon(Icons.settings_outlined),
                  ),
                ],
              ),
            ),
            ProfileOverlapSheet(
              dock: ProfileDock(
                actions: OutlinedButton(
                  onPressed: openEdit,
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(44),
                  ),
                  child: Text(l10n.fabEditProfile),
                ),
                onShare: () => sharePublicProfile(context, profile),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  ProfileTabBar(
                    index: _tab,
                    onChanged: (value) => setState(() => _tab = value),
                  ),
                  if (_tab == 0)
                    ProfilePostsSection(
                      threads: _threads,
                      loading: _postsLoading,
                      onOpenThread: _openThread,
                      bottomPad: bottomPad,
                    )
                  else
                    ProfileAboutSection(
                      person: profile,
                      showLocation: profile.showLocationOnProfile,
                      bottomPad: bottomPad,
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

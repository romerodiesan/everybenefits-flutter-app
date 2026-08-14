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
import 'settings_screen.dart';
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
  StreamSubscription<ForumThreadPage>? _postsSub;
  List<ForumThread> _threads = const [];
  var _postsLoading = true;

  @override
  void initState() {
    super.initState();
    _listenPosts();
  }

  @override
  void didUpdateWidget(covariant ProfileScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.profile.uid != widget.profile.uid) {
      _listenPosts();
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
        PaintingBinding.instance.imageCache
            .evict(NetworkImage(previousUrl));
      }
      if (updated.photoUrl != null) {
        PaintingBinding.instance.imageCache
            .evict(NetworkImage(updated.photoUrl!));
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
      queryParameters: {
        'subject': l10n.supportSheetEmailSubject,
      },
    );
    // Uri.queryParameters encodes spaces as +; mailto prefers %20.
    final mailto = Uri.parse(uri.toString().replaceAll('+', '%20'));
    try {
      final launched = await launchUrl(
        mailto,
        mode: LaunchMode.externalApplication,
      );
      if (!launched && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.supportSheetEmailFailed)),
        );
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.supportSheetEmailFailed)),
      );
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
                      style: Theme.of(context)
                          .textTheme
                          .headlineMedium
                          ?.copyWith(fontSize: 22),
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
                        style:
                            Theme.of(context).textTheme.titleMedium?.copyWith(
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

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    final l10n = context.l10n;
    final profile = widget.profile;
    final bottomPad = pulseShellListBottomPad(context, hasFab: true);
    final posts = _threads.length;
    final replies = _threads.fold<int>(0, (sum, item) => sum + item.replyCount);
    final likes = _threads.fold<int>(
      0,
      (sum, item) => sum + (item.score < 0 ? 0 : item.score),
    );

    return PulseScaffold(
      body: PulseConstrained(
        maxWidth: PulseContentWidth.feed,
        padding: EdgeInsets.zero,
        child: ListView(
          physics: const BouncingScrollPhysics(),
          padding: EdgeInsets.zero,
          children: [
            ProfileSocialHeader(
              person: profile,
              posts: posts,
              replies: replies,
              likes: likes,
              avatarBusy: _uploading,
              showEditBadge: true,
              onAvatarTap: _uploading ? null : _pickAvatar,
              topBar: Row(
                children: [
                  const Spacer(),
                  if (widget.onOpenNotifications != null)
                    NotificationBellButton(
                      unreadCount: widget.notificationUnread,
                      onPressed: widget.onOpenNotifications!,
                      style: IconButton.styleFrom(
                        backgroundColor:
                            colors.glassFill.withValues(alpha: 0.7),
                        foregroundColor: colors.ink,
                      ),
                    ),
                  IconButton(
                    tooltip: l10n.profileSettingsTooltip,
                    onPressed: _openSettings,
                    style: IconButton.styleFrom(
                      backgroundColor:
                          colors.glassFill.withValues(alpha: 0.7),
                      foregroundColor: colors.ink,
                    ),
                    icon: const Icon(Icons.settings_outlined),
                  ),
                ],
              ),
              actions: OutlinedButton(
                onPressed: openEdit,
                style: OutlinedButton.styleFrom(
                  visualDensity: VisualDensity.compact,
                  minimumSize: const Size(0, 36),
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: Text(l10n.fabEditProfile),
              ),
            ),
            ProfilePostsSection(
              threads: _threads,
              loading: _postsLoading,
              onOpenThread: _openThread,
              bottomPad: bottomPad,
            ),
          ],
        ),
      ),
    );
  }
}

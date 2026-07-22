import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';

import '../../app/app_spacing.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
import '../../auth/auth.dart';
import '../../users/users.dart';
import 'edit_profile_screen.dart';
import 'settings_screen.dart';
import 'widgets/profile_avatar.dart';

/// Minimal profile — identity, edit, settings.
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
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _uploading = false;

  Future<void> _pickAvatar() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: AppColors.of(context).sheet,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.photo_library_outlined),
                title: const Text('Elegir de la galería'),
                onTap: () => Navigator.pop(context, ImageSource.gallery),
              ),
              ListTile(
                leading: const Icon(Icons.photo_camera_outlined),
                title: const Text('Tomar foto'),
                onTap: () => Navigator.pop(context, ImageSource.camera),
              ),
            ],
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
        SnackBar(content: Text('No se pudo elegir imagen: ${error.message}')),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('No se pudo subir la foto: $error')),
      );
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  void _openSettings() {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => SettingsScreen(
          authService: widget.authService,
          userRepository: widget.userRepository,
          profile: widget.profile,
          onEditProfile: _openEdit,
        ),
      ),
    );
  }

  void _openEdit() {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => EditProfileScreen(
          profile: widget.profile,
          userRepository: widget.userRepository,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final profile = widget.profile;
    final handle = profile.email?.split('@').first ??
        (profile.uid.length <= 6 ? profile.uid : profile.uid.substring(0, 6));

    return PulseScaffold(
      appBar: AppBar(
        title: Text(
          'Perfil',
          style: theme.textTheme.headlineMedium?.copyWith(fontSize: 24),
        ),
        actions: [
          IconButton(
            tooltip: 'Ajustes',
            onPressed: _openSettings,
            icon: const Icon(Icons.settings_outlined),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.lg,
          AppSpacing.md,
          AppSpacing.lg,
          AppSpacing.xl,
        ),
        children: [
          Center(
            child: GestureDetector(
              onTap: _uploading ? null : _pickAvatar,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  ProfileAvatar(profile: profile, size: 96, showEditBadge: true),
                  if (_uploading)
                    const SizedBox(
                      width: 28,
                      height: 28,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            profile.headlineName,
            textAlign: TextAlign.center,
            style: theme.textTheme.headlineMedium?.copyWith(fontSize: 26),
          ),
          const SizedBox(height: 4),
          Text(
            '@$handle',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium?.copyWith(color: colors.muted),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            profile.isAnonymous
                ? 'Invitado en Every Insurance. Únete para publicar.'
                : 'Comunidad · Academia · Chats',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyLarge,
          ),
          if (profile.photoUrl == null) ...[
            const SizedBox(height: AppSpacing.sm),
            TextButton(
              onPressed: _pickAvatar,
              child: const Text('Agregar foto de perfil'),
            ),
          ],
          const SizedBox(height: AppSpacing.xl),
          SignalButton(
            label: 'Editar perfil',
            onPressed: _openEdit,
          ),
          const SizedBox(height: AppSpacing.sm),
          OutlinedButton(
            onPressed: _openSettings,
            child: const Text('Ajustes'),
          ),
        ],
      ),
    );
  }
}

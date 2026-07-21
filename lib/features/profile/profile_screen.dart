import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';

import '../../app/app_spacing.dart';
import '../../app/theme.dart';
import '../../auth/auth.dart';
import '../../users/users.dart';
import 'edit_profile_screen.dart';
import 'settings_screen.dart';
import 'widgets/profile_avatar.dart';

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
      backgroundColor: AppColors.meshDeep,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
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
      final needsRebuild = error.code == 'channel-error';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            needsRebuild
                ? 'Reinicia la app por completo (quita y vuelve a abrir) para habilitar la cámara/galería.'
                : 'No se pudo abrir la galería: ${error.message ?? error.code}',
          ),
        ),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('No se pudo actualizar la foto: $error')),
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
          onEditProfile: () {
            Navigator.of(context).pop();
            Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => EditProfileScreen(
                  profile: widget.profile,
                  userRepository: widget.userRepository,
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final profile = widget.profile;

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        title: const Text('Perfil'),
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
          AppSpacing.xl,
          AppSpacing.lg,
          AppSpacing.xl,
        ),
        children: [
          Center(
            child: ProfileAvatar(
              profile: profile,
              size: 120,
              busy: _uploading,
              showEditBadge: true,
              onTap: _pickAvatar,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          TextButton(
            onPressed: _uploading ? null : _pickAvatar,
            child: Text(
              profile.photoUrl == null
                  ? 'Agregar foto de perfil'
                  : 'Cambiar foto de perfil',
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(
            profile.headlineName,
            textAlign: TextAlign.center,
            style: theme.textTheme.headlineMedium,
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            profile.email ?? 'Sin email vinculado',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium,
          ),
          if (profile.isAnonymous) ...[
            const SizedBox(height: AppSpacing.lg),
            Text(
              'Regístrate para completar tu perfil y desbloquear la comunidad.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium,
            ),
          ],
          const SizedBox(height: AppSpacing.xl),
          OutlinedButton(
            onPressed: _openSettings,
            child: const Text('Ajustes'),
          ),
        ],
      ),
    );
  }
}

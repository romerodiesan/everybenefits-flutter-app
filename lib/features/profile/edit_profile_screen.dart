import 'package:flutter/material.dart';

import '../../app/app_spacing.dart';
import '../../app/widgets/mesh_background.dart';
import '../../users/users.dart';
import 'widgets/profile_form_widgets.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({
    super.key,
    required this.profile,
    required this.userRepository,
  });

  final UserProfile profile;
  final UserRepository userRepository;

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  late UserRole _type = widget.profile.role == UserRole.student
      ? UserRole.student
      : UserRole.agent;
  bool _busy = false;

  Future<void> _save(ProfileFormData data) async {
    setState(() => _busy = true);
    try {
      final next = widget.profile.copyWith(
        displayName: data.displayName,
        phoneCountryCode: data.phoneCountryCode,
        phoneNumber: data.phoneNumber,
        role: _type,
        profileCompleted: true,
        npn: data.npn,
        address: data.address,
        agency: data.agency ?? kDefaultAgency,
        clearNpn: _type == UserRole.student,
        clearAddress: _type == UserRole.student,
        clearAgency: _type == UserRole.student,
      );
      await widget.userRepository.updateProfile(next);
      if (!mounted) return;
      Navigator.of(context).pop();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('No se pudo actualizar: $error')),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return MeshBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(title: const Text('Editar perfil')),
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.lg,
              AppSpacing.sm,
              AppSpacing.lg,
              AppSpacing.xl,
            ),
            children: [
              Text(
                'Tipo de cuenta',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: AppSpacing.sm),
              AccountTypeCard(
                title: 'Agente',
                subtitle: 'NPN, dirección y agencia',
                icon: Icons.badge_outlined,
                selected: _type == UserRole.agent,
                onTap: () => setState(() => _type = UserRole.agent),
              ),
              const SizedBox(height: AppSpacing.md),
              AccountTypeCard(
                title: 'Estudiante',
                subtitle: 'Nombre y teléfono',
                icon: Icons.school_outlined,
                selected: _type == UserRole.student,
                onTap: () => setState(() => _type = UserRole.student),
              ),
              const SizedBox(height: AppSpacing.xl),
              ProfileDetailsForm(
                accountType: _type,
                busy: _busy,
                submitLabel: 'Guardar cambios',
                initialName: widget.profile.displayName,
                initialCountryCode: widget.profile.phoneCountryCode,
                initialPhoneNumber: widget.profile.phoneNumber,
                initialNpn: widget.profile.npn,
                initialAddress: widget.profile.address,
                initialAgency: widget.profile.agency ?? kDefaultAgency,
                onSubmit: _save,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';

import '../../app/app_feedback.dart';
import '../../app/app_spacing.dart';
import '../../app/widgets/mesh_background.dart';
import '../../auth/auth.dart';
import '../../users/users.dart';
import 'widgets/profile_form_widgets.dart';

class ProfileCompletionFlow extends StatefulWidget {
  const ProfileCompletionFlow({
    super.key,
    required this.profile,
    required this.userRepository,
    required this.authService,
  });

  final UserProfile profile;
  final UserRepository userRepository;
  final AuthService authService;

  @override
  State<ProfileCompletionFlow> createState() => _ProfileCompletionFlowState();
}

class _ProfileCompletionFlowState extends State<ProfileCompletionFlow> {
  UserRole? _type;
  bool _busy = false;
  int _step = 0;

  Future<void> _save(ProfileFormData data) async {
    final type = _type;
    if (type == null) return;

    setState(() => _busy = true);
    try {
      final completed = widget.profile.copyWith(
        displayName: data.displayName,
        phoneCountryCode: data.phoneCountryCode,
        phoneNumber: data.phoneNumber,
        role: type,
        profileCompleted: true,
        npn: data.npn,
        address: data.address,
        agency: data.agency ?? kDefaultAgency,
        clearNpn: type == UserRole.student,
        clearAddress: type == UserRole.student,
        clearAgency: type == UserRole.student,
      );
      await widget.userRepository.updateProfile(completed);
    } catch (error, stackTrace) {
      if (!mounted) return;
      showAppError(
        context,
        error,
        stackTrace: stackTrace,
        fallbackMessage: 'No se pudo guardar el perfil.',
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return MeshBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: Text(_step == 0 ? 'Tu perfil' : 'Datos personales'),
          actions: [
            TextButton(
              onPressed: _busy ? null : widget.authService.signOut,
              child: const Text('Salir'),
            ),
          ],
        ),
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
                _step == 0
                    ? '¿Cómo participas en Every Insurance?'
                    : 'Completa tu información',
                style: theme.textTheme.headlineMedium,
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                _step == 0
                    ? 'Esto personaliza tu experiencia en la comunidad.'
                    : _type == UserRole.agent
                        ? 'Como agente necesitamos NPN, dirección y agencia.'
                        : 'Como estudiante solo necesitamos contacto básico.',
                style: theme.textTheme.bodyMedium,
              ),
              const SizedBox(height: AppSpacing.xl),
              if (_step == 0) ...[
                AccountTypeCard(
                  title: 'Soy agente',
                  subtitle: 'Licencia / NPN y agencia afiliada',
                  icon: Icons.badge_outlined,
                  selected: _type == UserRole.agent,
                  onTap: () => setState(() => _type = UserRole.agent),
                ),
                const SizedBox(height: AppSpacing.md),
                AccountTypeCard(
                  title: 'Soy estudiante',
                  subtitle: 'Aprendiendo y explorando la universidad',
                  icon: Icons.school_outlined,
                  selected: _type == UserRole.student,
                  onTap: () => setState(() => _type = UserRole.student),
                ),
                const SizedBox(height: AppSpacing.xl),
                FilledButton(
                  onPressed: _type == null
                      ? null
                      : () => setState(() => _step = 1),
                  child: const Text('Continuar'),
                ),
              ] else ...[
                TextButton(
                  onPressed: _busy ? null : () => setState(() => _step = 0),
                  child: const Align(
                    alignment: Alignment.centerLeft,
                    child: Text('← Cambiar tipo de cuenta'),
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                ProfileDetailsForm(
                  accountType: _type!,
                  busy: _busy,
                  submitLabel: 'Finalizar',
                  initialName: widget.profile.displayName,
                  initialCountryCode: widget.profile.phoneCountryCode,
                  initialPhoneNumber: widget.profile.phoneNumber,
                  initialNpn: widget.profile.npn,
                  initialAddress: widget.profile.address,
                  initialAgency: widget.profile.agency ?? kDefaultAgency,
                  onSubmit: _save,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

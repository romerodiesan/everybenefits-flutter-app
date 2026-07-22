import 'package:flutter/material.dart';

import '../../app/app_feedback.dart';
import '../../app/app_spacing.dart';
import '../../app/theme.dart';
import '../../app/widgets/pulse_chrome.dart';
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
    final colors = AppColors.of(context);

    return PulseScaffold(
      appBar: AppBar(
        title: Text(_step == 0 ? 'Tu rol' : 'Tus datos'),
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
            AppSpacing.md,
            AppSpacing.lg,
            AppSpacing.xl,
          ),
          children: [
            if (_step == 0) ...[
              Text(
                '¿Cómo late\ntu Pulse?',
                style: theme.textTheme.displaySmall?.copyWith(fontSize: 34),
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                'Elige cómo participas. Puedes cambiarlo después.',
                style: theme.textTheme.bodyLarge?.copyWith(color: colors.muted),
              ),
              const SizedBox(height: AppSpacing.xl),
              _RoleHeroCard(
                title: 'Soy agente',
                subtitle: 'NPN, agencia y comunidad profesional',
                selected: _type == UserRole.agent,
                onTap: () => setState(() => _type = UserRole.agent),
              ),
              const SizedBox(height: AppSpacing.md),
              _RoleHeroCard(
                title: 'Soy estudiante',
                subtitle: 'Campus, práctica y networking',
                selected: _type == UserRole.student,
                onTap: () => setState(() => _type = UserRole.student),
              ),
              const SizedBox(height: AppSpacing.xl),
              SignalButton(
                label: 'Continuar',
                onPressed: _type == null
                    ? null
                    : () => setState(() => _step = 1),
              ),
            ] else ...[
              TextButton(
                onPressed: _busy ? null : () => setState(() => _step = 0),
                child: const Align(
                  alignment: Alignment.centerLeft,
                  child: Text('← Cambiar rol'),
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                'Cuéntanos un poco más',
                style: theme.textTheme.headlineMedium,
              ),
              const SizedBox(height: AppSpacing.lg),
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
    );
  }
}

class _RoleHeroCard extends StatelessWidget {
  const _RoleHeroCard({
    required this.title,
    required this.subtitle,
    required this.selected,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);

    return PulseSheet(
      onTap: onTap,
      padding: const EdgeInsets.all(20),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: theme.textTheme.headlineMedium?.copyWith(fontSize: 24),
                ),
                const SizedBox(height: 6),
                Text(subtitle, style: theme.textTheme.bodyMedium),
              ],
            ),
          ),
          Icon(
            selected ? Icons.check_circle_rounded : Icons.circle_outlined,
            color: selected ? AppColors.brandOf(context) : colors.muted,
            size: 28,
          ),
        ],
      ),
    );
  }
}

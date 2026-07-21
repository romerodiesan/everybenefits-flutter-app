import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../app/app_spacing.dart';
import '../../../app/theme.dart';
import '../../../app/widgets/glass_card.dart';
import '../../../users/users.dart';

typedef ProfileFormData = ({
  String displayName,
  String phoneCountryCode,
  String phoneNumber,
  String? npn,
  String? address,
  String? agency,
});

class PhoneCountryField extends StatelessWidget {
  const PhoneCountryField({
    super.key,
    required this.country,
    required this.onChanged,
  });

  final PhoneCountry country;
  final ValueChanged<PhoneCountry> onChanged;

  Future<void> _pick(BuildContext context) async {
    final selected = await showModalBottomSheet<PhoneCountry>(
      context: context,
      backgroundColor: AppColors.meshDeep,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return SafeArea(
          child: ListView(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.lg,
                  AppSpacing.lg,
                  AppSpacing.lg,
                  AppSpacing.sm,
                ),
                child: Text(
                  'País / código',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
              for (final item in kPhoneCountries)
                ListTile(
                  leading: Text(item.flag, style: const TextStyle(fontSize: 22)),
                  title: Text(item.name),
                  trailing: Text(
                    item.dialCode,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  onTap: () => Navigator.pop(context, item),
                ),
            ],
          ),
        );
      },
    );
    if (selected != null) onChanged(selected);
  }

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      onPressed: () => _pick(context),
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(112, 56),
        padding: const EdgeInsets.symmetric(horizontal: 12),
      ),
      child: Text(
        '${country.flag} ${country.dialCode}',
        style: Theme.of(context).textTheme.labelLarge,
      ),
    );
  }
}

class ProfileDetailsForm extends StatefulWidget {
  const ProfileDetailsForm({
    super.key,
    required this.accountType,
    required this.onSubmit,
    this.initialName,
    this.initialCountryCode,
    this.initialPhoneNumber,
    this.initialNpn,
    this.initialAddress,
    this.initialAgency,
    this.submitLabel = 'Continuar',
    this.busy = false,
  });

  final UserRole accountType;
  final Future<void> Function(ProfileFormData data) onSubmit;
  final String? initialName;
  final String? initialCountryCode;
  final String? initialPhoneNumber;
  final String? initialNpn;
  final String? initialAddress;
  final String? initialAgency;
  final String submitLabel;
  final bool busy;

  @override
  State<ProfileDetailsForm> createState() => _ProfileDetailsFormState();
}

class _ProfileDetailsFormState extends State<ProfileDetailsForm> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _name;
  late final TextEditingController _phone;
  late final TextEditingController _npn;
  late final TextEditingController _address;
  late final TextEditingController _agency;
  late PhoneCountry _country;

  bool get _isAgent => widget.accountType == UserRole.agent;

  @override
  void initState() {
    super.initState();
    _name = TextEditingController(text: widget.initialName ?? '');
    _phone = TextEditingController(text: widget.initialPhoneNumber ?? '');
    _npn = TextEditingController(text: widget.initialNpn ?? '');
    _address = TextEditingController(text: widget.initialAddress ?? '');
    _agency = TextEditingController(
      text: widget.initialAgency?.trim().isNotEmpty == true
          ? widget.initialAgency!
          : kDefaultAgency,
    );
    _country = phoneCountryByDialCode(widget.initialCountryCode);
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _npn.dispose();
    _address.dispose();
    _agency.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    await widget.onSubmit((
      displayName: _name.text.trim(),
      phoneCountryCode: _country.dialCode,
      phoneNumber: _phone.text.trim(),
      npn: _isAgent ? _npn.text.trim() : null,
      address: _isAgent ? _address.text.trim() : null,
      agency: _isAgent ? _agency.text.trim() : null,
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextFormField(
            controller: _name,
            textCapitalization: TextCapitalization.words,
            textInputAction: TextInputAction.next,
            decoration: const InputDecoration(labelText: 'Nombre completo'),
            validator: (value) {
              if (value == null || value.trim().length < 2) {
                return 'Ingresa tu nombre.';
              }
              return null;
            },
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              PhoneCountryField(
                country: _country,
                onChanged: (country) => setState(() => _country = country),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: TextFormField(
                  controller: _phone,
                  keyboardType: TextInputType.phone,
                  textInputAction:
                      _isAgent ? TextInputAction.next : TextInputAction.done,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                  ],
                  decoration: const InputDecoration(labelText: 'Teléfono'),
                  validator: (value) {
                    if (value == null || value.trim().length < 7) {
                      return 'Número inválido.';
                    }
                    return null;
                  },
                ),
              ),
            ],
          ),
          if (_isAgent) ...[
            const SizedBox(height: AppSpacing.md),
            TextFormField(
              controller: _npn,
              keyboardType: TextInputType.number,
              textInputAction: TextInputAction.next,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: const InputDecoration(
                labelText: 'NPN',
                hintText: 'National Producer Number',
              ),
              validator: (value) {
                if (value == null || value.trim().length < 5) {
                  return 'Ingresa un NPN válido.';
                }
                return null;
              },
            ),
            const SizedBox(height: AppSpacing.md),
            TextFormField(
              controller: _address,
              textCapitalization: TextCapitalization.sentences,
              textInputAction: TextInputAction.next,
              maxLines: 2,
              decoration: const InputDecoration(labelText: 'Dirección'),
              validator: (value) {
                if (value == null || value.trim().length < 5) {
                  return 'Ingresa tu dirección.';
                }
                return null;
              },
            ),
            const SizedBox(height: AppSpacing.md),
            TextFormField(
              controller: _agency,
              textCapitalization: TextCapitalization.words,
              textInputAction: TextInputAction.done,
              decoration: const InputDecoration(
                labelText: 'Agencia',
                helperText: 'Por defecto: Every Benefits',
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Ingresa la agencia.';
                }
                return null;
              },
            ),
          ],
          const SizedBox(height: AppSpacing.xl),
          FilledButton(
            onPressed: widget.busy ? null : _submit,
            child: widget.busy
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(widget.submitLabel),
          ),
        ],
      ),
    );
  }
}

class AccountTypeCard extends StatelessWidget {
  const AccountTypeCard({
    super.key,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return GlassCard(
      onTap: onTap,
      padding: const EdgeInsets.all(20),
      child: Row(
        children: [
          Icon(
            icon,
            color: selected ? AppColors.accent : AppColors.muted,
            size: 28,
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: theme.textTheme.titleLarge),
                const SizedBox(height: 4),
                Text(subtitle, style: theme.textTheme.bodyMedium),
              ],
            ),
          ),
          Icon(
            selected
                ? Icons.check_circle_rounded
                : Icons.circle_outlined,
            color: selected ? AppColors.accent : AppColors.muted,
          ),
        ],
      ),
    );
  }
}

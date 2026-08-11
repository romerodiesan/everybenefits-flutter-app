import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../app/app_spacing.dart';
import '../../../app/theme.dart';
import '../../../app/widgets/glass_card.dart';
import '../../../l10n/l10n.dart';
import '../../../users/users.dart';

typedef ProfileFormData = ({
  String displayName,
  String phoneCountryCode,
  String phoneNumber,
  String? npn,
  String? addressStreet,
  String? addressApt,
  String? addressCity,
  String? addressState,
  String? addressZip,
  String? agency,
});

final _usStatePattern = RegExp(r'^[A-Za-z]{2}$');
final _usZipPattern = RegExp(r'^\d{5}(-\d{4})?$');

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
      backgroundColor: AppColors.of(context).meshDeep,
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
                  context.l10n.countryCodePickerTitle,
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
    this.initialAddressStreet,
    this.initialAddressApt,
    this.initialAddressCity,
    this.initialAddressState,
    this.initialAddressZip,
    this.initialAgency,
    this.submitLabel,
    this.busy = false,
    this.lockName = false,
    this.lockNpn = false,
  });

  final UserRole accountType;
  final Future<void> Function(ProfileFormData data) onSubmit;
  final String? initialName;
  final String? initialCountryCode;
  final String? initialPhoneNumber;
  final String? initialNpn;
  final String? initialAddressStreet;
  final String? initialAddressApt;
  final String? initialAddressCity;
  final String? initialAddressState;
  final String? initialAddressZip;
  final String? initialAgency;
  final String? submitLabel;
  final bool busy;
  final bool lockName;
  final bool lockNpn;

  @override
  State<ProfileDetailsForm> createState() => _ProfileDetailsFormState();
}

class _ProfileDetailsFormState extends State<ProfileDetailsForm> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _givenName;
  late final TextEditingController _familyName;
  late final TextEditingController _phone;
  late final TextEditingController _npn;
  late final TextEditingController _street;
  late final TextEditingController _apt;
  late final TextEditingController _city;
  late final TextEditingController _state;
  late final TextEditingController _zip;
  late final TextEditingController _agency;
  late PhoneCountry _country;

  bool get _isAgent =>
      widget.accountType == UserRole.agent ||
      widget.accountType == UserRole.instructor ||
      widget.accountType == UserRole.admin;

  @override
  void initState() {
    super.initState();
    final parts = splitDisplayName(widget.initialName ?? '');
    _givenName = TextEditingController(text: parts.givenName);
    _familyName = TextEditingController(text: parts.familyName);
    _phone = TextEditingController(text: widget.initialPhoneNumber ?? '');
    _npn = TextEditingController(text: widget.initialNpn ?? '');
    _street = TextEditingController(text: widget.initialAddressStreet ?? '');
    _apt = TextEditingController(text: widget.initialAddressApt ?? '');
    _city = TextEditingController(text: widget.initialAddressCity ?? '');
    _state = TextEditingController(
      text: (widget.initialAddressState ?? '').toUpperCase(),
    );
    _zip = TextEditingController(text: widget.initialAddressZip ?? '');
    _agency = TextEditingController(
      text: widget.initialAgency?.trim().isNotEmpty == true
          ? widget.initialAgency!
          : kDefaultAgency,
    );
    _country = phoneCountryByDialCode(widget.initialCountryCode);
  }

  @override
  void dispose() {
    _givenName.dispose();
    _familyName.dispose();
    _phone.dispose();
    _npn.dispose();
    _street.dispose();
    _apt.dispose();
    _city.dispose();
    _state.dispose();
    _zip.dispose();
    _agency.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final displayName = widget.lockName
        ? (widget.initialName ?? '').trim()
        : composeDisplayName(_givenName.text, _familyName.text);
    await widget.onSubmit((
      displayName: displayName,
      phoneCountryCode: _country.dialCode,
      phoneNumber: _phone.text.trim(),
      npn: _isAgent
          ? (widget.lockNpn
              ? widget.initialNpn?.trim()
              : _npn.text.trim())
          : null,
      addressStreet: _isAgent ? _street.text.trim() : null,
      addressApt: _isAgent
          ? (_apt.text.trim().isEmpty ? null : _apt.text.trim())
          : null,
      addressCity: _isAgent ? _city.text.trim() : null,
      addressState: _isAgent ? _state.text.trim().toUpperCase() : null,
      addressZip: _isAgent ? _zip.text.trim() : null,
      agency: _isAgent ? _agency.text.trim() : null,
    ));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final l10n = context.l10n;

    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            l10n.editProfileBasicsSection.toUpperCase(),
            style: theme.textTheme.labelLarge?.copyWith(
              letterSpacing: 1.6,
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: colors.muted,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          if (widget.lockName)
            _LockedFieldStrip(
              label: l10n.fieldFullName,
              value: widget.initialName?.trim().isNotEmpty == true
                  ? widget.initialName!.trim()
                  : '—',
              hint: l10n.editProfileNameFrozen,
            )
          else ...[
            TextFormField(
              controller: _givenName,
              textCapitalization: TextCapitalization.words,
              textInputAction: TextInputAction.next,
              decoration: InputDecoration(labelText: l10n.fieldGivenName),
              validator: (value) {
                final result = validateGivenName(value ?? '');
                if (result.ok) return null;
                if (result.issue == DisplayNameIssue.emailAsName) {
                  return l10n.validationNameEmail;
                }
                if (result.issue == DisplayNameIssue.tooShort) {
                  return l10n.validationNameShort;
                }
                return l10n.validationName;
              },
            ),
            const SizedBox(height: AppSpacing.sm),
            TextFormField(
              controller: _familyName,
              textCapitalization: TextCapitalization.words,
              textInputAction: TextInputAction.next,
              decoration: InputDecoration(labelText: l10n.fieldFamilyName),
              validator: (value) {
                final result = validateFamilyName(value ?? '');
                if (result.ok) return null;
                if (result.issue == DisplayNameIssue.needLastName) {
                  return l10n.validationNameLast;
                }
                if (result.issue == DisplayNameIssue.tooShort) {
                  return l10n.validationNameShort;
                }
                return l10n.validationName;
              },
            ),
          ],
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
                  decoration: InputDecoration(labelText: l10n.fieldPhone),
                  validator: (value) {
                    if (value == null || value.trim().length < 7) {
                      return l10n.validationPhone;
                    }
                    return null;
                  },
                ),
              ),
            ],
          ),
          if (_isAgent) ...[
            const SizedBox(height: AppSpacing.xl),
            Text(
              l10n.editProfileCredentialsSection.toUpperCase(),
              style: theme.textTheme.labelLarge?.copyWith(
                letterSpacing: 1.6,
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: colors.muted,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            if (widget.lockNpn)
              _LockedFieldStrip(
                label: l10n.fieldNpn,
                value: widget.initialNpn?.trim().isNotEmpty == true
                    ? widget.initialNpn!.trim()
                    : '—',
                hint: l10n.editProfileNpnFrozen,
              )
            else
              TextFormField(
                controller: _npn,
                keyboardType: TextInputType.number,
                textInputAction: TextInputAction.next,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                decoration: InputDecoration(
                  labelText: l10n.fieldNpn,
                  hintText: l10n.fieldNpnHint,
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return l10n.validationNpn;
                  }
                  final digits = value.replaceAll(RegExp(r'\D'), '');
                  if (digits.length < 7 || digits.length > 9) {
                    return l10n.validationNpn;
                  }
                  return null;
                },
              ),
            const SizedBox(height: AppSpacing.md),
            TextFormField(
              controller: _street,
              textCapitalization: TextCapitalization.words,
              textInputAction: TextInputAction.next,
              decoration: InputDecoration(labelText: l10n.fieldAddressStreet),
              validator: (value) {
                if (value == null || value.trim().length < 3) {
                  return l10n.validationAddressStreet;
                }
                return null;
              },
            ),
            const SizedBox(height: AppSpacing.md),
            TextFormField(
              controller: _apt,
              textCapitalization: TextCapitalization.characters,
              textInputAction: TextInputAction.next,
              decoration: InputDecoration(labelText: l10n.fieldAddressApt),
            ),
            const SizedBox(height: AppSpacing.md),
            TextFormField(
              controller: _city,
              textCapitalization: TextCapitalization.words,
              textInputAction: TextInputAction.next,
              decoration: InputDecoration(labelText: l10n.fieldAddressCity),
              validator: (value) {
                if (value == null || value.trim().length < 2) {
                  return l10n.validationAddressCity;
                }
                return null;
              },
            ),
            const SizedBox(height: AppSpacing.md),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 96,
                  child: TextFormField(
                    controller: _state,
                    textCapitalization: TextCapitalization.characters,
                    textInputAction: TextInputAction.next,
                    maxLength: 2,
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(RegExp(r'[A-Za-z]')),
                      LengthLimitingTextInputFormatter(2),
                    ],
                    decoration: InputDecoration(
                      labelText: l10n.fieldAddressState,
                      counterText: '',
                    ),
                    validator: (value) {
                      if (value == null || !_usStatePattern.hasMatch(value.trim())) {
                        return l10n.validationAddressState;
                      }
                      return null;
                    },
                    onChanged: (value) {
                      final upper = value.toUpperCase();
                      if (value != upper) {
                        _state.value = TextEditingValue(
                          text: upper,
                          selection: TextSelection.collapsed(offset: upper.length),
                        );
                      }
                    },
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: TextFormField(
                    controller: _zip,
                    keyboardType: TextInputType.number,
                    textInputAction: TextInputAction.next,
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(RegExp(r'[\d-]')),
                      LengthLimitingTextInputFormatter(10),
                    ],
                    decoration: InputDecoration(labelText: l10n.fieldAddressZip),
                    validator: (value) {
                      if (value == null || !_usZipPattern.hasMatch(value.trim())) {
                        return l10n.validationAddressZip;
                      }
                      return null;
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            TextFormField(
              controller: _agency,
              textCapitalization: TextCapitalization.words,
              textInputAction: TextInputAction.done,
              decoration: InputDecoration(
                labelText: l10n.fieldAgency,
                helperText: l10n.fieldAgencyHelper,
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return l10n.validationAgency;
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
                : Text(widget.submitLabel ?? l10n.actionContinue),
          ),
        ],
      ),
    );
  }
}

class _LockedFieldStrip extends StatelessWidget {
  const _LockedFieldStrip({
    required this.label,
    required this.value,
    required this.hint,
  });

  final String label;
  final String value;
  final String hint;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = AppColors.of(context);
    final brand = AppColors.brandOf(context);

    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colors.border),
        color: colors.glassFill.withValues(alpha: 0.55),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label.toUpperCase(),
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: brand,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.7,
                      fontSize: 10,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    value,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    hint,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colors.muted,
                      height: 1.3,
                    ),
                  ),
                ],
              ),
            ),
            Icon(Icons.lock_outline_rounded, color: colors.muted, size: 18),
          ],
        ),
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
            color: selected
                ? AppColors.brandOf(context)
                : AppColors.of(context).muted,
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
            selected ? Icons.check_circle_rounded : Icons.circle_outlined,
            color: selected
                ? AppColors.brandOf(context)
                : AppColors.of(context).muted,
          ),
        ],
      ),
    );
  }
}

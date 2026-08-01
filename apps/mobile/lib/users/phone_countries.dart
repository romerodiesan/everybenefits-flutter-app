class PhoneCountry {
  const PhoneCountry({
    required this.name,
    required this.dialCode,
    required this.flag,
  });

  final String name;
  final String dialCode;
  final String flag;

  String get label => '$flag  $name ($dialCode)';
}

const List<PhoneCountry> kPhoneCountries = [
  PhoneCountry(name: 'Costa Rica', dialCode: '+506', flag: '🇨🇷'),
  PhoneCountry(name: 'Estados Unidos', dialCode: '+1', flag: '🇺🇸'),
  PhoneCountry(name: 'México', dialCode: '+52', flag: '🇲🇽'),
  PhoneCountry(name: 'Colombia', dialCode: '+57', flag: '🇨🇴'),
  PhoneCountry(name: 'Panamá', dialCode: '+507', flag: '🇵🇦'),
  PhoneCountry(name: 'Guatemala', dialCode: '+502', flag: '🇬🇹'),
  PhoneCountry(name: 'El Salvador', dialCode: '+503', flag: '🇸🇻'),
  PhoneCountry(name: 'Honduras', dialCode: '+504', flag: '🇭🇳'),
  PhoneCountry(name: 'Nicaragua', dialCode: '+505', flag: '🇳🇮'),
  PhoneCountry(name: 'República Dominicana', dialCode: '+1', flag: '🇩🇴'),
  PhoneCountry(name: 'España', dialCode: '+34', flag: '🇪🇸'),
  PhoneCountry(name: 'Argentina', dialCode: '+54', flag: '🇦🇷'),
  PhoneCountry(name: 'Chile', dialCode: '+56', flag: '🇨🇱'),
  PhoneCountry(name: 'Perú', dialCode: '+51', flag: '🇵🇪'),
  PhoneCountry(name: 'Ecuador', dialCode: '+593', flag: '🇪🇨'),
];

PhoneCountry phoneCountryByDialCode(String? dialCode) {
  return kPhoneCountries.firstWhere(
    (country) => country.dialCode == dialCode,
    orElse: () => kPhoneCountries.first,
  );
}

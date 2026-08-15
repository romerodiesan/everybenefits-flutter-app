class PhoneCountry {
  const PhoneCountry({
    required this.iso2,
    required this.name,
    required this.dialCode,
    required this.flag,
  });

  final String iso2;
  final String name;
  final String dialCode;
  final String flag;

  String get label => '$flag  $name ($dialCode)';
}

const List<PhoneCountry> kPhoneCountries = [
  PhoneCountry(iso2: 'CR', name: 'Costa Rica', dialCode: '+506', flag: '🇨🇷'),
  PhoneCountry(iso2: 'US', name: 'Estados Unidos', dialCode: '+1', flag: '🇺🇸'),
  PhoneCountry(iso2: 'MX', name: 'México', dialCode: '+52', flag: '🇲🇽'),
  PhoneCountry(iso2: 'CO', name: 'Colombia', dialCode: '+57', flag: '🇨🇴'),
  PhoneCountry(iso2: 'PA', name: 'Panamá', dialCode: '+507', flag: '🇵🇦'),
  PhoneCountry(iso2: 'GT', name: 'Guatemala', dialCode: '+502', flag: '🇬🇹'),
  PhoneCountry(iso2: 'SV', name: 'El Salvador', dialCode: '+503', flag: '🇸🇻'),
  PhoneCountry(iso2: 'HN', name: 'Honduras', dialCode: '+504', flag: '🇭🇳'),
  PhoneCountry(iso2: 'NI', name: 'Nicaragua', dialCode: '+505', flag: '🇳🇮'),
  PhoneCountry(iso2: 'DO', name: 'República Dominicana', dialCode: '+1', flag: '🇩🇴'),
  PhoneCountry(iso2: 'ES', name: 'España', dialCode: '+34', flag: '🇪🇸'),
  PhoneCountry(iso2: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷'),
  PhoneCountry(iso2: 'CL', name: 'Chile', dialCode: '+56', flag: '🇨🇱'),
  PhoneCountry(iso2: 'PE', name: 'Perú', dialCode: '+51', flag: '🇵🇪'),
  PhoneCountry(iso2: 'EC', name: 'Ecuador', dialCode: '+593', flag: '🇪🇨'),
  PhoneCountry(iso2: 'BR', name: 'Brasil', dialCode: '+55', flag: '🇧🇷'),
  PhoneCountry(iso2: 'UY', name: 'Uruguay', dialCode: '+598', flag: '🇺🇾'),
  PhoneCountry(iso2: 'PY', name: 'Paraguay', dialCode: '+595', flag: '🇵🇾'),
  PhoneCountry(iso2: 'BO', name: 'Bolivia', dialCode: '+591', flag: '🇧🇴'),
  PhoneCountry(iso2: 'VE', name: 'Venezuela', dialCode: '+58', flag: '🇻🇪'),
  PhoneCountry(iso2: 'CA', name: 'Canadá', dialCode: '+1', flag: '🇨🇦'),
  PhoneCountry(iso2: 'PR', name: 'Puerto Rico', dialCode: '+1', flag: '🇵🇷'),
  PhoneCountry(iso2: 'AF', name: 'Afganistán', dialCode: '+93', flag: '🇦🇫'),
  PhoneCountry(iso2: 'AL', name: 'Albania', dialCode: '+355', flag: '🇦🇱'),
  PhoneCountry(iso2: 'DZ', name: 'Argelia', dialCode: '+213', flag: '🇩🇿'),
  PhoneCountry(iso2: 'AD', name: 'Andorra', dialCode: '+376', flag: '🇦🇩'),
  PhoneCountry(iso2: 'AO', name: 'Angola', dialCode: '+244', flag: '🇦🇴'),
  PhoneCountry(iso2: 'AM', name: 'Armenia', dialCode: '+374', flag: '🇦🇲'),
  PhoneCountry(iso2: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺'),
  PhoneCountry(iso2: 'AT', name: 'Austria', dialCode: '+43', flag: '🇦🇹'),
  PhoneCountry(iso2: 'AZ', name: 'Azerbaiyán', dialCode: '+994', flag: '🇦🇿'),
  PhoneCountry(iso2: 'BS', name: 'Bahamas', dialCode: '+1', flag: '🇧🇸'),
  PhoneCountry(iso2: 'BH', name: 'Baréin', dialCode: '+973', flag: '🇧🇭'),
  PhoneCountry(iso2: 'BD', name: 'Bangladés', dialCode: '+880', flag: '🇧🇩'),
  PhoneCountry(iso2: 'BB', name: 'Barbados', dialCode: '+1', flag: '🇧🇧'),
  PhoneCountry(iso2: 'BY', name: 'Bielorrusia', dialCode: '+375', flag: '🇧🇾'),
  PhoneCountry(iso2: 'BE', name: 'Bélgica', dialCode: '+32', flag: '🇧🇪'),
  PhoneCountry(iso2: 'BZ', name: 'Belice', dialCode: '+501', flag: '🇧🇿'),
  PhoneCountry(iso2: 'BJ', name: 'Benín', dialCode: '+229', flag: '🇧🇯'),
  PhoneCountry(iso2: 'BA', name: 'Bosnia y Herzegovina', dialCode: '+387', flag: '🇧🇦'),
  PhoneCountry(iso2: 'BW', name: 'Botsuana', dialCode: '+267', flag: '🇧🇼'),
  PhoneCountry(iso2: 'BN', name: 'Brunéi', dialCode: '+673', flag: '🇧🇳'),
  PhoneCountry(iso2: 'BG', name: 'Bulgaria', dialCode: '+359', flag: '🇧🇬'),
  PhoneCountry(iso2: 'BF', name: 'Burkina Faso', dialCode: '+226', flag: '🇧🇫'),
  PhoneCountry(iso2: 'BI', name: 'Burundi', dialCode: '+257', flag: '🇧🇮'),
  PhoneCountry(iso2: 'KH', name: 'Camboya', dialCode: '+855', flag: '🇰🇭'),
  PhoneCountry(iso2: 'CM', name: 'Camerún', dialCode: '+237', flag: '🇨🇲'),
  PhoneCountry(iso2: 'CV', name: 'Cabo Verde', dialCode: '+238', flag: '🇨🇻'),
  PhoneCountry(iso2: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳'),
  PhoneCountry(iso2: 'KM', name: 'Comoras', dialCode: '+269', flag: '🇰🇲'),
  PhoneCountry(iso2: 'CG', name: 'Congo', dialCode: '+242', flag: '🇨🇬'),
  PhoneCountry(iso2: 'CD', name: 'Congo (RDC)', dialCode: '+243', flag: '🇨🇩'),
  PhoneCountry(iso2: 'CI', name: 'Costa de Marfil', dialCode: '+225', flag: '🇨🇮'),
  PhoneCountry(iso2: 'HR', name: 'Croacia', dialCode: '+385', flag: '🇭🇷'),
  PhoneCountry(iso2: 'CU', name: 'Cuba', dialCode: '+53', flag: '🇨🇺'),
  PhoneCountry(iso2: 'CY', name: 'Chipre', dialCode: '+357', flag: '🇨🇾'),
  PhoneCountry(iso2: 'CZ', name: 'Chequia', dialCode: '+420', flag: '🇨🇿'),
  PhoneCountry(iso2: 'DK', name: 'Dinamarca', dialCode: '+45', flag: '🇩🇰'),
  PhoneCountry(iso2: 'DJ', name: 'Yibuti', dialCode: '+253', flag: '🇩🇯'),
  PhoneCountry(iso2: 'EG', name: 'Egipto', dialCode: '+20', flag: '🇪🇬'),
  PhoneCountry(iso2: 'GQ', name: 'Guinea Ecuatorial', dialCode: '+240', flag: '🇬🇶'),
  PhoneCountry(iso2: 'EE', name: 'Estonia', dialCode: '+372', flag: '🇪🇪'),
  PhoneCountry(iso2: 'SZ', name: 'Esuatini', dialCode: '+268', flag: '🇸🇿'),
  PhoneCountry(iso2: 'ET', name: 'Etiopía', dialCode: '+251', flag: '🇪🇹'),
  PhoneCountry(iso2: 'FJ', name: 'Fiyi', dialCode: '+679', flag: '🇫🇯'),
  PhoneCountry(iso2: 'FI', name: 'Finlandia', dialCode: '+358', flag: '🇫🇮'),
  PhoneCountry(iso2: 'FR', name: 'Francia', dialCode: '+33', flag: '🇫🇷'),
  PhoneCountry(iso2: 'GA', name: 'Gabón', dialCode: '+241', flag: '🇬🇦'),
  PhoneCountry(iso2: 'GM', name: 'Gambia', dialCode: '+220', flag: '🇬🇲'),
  PhoneCountry(iso2: 'GE', name: 'Georgia', dialCode: '+995', flag: '🇬🇪'),
  PhoneCountry(iso2: 'DE', name: 'Alemania', dialCode: '+49', flag: '🇩🇪'),
  PhoneCountry(iso2: 'GH', name: 'Ghana', dialCode: '+233', flag: '🇬🇭'),
  PhoneCountry(iso2: 'GR', name: 'Grecia', dialCode: '+30', flag: '🇬🇷'),
  PhoneCountry(iso2: 'GN', name: 'Guinea', dialCode: '+224', flag: '🇬🇳'),
  PhoneCountry(iso2: 'GY', name: 'Guyana', dialCode: '+592', flag: '🇬🇾'),
  PhoneCountry(iso2: 'HT', name: 'Haití', dialCode: '+509', flag: '🇭🇹'),
  PhoneCountry(iso2: 'HK', name: 'Hong Kong', dialCode: '+852', flag: '🇭🇰'),
  PhoneCountry(iso2: 'HU', name: 'Hungría', dialCode: '+36', flag: '🇭🇺'),
  PhoneCountry(iso2: 'IS', name: 'Islandia', dialCode: '+354', flag: '🇮🇸'),
  PhoneCountry(iso2: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳'),
  PhoneCountry(iso2: 'ID', name: 'Indonesia', dialCode: '+62', flag: '🇮🇩'),
  PhoneCountry(iso2: 'IR', name: 'Irán', dialCode: '+98', flag: '🇮🇷'),
  PhoneCountry(iso2: 'IQ', name: 'Irak', dialCode: '+964', flag: '🇮🇶'),
  PhoneCountry(iso2: 'IE', name: 'Irlanda', dialCode: '+353', flag: '🇮🇪'),
  PhoneCountry(iso2: 'IL', name: 'Israel', dialCode: '+972', flag: '🇮🇱'),
  PhoneCountry(iso2: 'IT', name: 'Italia', dialCode: '+39', flag: '🇮🇹'),
  PhoneCountry(iso2: 'JM', name: 'Jamaica', dialCode: '+1', flag: '🇯🇲'),
  PhoneCountry(iso2: 'JP', name: 'Japón', dialCode: '+81', flag: '🇯🇵'),
  PhoneCountry(iso2: 'JO', name: 'Jordania', dialCode: '+962', flag: '🇯🇴'),
  PhoneCountry(iso2: 'KZ', name: 'Kazajistán', dialCode: '+7', flag: '🇰🇿'),
  PhoneCountry(iso2: 'KE', name: 'Kenia', dialCode: '+254', flag: '🇰🇪'),
  PhoneCountry(iso2: 'KW', name: 'Kuwait', dialCode: '+965', flag: '🇰🇼'),
  PhoneCountry(iso2: 'KG', name: 'Kirguistán', dialCode: '+996', flag: '🇰🇬'),
  PhoneCountry(iso2: 'LA', name: 'Laos', dialCode: '+856', flag: '🇱🇦'),
  PhoneCountry(iso2: 'LV', name: 'Letonia', dialCode: '+371', flag: '🇱🇻'),
  PhoneCountry(iso2: 'LB', name: 'Líbano', dialCode: '+961', flag: '🇱🇧'),
  PhoneCountry(iso2: 'LY', name: 'Libia', dialCode: '+218', flag: '🇱🇾'),
  PhoneCountry(iso2: 'LT', name: 'Lituania', dialCode: '+370', flag: '🇱🇹'),
  PhoneCountry(iso2: 'LU', name: 'Luxemburgo', dialCode: '+352', flag: '🇱🇺'),
  PhoneCountry(iso2: 'MO', name: 'Macao', dialCode: '+853', flag: '🇲🇴'),
  PhoneCountry(iso2: 'MG', name: 'Madagascar', dialCode: '+261', flag: '🇲🇬'),
  PhoneCountry(iso2: 'MW', name: 'Malaui', dialCode: '+265', flag: '🇲🇼'),
  PhoneCountry(iso2: 'MY', name: 'Malasia', dialCode: '+60', flag: '🇲🇾'),
  PhoneCountry(iso2: 'MV', name: 'Maldivas', dialCode: '+960', flag: '🇲🇻'),
  PhoneCountry(iso2: 'ML', name: 'Malí', dialCode: '+223', flag: '🇲🇱'),
  PhoneCountry(iso2: 'MT', name: 'Malta', dialCode: '+356', flag: '🇲🇹'),
  PhoneCountry(iso2: 'MR', name: 'Mauritania', dialCode: '+222', flag: '🇲🇷'),
  PhoneCountry(iso2: 'MU', name: 'Mauricio', dialCode: '+230', flag: '🇲🇺'),
  PhoneCountry(iso2: 'MD', name: 'Moldavia', dialCode: '+373', flag: '🇲🇩'),
  PhoneCountry(iso2: 'MC', name: 'Mónaco', dialCode: '+377', flag: '🇲🇨'),
  PhoneCountry(iso2: 'MN', name: 'Mongolia', dialCode: '+976', flag: '🇲🇳'),
  PhoneCountry(iso2: 'ME', name: 'Montenegro', dialCode: '+382', flag: '🇲🇪'),
  PhoneCountry(iso2: 'MA', name: 'Marruecos', dialCode: '+212', flag: '🇲🇦'),
  PhoneCountry(iso2: 'MZ', name: 'Mozambique', dialCode: '+258', flag: '🇲🇿'),
  PhoneCountry(iso2: 'MM', name: 'Myanmar', dialCode: '+95', flag: '🇲🇲'),
  PhoneCountry(iso2: 'NA', name: 'Namibia', dialCode: '+264', flag: '🇳🇦'),
  PhoneCountry(iso2: 'NP', name: 'Nepal', dialCode: '+977', flag: '🇳🇵'),
  PhoneCountry(iso2: 'NL', name: 'Países Bajos', dialCode: '+31', flag: '🇳🇱'),
  PhoneCountry(iso2: 'NZ', name: 'Nueva Zelanda', dialCode: '+64', flag: '🇳🇿'),
  PhoneCountry(iso2: 'NE', name: 'Níger', dialCode: '+227', flag: '🇳🇪'),
  PhoneCountry(iso2: 'NG', name: 'Nigeria', dialCode: '+234', flag: '🇳🇬'),
  PhoneCountry(iso2: 'KP', name: 'Corea del Norte', dialCode: '+850', flag: '🇰🇵'),
  PhoneCountry(iso2: 'MK', name: 'Macedonia del Norte', dialCode: '+389', flag: '🇲🇰'),
  PhoneCountry(iso2: 'NO', name: 'Noruega', dialCode: '+47', flag: '🇳🇴'),
  PhoneCountry(iso2: 'OM', name: 'Omán', dialCode: '+968', flag: '🇴🇲'),
  PhoneCountry(iso2: 'PK', name: 'Pakistán', dialCode: '+92', flag: '🇵🇰'),
  PhoneCountry(iso2: 'PS', name: 'Palestina', dialCode: '+970', flag: '🇵🇸'),
  PhoneCountry(iso2: 'PG', name: 'Papúa Nueva Guinea', dialCode: '+675', flag: '🇵🇬'),
  PhoneCountry(iso2: 'PH', name: 'Filipinas', dialCode: '+63', flag: '🇵🇭'),
  PhoneCountry(iso2: 'PL', name: 'Polonia', dialCode: '+48', flag: '🇵🇱'),
  PhoneCountry(iso2: 'PT', name: 'Portugal', dialCode: '+351', flag: '🇵🇹'),
  PhoneCountry(iso2: 'QA', name: 'Catar', dialCode: '+974', flag: '🇶🇦'),
  PhoneCountry(iso2: 'RO', name: 'Rumanía', dialCode: '+40', flag: '🇷🇴'),
  PhoneCountry(iso2: 'RU', name: 'Rusia', dialCode: '+7', flag: '🇷🇺'),
  PhoneCountry(iso2: 'RW', name: 'Ruanda', dialCode: '+250', flag: '🇷🇼'),
  PhoneCountry(iso2: 'SA', name: 'Arabia Saudita', dialCode: '+966', flag: '🇸🇦'),
  PhoneCountry(iso2: 'SN', name: 'Senegal', dialCode: '+221', flag: '🇸🇳'),
  PhoneCountry(iso2: 'RS', name: 'Serbia', dialCode: '+381', flag: '🇷🇸'),
  PhoneCountry(iso2: 'SG', name: 'Singapur', dialCode: '+65', flag: '🇸🇬'),
  PhoneCountry(iso2: 'SK', name: 'Eslovaquia', dialCode: '+421', flag: '🇸🇰'),
  PhoneCountry(iso2: 'SI', name: 'Eslovenia', dialCode: '+386', flag: '🇸🇮'),
  PhoneCountry(iso2: 'SO', name: 'Somalia', dialCode: '+252', flag: '🇸🇴'),
  PhoneCountry(iso2: 'ZA', name: 'Sudáfrica', dialCode: '+27', flag: '🇿🇦'),
  PhoneCountry(iso2: 'KR', name: 'Corea del Sur', dialCode: '+82', flag: '🇰🇷'),
  PhoneCountry(iso2: 'SS', name: 'Sudán del Sur', dialCode: '+211', flag: '🇸🇸'),
  PhoneCountry(iso2: 'LK', name: 'Sri Lanka', dialCode: '+94', flag: '🇱🇰'),
  PhoneCountry(iso2: 'SD', name: 'Sudán', dialCode: '+249', flag: '🇸🇩'),
  PhoneCountry(iso2: 'SR', name: 'Surinam', dialCode: '+597', flag: '🇸🇷'),
  PhoneCountry(iso2: 'SE', name: 'Suecia', dialCode: '+46', flag: '🇸🇪'),
  PhoneCountry(iso2: 'CH', name: 'Suiza', dialCode: '+41', flag: '🇨🇭'),
  PhoneCountry(iso2: 'SY', name: 'Siria', dialCode: '+963', flag: '🇸🇾'),
  PhoneCountry(iso2: 'TW', name: 'Taiwán', dialCode: '+886', flag: '🇹🇼'),
  PhoneCountry(iso2: 'TJ', name: 'Tayikistán', dialCode: '+992', flag: '🇹🇯'),
  PhoneCountry(iso2: 'TZ', name: 'Tanzania', dialCode: '+255', flag: '🇹🇿'),
  PhoneCountry(iso2: 'TH', name: 'Tailandia', dialCode: '+66', flag: '🇹🇭'),
  PhoneCountry(iso2: 'TL', name: 'Timor Oriental', dialCode: '+670', flag: '🇹🇱'),
  PhoneCountry(iso2: 'TG', name: 'Togo', dialCode: '+228', flag: '🇹🇬'),
  PhoneCountry(iso2: 'TT', name: 'Trinidad y Tobago', dialCode: '+1', flag: '🇹🇹'),
  PhoneCountry(iso2: 'TN', name: 'Túnez', dialCode: '+216', flag: '🇹🇳'),
  PhoneCountry(iso2: 'TR', name: 'Turquía', dialCode: '+90', flag: '🇹🇷'),
  PhoneCountry(iso2: 'TM', name: 'Turkmenistán', dialCode: '+993', flag: '🇹🇲'),
  PhoneCountry(iso2: 'UG', name: 'Uganda', dialCode: '+256', flag: '🇺🇬'),
  PhoneCountry(iso2: 'UA', name: 'Ucrania', dialCode: '+380', flag: '🇺🇦'),
  PhoneCountry(iso2: 'AE', name: 'Emiratos Árabes Unidos', dialCode: '+971', flag: '🇦🇪'),
  PhoneCountry(iso2: 'GB', name: 'Reino Unido', dialCode: '+44', flag: '🇬🇧'),
  PhoneCountry(iso2: 'UZ', name: 'Uzbekistán', dialCode: '+998', flag: '🇺🇿'),
  PhoneCountry(iso2: 'VN', name: 'Vietnam', dialCode: '+84', flag: '🇻🇳'),
  PhoneCountry(iso2: 'YE', name: 'Yemen', dialCode: '+967', flag: '🇾🇪'),
  PhoneCountry(iso2: 'ZM', name: 'Zambia', dialCode: '+260', flag: '🇿🇲'),
  PhoneCountry(iso2: 'ZW', name: 'Zimbabue', dialCode: '+263', flag: '🇿🇼'),
];

PhoneCountry resolvePhoneCountry({String? iso2, String? dialCode}) {
  final iso = iso2?.trim().toUpperCase() ?? '';
  if (iso.isNotEmpty) {
    for (final country in kPhoneCountries) {
      if (country.iso2 == iso) return country;
    }
  }
  final dial = (dialCode ?? '').trim();
  final withPlus = dial.isEmpty ? '' : (dial.startsWith('+') ? dial : '+$dial');
  return kPhoneCountries.firstWhere(
    (country) => country.dialCode == withPlus,
    orElse: () => kPhoneCountries.first,
  );
}

PhoneCountry phoneCountryByDialCode(String? dialCode) =>
    resolvePhoneCountry(dialCode: dialCode);

List<PhoneCountry> filterPhoneCountries(String query) {
  final q = query.trim().toLowerCase();
  if (q.isEmpty) return kPhoneCountries;
  final digits = q.replaceAll(RegExp(r'\D'), '');
  return kPhoneCountries.where((country) {
    return country.name.toLowerCase().contains(q) ||
        country.iso2.toLowerCase().contains(q) ||
        country.dialCode.contains(q) ||
        (digits.isNotEmpty &&
            country.dialCode.replaceFirst('+', '').contains(digits));
  }).toList();
}

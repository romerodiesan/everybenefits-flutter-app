import 'package:cloud_firestore/cloud_firestore.dart';

import 'avatar_storage.dart';
import 'user_role.dart';

/// Default agency assigned to new agents.
const String kDefaultAgency = 'Every Benefits';

/// Composes a single-line US mailing address for display / legacy `address`.
String? composeUsAddress({
  String? street,
  String? apt,
  String? city,
  String? state,
  String? zip,
}) {
  final s = street?.trim() ?? '';
  final a = apt?.trim() ?? '';
  final c = city?.trim() ?? '';
  final st = (state?.trim() ?? '').toUpperCase();
  final z = zip?.trim() ?? '';

  final line1 = [
    if (s.isNotEmpty) s,
    if (a.isNotEmpty) a,
  ].join(', ');
  final stateZip = [if (st.isNotEmpty) st, if (z.isNotEmpty) z].join(' ');
  final line2 = [
    if (c.isNotEmpty) c,
    if (stateZip.isNotEmpty) stateZip,
  ].join(', ');

  if (line1.isEmpty && line2.isEmpty) return null;
  if (line1.isEmpty) return line2;
  if (line2.isEmpty) return line1;
  return '$line1\n$line2';
}

class UserProfile {
  const UserProfile({
    required this.uid,
    required this.role,
    required this.isAnonymous,
    required this.createdAt,
    required this.updatedAt,
    required this.profileCompleted,
    this.productTourVersion = 0,
    this.email,
    this.displayName,
    this.photoUrl,
    this.phoneCountryCode,
    this.phoneNumber,
    this.phoneVerified = false,
    this.npn,
    this.address,
    this.addressStreet,
    this.addressApt,
    this.addressCity,
    this.addressState,
    this.addressZip,
    this.agency,
  });

  final String uid;
  final String? email;
  final String? displayName;
  final String? photoUrl;
  final UserRole role;
  final bool isAnonymous;
  final bool profileCompleted;
  /// Last product-tour version the user finished or skipped (0 = never).
  final int productTourVersion;
  final String? phoneCountryCode;
  final String? phoneNumber;
  final bool phoneVerified;
  final String? npn;
  /// Legacy / composed display address (kept for compatibility).
  final String? address;
  final String? addressStreet;
  final String? addressApt;
  final String? addressCity;
  final String? addressState;
  final String? addressZip;
  final String? agency;
  final DateTime createdAt;
  final DateTime updatedAt;

  String get initials {
    final source = displayName?.trim().isNotEmpty == true
        ? displayName!
        : (email ?? 'U');
    return source.substring(0, 1).toUpperCase();
  }

  String get headlineName {
    if (displayName?.trim().isNotEmpty == true) return displayName!.trim();
    if (email != null) return email!;
    return isAnonymous ? 'Invitado' : 'Usuario';
  }

  String? get fullPhone {
    final code = phoneCountryCode?.trim();
    final number = phoneNumber?.trim();
    if (code == null || code.isEmpty || number == null || number.isEmpty) {
      return null;
    }
    return '$code$number';
  }

  /// Prefer structured fields; fall back to legacy free-text `address`.
  String? get formattedAddress {
    final composed = composeUsAddress(
      street: effectiveAddressStreet,
      apt: addressApt,
      city: addressCity,
      state: addressState,
      zip: addressZip,
    );
    if (composed != null) return composed;
    final legacy = address?.trim();
    return (legacy == null || legacy.isEmpty) ? null : legacy;
  }

  /// Street for forms: structured first, else legacy blob as street.
  String? get effectiveAddressStreet {
    if (addressStreet?.trim().isNotEmpty == true) return addressStreet!.trim();
    if (_hasStructuredCityStateZip) return null;
    final legacy = address?.trim();
    return (legacy == null || legacy.isEmpty) ? null : legacy;
  }

  bool get _hasStructuredCityStateZip =>
      addressCity?.trim().isNotEmpty == true ||
      addressState?.trim().isNotEmpty == true ||
      addressZip?.trim().isNotEmpty == true;

  bool get hasAddressDetails => formattedAddress != null;

  UserProfile copyWith({
    String? email,
    String? displayName,
    String? photoUrl,
    UserRole? role,
    bool? isAnonymous,
    bool? profileCompleted,
    int? productTourVersion,
    String? phoneCountryCode,
    String? phoneNumber,
    bool? phoneVerified,
    String? npn,
    String? address,
    String? addressStreet,
    String? addressApt,
    String? addressCity,
    String? addressState,
    String? addressZip,
    String? agency,
    DateTime? updatedAt,
    bool clearPhotoUrl = false,
    bool clearNpn = false,
    bool clearAddress = false,
    bool clearAgency = false,
  }) {
    final nextStreet =
        clearAddress ? null : (addressStreet ?? this.addressStreet);
    final nextApt = clearAddress ? null : (addressApt ?? this.addressApt);
    final nextCity = clearAddress ? null : (addressCity ?? this.addressCity);
    final nextState = clearAddress ? null : (addressState ?? this.addressState);
    final nextZip = clearAddress ? null : (addressZip ?? this.addressZip);
    final composed = clearAddress
        ? null
        : (address ??
            composeUsAddress(
              street: nextStreet,
              apt: nextApt,
              city: nextCity,
              state: nextState,
              zip: nextZip,
            ) ??
            this.address);

    return UserProfile(
      uid: uid,
      email: email ?? this.email,
      displayName: displayName ?? this.displayName,
      photoUrl: clearPhotoUrl ? null : (photoUrl ?? this.photoUrl),
      role: role ?? this.role,
      isAnonymous: isAnonymous ?? this.isAnonymous,
      profileCompleted: profileCompleted ?? this.profileCompleted,
      productTourVersion: productTourVersion ?? this.productTourVersion,
      phoneCountryCode: phoneCountryCode ?? this.phoneCountryCode,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      phoneVerified: phoneVerified ?? this.phoneVerified,
      npn: clearNpn ? null : (npn ?? this.npn),
      address: composed,
      addressStreet: nextStreet,
      addressApt: nextApt,
      addressCity: nextCity,
      addressState: nextState,
      addressZip: nextZip,
      agency: clearAgency ? null : (agency ?? this.agency),
      createdAt: createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  Map<String, Object?> toMap() {
    return {
      'uid': uid,
      'email': email,
      'displayName': displayName,
      'photoUrl': photoUrl,
      'role': role.wireValue,
      'isAnonymous': isAnonymous,
      'profileCompleted': profileCompleted,
      'productTourVersion': productTourVersion,
      'phoneCountryCode': phoneCountryCode,
      'phoneNumber': phoneNumber,
      'phoneVerified': phoneVerified,
      'npn': npn,
      'address': address,
      'addressStreet': addressStreet,
      'addressApt': addressApt,
      'addressCity': addressCity,
      'addressState': addressState,
      'addressZip': addressZip,
      'agency': agency,
      'createdAt': createdAt.toUtc().toIso8601String(),
      'updatedAt': updatedAt.toUtc().toIso8601String(),
    };
  }

  factory UserProfile.fromMap(Map<String, dynamic> data) {
    final street = data['addressStreet'] as String?;
    final apt = data['addressApt'] as String?;
    final city = data['addressCity'] as String?;
    final state = data['addressState'] as String?;
    final zip = data['addressZip'] as String?;
    final legacy = data['address'] as String?;
    final composed = composeUsAddress(
          street: street,
          apt: apt,
          city: city,
          state: state,
          zip: zip,
        ) ??
        legacy;

    return UserProfile(
      uid: data['uid'] as String,
      email: data['email'] as String?,
      displayName: data['displayName'] as String?,
      photoUrl: sanitizeOptionalAvatarDownloadUrl(data['photoUrl'] as String?),
      role: UserRole.parse(data['role'] as String?),
      isAnonymous: data['isAnonymous'] as bool? ?? false,
      profileCompleted: data['profileCompleted'] as bool? ?? true,
      productTourVersion: _readInt(data['productTourVersion']) ?? 0,
      phoneCountryCode: data['phoneCountryCode'] as String?,
      phoneNumber: data['phoneNumber'] as String?,
      phoneVerified: data['phoneVerified'] as bool? ?? false,
      npn: data['npn'] as String?,
      address: composed,
      addressStreet: street,
      addressApt: apt,
      addressCity: city,
      addressState: state,
      addressZip: zip,
      agency: data['agency'] as String?,
      createdAt: _readDate(data['createdAt']) ?? DateTime.now().toUtc(),
      updatedAt: _readDate(data['updatedAt']) ?? DateTime.now().toUtc(),
    );
  }

  static DateTime? _readDate(Object? value) {
    if (value == null) return null;
    if (value is DateTime) return value.toUtc();
    if (value is String) return DateTime.tryParse(value)?.toUtc();
    if (value is Timestamp) return value.toDate().toUtc();
    return null;
  }

  static int? _readInt(Object? value) {
    if (value == null) return null;
    if (value is int) return value;
    if (value is num) return value.toInt();
    if (value is String) return int.tryParse(value);
    return null;
  }
}

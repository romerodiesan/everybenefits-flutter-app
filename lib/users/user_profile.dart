import 'package:cloud_firestore/cloud_firestore.dart';

import 'user_role.dart';

/// Default agency assigned to new agents.
const String kDefaultAgency = 'Every Benefits';

class UserProfile {
  const UserProfile({
    required this.uid,
    required this.role,
    required this.isAnonymous,
    required this.createdAt,
    required this.updatedAt,
    required this.profileCompleted,
    this.email,
    this.displayName,
    this.photoUrl,
    this.phoneCountryCode,
    this.phoneNumber,
    this.npn,
    this.address,
    this.agency,
  });

  final String uid;
  final String? email;
  final String? displayName;
  final String? photoUrl;
  final UserRole role;
  final bool isAnonymous;
  final bool profileCompleted;
  final String? phoneCountryCode;
  final String? phoneNumber;
  final String? npn;
  final String? address;
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

  UserProfile copyWith({
    String? email,
    String? displayName,
    String? photoUrl,
    UserRole? role,
    bool? isAnonymous,
    bool? profileCompleted,
    String? phoneCountryCode,
    String? phoneNumber,
    String? npn,
    String? address,
    String? agency,
    DateTime? updatedAt,
    bool clearPhotoUrl = false,
    bool clearNpn = false,
    bool clearAddress = false,
    bool clearAgency = false,
  }) {
    return UserProfile(
      uid: uid,
      email: email ?? this.email,
      displayName: displayName ?? this.displayName,
      photoUrl: clearPhotoUrl ? null : (photoUrl ?? this.photoUrl),
      role: role ?? this.role,
      isAnonymous: isAnonymous ?? this.isAnonymous,
      profileCompleted: profileCompleted ?? this.profileCompleted,
      phoneCountryCode: phoneCountryCode ?? this.phoneCountryCode,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      npn: clearNpn ? null : (npn ?? this.npn),
      address: clearAddress ? null : (address ?? this.address),
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
      'phoneCountryCode': phoneCountryCode,
      'phoneNumber': phoneNumber,
      'npn': npn,
      'address': address,
      'agency': agency,
      'createdAt': createdAt.toUtc().toIso8601String(),
      'updatedAt': updatedAt.toUtc().toIso8601String(),
    };
  }

  factory UserProfile.fromMap(Map<String, dynamic> data) {
    return UserProfile(
      uid: data['uid'] as String,
      email: data['email'] as String?,
      displayName: data['displayName'] as String?,
      photoUrl: data['photoUrl'] as String?,
      role: UserRole.parse(data['role'] as String?),
      isAnonymous: data['isAnonymous'] as bool? ?? false,
      profileCompleted: data['profileCompleted'] as bool? ?? true,
      phoneCountryCode: data['phoneCountryCode'] as String?,
      phoneNumber: data['phoneNumber'] as String?,
      npn: data['npn'] as String?,
      address: data['address'] as String?,
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
}

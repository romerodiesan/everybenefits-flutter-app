import 'package:cloud_firestore/cloud_firestore.dart';

import 'avatar_storage.dart';
import 'permissions.dart';
import 'profile_badge.dart';
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

  final line1 = [if (s.isNotEmpty) s, if (a.isNotEmpty) a].join(', ');
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
  UserProfile({
    required this.uid,
    required this.role,
    required this.isAnonymous,
    required this.createdAt,
    required this.updatedAt,
    required this.profileCompleted,
    this.productTourVersion = 0,
    this.email,
    this.username,
    this.displayName,
    this.photoUrl,
    this.phoneCountryCode,
    this.phoneCountryIso2,
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
    this.bio,
    this.profileBadge,
    this.orgNodeId,
    this.accountStatus = 'active',
    this.approvalStatus,
    this.displayNameLower,
    this.emailLower,
    this.nameTokens,
    this.showLocationOnProfile = false,
    this.followerCount = 0,
    this.followingCount = 0,
    String? roleId,
  }) : roleId = roleId ?? role.wireValue;

  final String uid;
  final String? email;
  final String? username;
  final String? displayName;

  /// Firestore search index (read for ensureProfile self-heal).
  final String? displayNameLower;
  final String? emailLower;
  final List<String>? nameTokens;
  final String? photoUrl;

  /// Canonical Firestore `users.role` wire value (may be a custom slug).
  final String roleId;

  /// Built-in enum for UI; custom [roleId] maps to [UserRole.student] here —
  /// use [roleId] + permissions for authorization.
  final UserRole role;
  final bool isAnonymous;
  final bool profileCompleted;

  /// Last product-tour version the user finished or skipped (0 = never).
  final int productTourVersion;
  final String? phoneCountryCode;
  final String? phoneCountryIso2;
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
  final String? bio;
  final ProfileBadge? profileBadge;

  /// Firestore `orgNodes/{id}` attachment for Admin hierarchy.
  final String? orgNodeId;

  /// `active` | `deactivated` | `pendingDeletion`.
  final String accountStatus;

  /// `pending` | `approved` | `rejected`. Null = legacy (treated as approved).
  final String? approvalStatus;
  final DateTime createdAt;
  final DateTime updatedAt;

  /// Opt-in city/state on the public profile.
  final bool showLocationOnProfile;

  /// Counts from `publicProfiles` (0 on private user docs).
  final int followerCount;
  final int followingCount;

  String get initials {
    final source = displayName?.trim().isNotEmpty == true
        ? displayName!
        : (email ?? 'U');
    return source.substring(0, 1).toUpperCase();
  }

  /// Client mirror of `isRegisteredMember()` in firestore.rules.
  bool get isRegisteredMember {
    if (isAnonymous) return false;
    return accountStatus != 'deactivated' && accountStatus != 'pendingDeletion';
  }

  String get handle {
    final claimed = username?.trim().toLowerCase() ?? '';
    if (RegExp(r'^[a-z0-9_]{3,20}$').hasMatch(claimed)) return claimed;
    final local = email?.split('@').first.trim();
    if (local != null && local.isNotEmpty) return local;
    final prefix = uid.length >= 4 ? uid.substring(0, 4) : uid;
    return 'user$prefix';
  }

  bool get hasUsername {
    final claimed = username?.trim().toLowerCase() ?? '';
    return RegExp(r'^[a-z0-9_]{3,20}$').hasMatch(claimed);
  }

  String get headlineName {
    if (displayName?.trim().isNotEmpty == true) return displayName!.trim();
    if (email != null) return email!;
    return 'Usuario';
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

  /// City/state for the public card (already gated by sync when from publicProfiles).
  String? get publicLocation {
    final city = addressCity?.trim() ?? '';
    final state = (addressState?.trim() ?? '').toUpperCase();
    if (city.isEmpty && state.isEmpty) return null;
    if (city.isEmpty) return state;
    if (state.isEmpty) return city;
    return '$city, $state';
  }

  UserProfile copyWith({
    String? email,
    String? username,
    String? displayName,
    String? photoUrl,
    UserRole? role,
    String? roleId,
    bool? isAnonymous,
    bool? profileCompleted,
    int? productTourVersion,
    String? phoneCountryCode,
    String? phoneCountryIso2,
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
    String? bio,
    ProfileBadge? profileBadge,
    String? orgNodeId,
    String? accountStatus,
    String? approvalStatus,
    String? displayNameLower,
    String? emailLower,
    List<String>? nameTokens,
    DateTime? updatedAt,
    DateTime? createdAt,
    bool? showLocationOnProfile,
    int? followerCount,
    int? followingCount,
    bool clearPhotoUrl = false,
    bool clearNpn = false,
    bool clearAddress = false,
    bool clearAgency = false,
    bool clearBio = false,
    bool clearOrgNodeId = false,
  }) {
    final nextStreet = clearAddress
        ? null
        : (addressStreet ?? this.addressStreet);
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

    final nextRole = role ?? this.role;
    final nextRoleId = roleId ?? (role != null ? role.wireValue : this.roleId);

    return UserProfile(
      uid: uid,
      email: email ?? this.email,
      username: username ?? this.username,
      displayName: displayName ?? this.displayName,
      photoUrl: clearPhotoUrl ? null : (photoUrl ?? this.photoUrl),
      role: nextRole,
      roleId: nextRoleId,
      isAnonymous: isAnonymous ?? this.isAnonymous,
      profileCompleted: profileCompleted ?? this.profileCompleted,
      productTourVersion: productTourVersion ?? this.productTourVersion,
      phoneCountryCode: phoneCountryCode ?? this.phoneCountryCode,
      phoneCountryIso2: phoneCountryIso2 ?? this.phoneCountryIso2,
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
      bio: clearBio ? null : (bio ?? this.bio),
      profileBadge: profileBadge ?? this.profileBadge,
      orgNodeId: clearOrgNodeId ? null : (orgNodeId ?? this.orgNodeId),
      accountStatus: accountStatus ?? this.accountStatus,
      approvalStatus: approvalStatus ?? this.approvalStatus,
      displayNameLower: displayNameLower ?? this.displayNameLower,
      emailLower: emailLower ?? this.emailLower,
      nameTokens: nameTokens ?? this.nameTokens,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      showLocationOnProfile:
          showLocationOnProfile ?? this.showLocationOnProfile,
      followerCount: followerCount ?? this.followerCount,
      followingCount: followingCount ?? this.followingCount,
    );
  }

  Map<String, Object?> toMap() {
    return {
      'uid': uid,
      'email': email,
      'username': username,
      'displayName': displayName,
      'photoUrl': photoUrl,
      'role': roleId,
      'isAnonymous': isAnonymous,
      'profileCompleted': profileCompleted,
      'productTourVersion': productTourVersion,
      'phoneCountryCode': phoneCountryCode,
      'phoneCountryIso2': phoneCountryIso2,
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
      'bio': bio,
      'orgNodeId': orgNodeId,
      'accountStatus': accountStatus,
      if (approvalStatus != null) 'approvalStatus': approvalStatus,
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
    final composed =
        composeUsAddress(
          street: street,
          apt: apt,
          city: city,
          state: state,
          zip: zip,
        ) ??
        legacy;
    final status = data['accountStatus'] as String?;
    final accountStatus = status == 'deactivated' || status == 'pendingDeletion'
        ? status!
        : 'active';
    final rawRole = data['role'] as String?;
    final roleId = normalizeRoleId(rawRole);
    final known = UserRole.tryParseBuiltin(roleId) ?? UserRole.student;

    return UserProfile(
      uid: '${data['uid'] ?? ''}',
      email: data['email'] as String?,
      username: data['username'] == null ? null : '${data['username']}',
      displayName: data['displayName'] as String?,
      photoUrl: sanitizeOptionalAvatarDownloadUrl(data['photoUrl'] as String?),
      role: known,
      roleId: roleId,
      isAnonymous: data['isAnonymous'] as bool? ?? false,
      profileCompleted: data['profileCompleted'] as bool? ?? true,
      productTourVersion: _readInt(data['productTourVersion']) ?? 0,
      phoneCountryCode: data['phoneCountryCode'] as String?,
      phoneCountryIso2: data['phoneCountryIso2'] as String?,
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
      bio: data['bio'] as String?,
      profileBadge: ProfileBadge.fromMap(data['profileBadge']),
      orgNodeId: data['orgNodeId'] as String?,
      accountStatus: accountStatus,
      approvalStatus: data['approvalStatus'] as String?,
      displayNameLower: data['displayNameLower'] as String?,
      emailLower: data['emailLower'] as String?,
      nameTokens: (data['nameTokens'] as List?)?.map((e) => '$e').toList(),
      createdAt: _readDate(data['createdAt']) ?? DateTime.now().toUtc(),
      updatedAt: _readDate(data['updatedAt']) ?? DateTime.now().toUtc(),
      showLocationOnProfile: _readPrivacyFlag(
        data['privacy'],
        'showLocationOnProfile',
      ),
      followerCount: _readInt(data['followerCount']) ?? 0,
      followingCount: _readInt(data['followingCount']) ?? 0,
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

  static bool _readPrivacyFlag(Object? privacy, String key) {
    if (privacy is! Map) return false;
    return privacy[key] == true;
  }
}

/// Shared profile validation helpers (mirrors @pulse/shared profile.ts).
library;

final _emailLike = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
final _npnDigits = RegExp(r'^\d{7,9}$');
final _usState = RegExp(r'^[A-Za-z]{2}$');
final _usZip = RegExp(r'^\d{5}(-\d{4})?$');
final _nameLetters = RegExp(r'[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]');

const licenseProfileRoles = {
  'agent',
  'instructor',
  'manager',
  'admin',
};

bool requiresLicenseProfile(String role) => licenseProfileRoles.contains(role);

bool looksLikeEmailName(String value) => _emailLike.hasMatch(value.trim());

int _letterCount(String part) =>
    part.replaceAll(_nameLetters, '').length;

String normalizePersonName(String raw) {
  final trimmed = raw.trim().replaceAll(RegExp(r'\s+'), ' ');
  if (trimmed.isEmpty) return '';
  final letters = trimmed.replaceAll(_nameLetters, '');
  if (letters.isEmpty) return trimmed;
  final allUpper = letters == letters.toUpperCase();
  final allLower = letters == letters.toLowerCase();
  if (!allUpper && !allLower) return trimmed;
  return trimmed
      .split(' ')
      .map((word) {
        if (word.isEmpty) return word;
        final lower = word.toLowerCase();
        return '${lower[0].toUpperCase()}${lower.substring(1)}';
      })
      .join(' ');
}

({String givenName, String familyName}) splitDisplayName(String raw) {
  final value = normalizePersonName(raw);
  final parts = value.split(' ').where((p) => p.isNotEmpty).toList();
  if (parts.isEmpty) return (givenName: '', familyName: '');
  if (parts.length == 1) {
    return (givenName: parts.first, familyName: '');
  }
  return (
    givenName: parts.sublist(0, parts.length - 1).join(' '),
    familyName: parts.last,
  );
}

String composeDisplayName(String givenName, String familyName) {
  return normalizePersonName(
    [givenName.trim(), familyName.trim()]
        .where((part) => part.isNotEmpty)
        .join(' '),
  );
}

/// Lowercased edge-prefix tokens for Firestore `array-contains` search.
List<String> nameSearchTokens(String? displayName, [String? email]) {
  const minLen = 2;
  const maxLen = 40;
  const cap = 120;
  final tokens = <String>{};

  String fold(String raw) {
    return raw
        .toLowerCase()
        .replaceAll('á', 'a')
        .replaceAll('é', 'e')
        .replaceAll('í', 'i')
        .replaceAll('ó', 'o')
        .replaceAll('ú', 'u')
        .replaceAll('ü', 'u')
        .replaceAll('ñ', 'n');
  }

  void addWord(String word) {
    final cleaned = fold(word).replaceAll(RegExp(r'[^a-z0-9]'), '');
    if (cleaned.isEmpty) return;
    if (cleaned.length < minLen) {
      tokens.add(cleaned);
      return;
    }
    final end = cleaned.length > maxLen ? maxLen : cleaned.length;
    for (var i = minLen; i <= end; i++) {
      tokens.add(cleaned.substring(0, i));
      if (tokens.length >= cap) return;
    }
  }

  for (final part in (displayName ?? '').trim().split(RegExp(r'\s+'))) {
    if (part.isEmpty) continue;
    addWord(part);
    if (tokens.length >= cap) break;
  }

  final mail = email?.trim().toLowerCase();
  if (mail != null && mail.isNotEmpty && tokens.length < cap) {
    final local = mail.split('@').first;
    addWord(local);
    final emailKey = fold(mail).replaceAll(RegExp(r'[^a-z0-9@.]'), '');
    final end = emailKey.length > maxLen ? maxLen : emailKey.length;
    for (var i = minLen; i <= end; i++) {
      tokens.add(emailKey.substring(0, i));
      if (tokens.length >= cap) break;
    }
  }

  return tokens.toList();
}

enum DisplayNameIssue { empty, tooShort, needLastName, emailAsName }

({bool ok, String value, DisplayNameIssue? issue}) validateGivenName(
  String raw,
) {
  final value = normalizePersonName(raw);
  if (value.isEmpty) {
    return (ok: false, value: value, issue: DisplayNameIssue.empty);
  }
  if (looksLikeEmailName(value)) {
    return (ok: false, value: value, issue: DisplayNameIssue.emailAsName);
  }
  final parts = value.split(' ').where((p) => p.isNotEmpty).toList();
  if (_letterCount(parts.first) < 2) {
    return (ok: false, value: value, issue: DisplayNameIssue.tooShort);
  }
  for (final part in parts.skip(1)) {
    if (_letterCount(part) < 1) {
      return (ok: false, value: value, issue: DisplayNameIssue.tooShort);
    }
  }
  return (ok: true, value: value, issue: null);
}

({bool ok, String value, DisplayNameIssue? issue}) validateFamilyName(
  String raw,
) {
  final value = normalizePersonName(raw);
  if (value.isEmpty) {
    return (ok: false, value: value, issue: DisplayNameIssue.needLastName);
  }
  final parts = value.split(' ').where((p) => p.isNotEmpty).toList();
  for (final part in parts) {
    if (_letterCount(part) < 2) {
      return (ok: false, value: value, issue: DisplayNameIssue.tooShort);
    }
  }
  return (ok: true, value: value, issue: null);
}

({bool ok, String value, DisplayNameIssue? issue}) validateDisplayName(
  String raw,
) {
  final value = normalizePersonName(raw);
  if (value.isEmpty) {
    return (ok: false, value: value, issue: DisplayNameIssue.empty);
  }
  if (looksLikeEmailName(value)) {
    return (ok: false, value: value, issue: DisplayNameIssue.emailAsName);
  }
  final parts = splitDisplayName(value);
  if (parts.familyName.isEmpty) {
    return (ok: false, value: value, issue: DisplayNameIssue.needLastName);
  }
  final given = validateGivenName(parts.givenName);
  if (!given.ok) return given;
  final family = validateFamilyName(parts.familyName);
  if (!family.ok) return family;
  return (
    ok: true,
    value: composeDisplayName(given.value, family.value),
    issue: null,
  );
}

({bool ok, String value}) validateNpn(String? raw) {
  final digits = (raw ?? '').replaceAll(RegExp(r'\D'), '');
  if (!_npnDigits.hasMatch(digits)) {
    return (ok: false, value: digits);
  }
  return (ok: true, value: digits);
}

bool isUserApproved(String? approvalStatus) {
  if (approvalStatus == null || approvalStatus.isEmpty) return true;
  return approvalStatus == 'approved';
}

bool needsProfileCompletion({
  required bool isAnonymous,
  required String roleName,
  required String? displayName,
  required bool profileCompleted,
  String? npn,
  String? addressStreet,
  String? addressCity,
  String? addressState,
  String? addressZip,
}) {
  if (isAnonymous) return false;
  final name = validateDisplayName(displayName ?? '');
  if (!name.ok) return true;
  if (requiresLicenseProfile(roleName)) {
    if (!validateNpn(npn).ok) return true;
    if ((addressStreet ?? '').trim().isEmpty) return true;
    if ((addressCity ?? '').trim().isEmpty) return true;
    if (!_usState.hasMatch((addressState ?? '').trim())) return true;
    if (!_usZip.hasMatch((addressZip ?? '').trim())) return true;
  }
  return !profileCompleted;
}

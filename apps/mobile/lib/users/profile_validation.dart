/// Shared profile validation helpers (mirrors @pulse/shared profile.ts).
library;

import 'permissions.dart';
import 'user_role.dart';

final _emailLike = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
final _npnDigits = RegExp(r'^\d{7,9}$');
final _usState = RegExp(r'^[A-Za-z]{2}$');
final _usZip = RegExp(r'^\d{5}(-\d{4})?$');
final _nameLetters = RegExp(r'[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]');

/// True when license fields are required for this role (permission-aware).
bool requiresLicenseProfile(String role) =>
    requiresLicenseProfileAccess(role);

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
List<String> nameSearchTokens(
  String? displayName, [
  String? email,
  String? username,
]) {
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

  final handle = username?.trim().toLowerCase();
  if (handle != null && handle.isNotEmpty && tokens.length < cap) {
    addWord(handle);
  }

  return tokens.toList();
}

final _usernamePattern = RegExp(r'^[a-z0-9_]{3,20}$');

({bool ok, String value}) parseUsername(String raw) {
  final value = raw.trim().toLowerCase();
  if (!_usernamePattern.hasMatch(value)) {
    return (ok: false, value: value);
  }
  return (ok: true, value: value);
}

final _mentionInBody = RegExp(
  r'(^|[^a-z0-9_])@([a-z0-9_]{1,20})(?![a-z0-9_])',
  caseSensitive: false,
);
final _urlInBody = RegExp(r'https?:\/\/[^\s]+', caseSensitive: false);
final _mentionQuery = RegExp(
  r'(^|[^a-z0-9_])@([a-z0-9_]{0,20})$',
  caseSensitive: false,
);

List<String> parseMentions(String body) {
  final found = <String>{};
  for (final match in _mentionInBody.allMatches(body)) {
    final parsed = parseUsername(match.group(2) ?? '');
    if (parsed.ok) found.add(parsed.value);
  }
  return found.toList();
}

class MentionQuery {
  const MentionQuery({required this.start, required this.prefix});
  final int start;
  final String prefix;
}

MentionQuery? mentionQueryAt(String text, int cursor) {
  final safe = cursor.clamp(0, text.length);
  final upto = text.substring(0, safe);
  final match = _mentionQuery.firstMatch(upto);
  if (match == null) return null;
  final prefix = (match.group(2) ?? '').toLowerCase();
  final start = safe - prefix.length - 1;
  return MentionQuery(start: start, prefix: prefix);
}

({String text, int cursor}) insertMention(
  String text,
  int cursor,
  String handle,
) {
  final parsed = parseUsername(handle);
  final token = parsed.ok ? parsed.value : handle.trim().toLowerCase();
  final insert = '@$token ';
  final query = mentionQueryAt(text, cursor);
  if (query == null) {
    final at = cursor.clamp(0, text.length);
    return (
      text: '${text.substring(0, at)}$insert${text.substring(at)}',
      cursor: at + insert.length,
    );
  }
  return (
    text: '${text.substring(0, query.start)}$insert${text.substring(cursor)}',
    cursor: query.start + insert.length,
  );
}

class MentionCandidate {
  const MentionCandidate({
    required this.uid,
    required this.username,
    required this.name,
    this.photoUrl,
  });
  final String uid;
  final String username;
  final String name;
  final String? photoUrl;
}

List<MentionCandidate> filterMentionCandidates(
  List<MentionCandidate> members,
  String prefix,
  String viewerUid,
) {
  final q = prefix.trim().toLowerCase();
  return members.where((member) {
    if (member.uid == viewerUid) return false;
    if (!_usernamePattern.hasMatch(member.username.trim().toLowerCase())) {
      return false;
    }
    if (q.isEmpty) return true;
    final username = member.username.trim().toLowerCase();
    final name = member.name.trim().toLowerCase();
    return username.startsWith(q) || name.contains(q);
  }).toList();
}

sealed class ChatBodySpan {
  const ChatBodySpan();
}

class ChatBodyText extends ChatBodySpan {
  const ChatBodyText(this.value);
  final String value;
}

class ChatBodyUrl extends ChatBodySpan {
  const ChatBodyUrl(this.value);
  final String value;
}

class ChatBodyMention extends ChatBodySpan {
  const ChatBodyMention({required this.handle, required this.raw});
  final String handle;
  final String raw;
}

List<ChatBodySpan> splitChatBody(String text) {
  if (text.isEmpty) return const [ChatBodyText('')];
  final hits = <({int start, int end, ChatBodySpan span})>[];
  for (final match in _urlInBody.allMatches(text)) {
    hits.add((
      start: match.start,
      end: match.end,
      span: ChatBodyUrl(match.group(0)!),
    ));
  }
  for (final match in _mentionInBody.allMatches(text)) {
    final parsed = parseUsername(match.group(2) ?? '');
    if (!parsed.ok) continue;
    final handle = parsed.value;
    final at = match.start + (match.group(1)?.length ?? 0);
    final end = at + 1 + (match.group(2)?.length ?? 0);
    if (hits.any((hit) => at < hit.end && end > hit.start)) continue;
    hits.add((
      start: at,
      end: end,
      span: ChatBodyMention(handle: handle, raw: '@$handle'),
    ));
  }
  hits.sort((a, b) => a.start.compareTo(b.start));
  final out = <ChatBodySpan>[];
  var last = 0;
  for (final hit in hits) {
    if (hit.start < last) continue;
    if (hit.start > last) {
      out.add(ChatBodyText(text.substring(last, hit.start)));
    }
    out.add(hit.span);
    last = hit.end;
  }
  if (last < text.length) {
    out.add(ChatBodyText(text.substring(last)));
  }
  return out.isEmpty ? [ChatBodyText(text)] : out;
}

/// Same shape as web `userSearchIndexFields` (@pulse/shared).
Map<String, Object?> userSearchIndexFields(
  String? displayName,
  String? email, [
  String? username,
]) {
  final normalized = displayName?.trim();
  final name =
      normalized == null || normalized.isEmpty ? null : normalized;
  final emailTrim = email?.trim();
  final foldedName = name
      ?.toLowerCase()
      .replaceAll('á', 'a')
      .replaceAll('é', 'e')
      .replaceAll('í', 'i')
      .replaceAll('ó', 'o')
      .replaceAll('ú', 'u')
      .replaceAll('ü', 'u')
      .replaceAll('ñ', 'n');
  return {
    'displayName': name,
    'displayNameLower': foldedName,
    'emailLower': emailTrim?.toLowerCase(),
    'nameTokens': nameSearchTokens(name, emailTrim, username),
  };
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

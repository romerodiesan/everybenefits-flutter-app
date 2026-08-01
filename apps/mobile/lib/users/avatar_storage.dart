import 'dart:typed_data';

import 'package:firebase_storage/firebase_storage.dart';

/// Strips a legacy cache-bust query (`v=`) that made the Storage emulator
/// return an empty body to [NetworkImage].
String sanitizeAvatarDownloadUrl(String url) {
  final trimmed = url.trim();
  if (trimmed.isEmpty) return trimmed;

  // Prefer Uri parsing; fall back to regex if the URL is oddly encoded.
  final uri = Uri.tryParse(trimmed);
  if (uri != null && uri.hasQuery && uri.queryParameters.containsKey('v')) {
    final params = Map<String, String>.from(uri.queryParameters)..remove('v');
    return uri
        .replace(queryParameters: params.isEmpty ? null : params)
        .toString();
  }

  return trimmed
      .replaceAll(RegExp(r'([?&])v=\d+&'), r'$1')
      .replaceAll(RegExp(r'[?&]v=\d+$'), '')
      .replaceAll(RegExp(r'\?&'), '?');
}

String? sanitizeOptionalAvatarDownloadUrl(String? url) {
  if (url == null) return null;
  final cleaned = sanitizeAvatarDownloadUrl(url);
  return cleaned.isEmpty ? null : cleaned;
}

/// Uploads profile avatars to Firebase Storage.
class AvatarStorage {
  AvatarStorage({this._storage}) : _testUpload = null;

  /// Test seam that never touches Firebase.
  AvatarStorage.test(this._testUpload) : _storage = null;

  final FirebaseStorage? _storage;
  final Future<String> Function({
    required String uid,
    required Uint8List bytes,
  })? _testUpload;

  Future<String> uploadAvatar({
    required String uid,
    required Uint8List bytes,
  }) async {
    final testUpload = _testUpload;
    if (testUpload != null) {
      return testUpload(uid: uid, bytes: bytes);
    }
    final storage = _storage ?? FirebaseStorage.instance;
    final ref = storage.ref().child('avatars').child('$uid.jpg');
    await ref.putData(
      bytes,
      SettableMetadata(contentType: 'image/jpeg'),
    );
    // Persist the raw download URL only. Query cache-busters (`&v=`) break
    // the Storage emulator (empty body → NetworkImage exceptions).
    return sanitizeAvatarDownloadUrl(await ref.getDownloadURL());
  }
}

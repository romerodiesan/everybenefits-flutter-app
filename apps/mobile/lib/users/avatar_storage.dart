import 'dart:typed_data';

import 'package:firebase_storage/firebase_storage.dart';

import '../firebase/firebase_emulators.dart';

/// Strips a legacy cache-bust query (`v=`) that made the Storage emulator
/// return an empty body to [NetworkImage], and rewrites loopback emulator
/// hosts so a physical device can load the avatar.
String sanitizeAvatarDownloadUrl(String url) {
  return rewriteEmulatorStorageUrl(url);
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

  Future<String> uploadGroupPhoto({
    required String chatId,
    required Uint8List bytes,
  }) async {
    final testUpload = _testUpload;
    if (testUpload != null) {
      return testUpload(uid: chatId, bytes: bytes);
    }
    final storage = _storage ?? FirebaseStorage.instance;
    final ref = storage.ref().child('chat-photos').child('$chatId.jpg');
    await ref.putData(bytes, SettableMetadata(contentType: 'image/jpeg'));
    return sanitizeAvatarDownloadUrl(await ref.getDownloadURL());
  }
}

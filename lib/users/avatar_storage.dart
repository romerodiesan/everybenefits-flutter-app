import 'dart:typed_data';

import 'package:firebase_storage/firebase_storage.dart';

/// Uploads profile avatars to Firebase Storage.
class AvatarStorage {
  AvatarStorage({FirebaseStorage? storage})
      : _storage = storage ?? FirebaseStorage.instance;

  final FirebaseStorage _storage;

  Future<String> uploadAvatar({
    required String uid,
    required Uint8List bytes,
  }) async {
    final ref = _storage.ref().child('avatars').child('$uid.jpg');
    await ref.putData(
      bytes,
      SettableMetadata(contentType: 'image/jpeg'),
    );
    return ref.getDownloadURL();
  }
}

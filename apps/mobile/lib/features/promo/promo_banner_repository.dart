import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/foundation.dart';

import '../../firebase/firebase_emulators.dart';
import 'promo_banner_models.dart';

/// Persistence port for promo banners (testable without Firestore).
abstract class PromoBannerStore {
  Stream<List<PromoBanner>> watchActiveBanners();

  Future<String?> resolveImageUrl({
    String? imageUrl,
    String? imagePath,
  });
}

class FirestorePromoBannerStore implements PromoBannerStore {
  FirestorePromoBannerStore({
    FirebaseFirestore? firestore,
    FirebaseStorage? storage,
  })  : _firestore = firestore,
        _storage = storage;

  final FirebaseFirestore? _firestore;
  final FirebaseStorage? _storage;

  @override
  Stream<List<PromoBanner>> watchActiveBanners() {
    try {
      final db = _firestore ?? FirebaseFirestore.instance;
      return db
          .collection('promoBanners')
          .where('active', isEqualTo: true)
          .snapshots()
          .map((snap) {
        final banners = <PromoBanner>[];
        for (final doc in snap.docs) {
          try {
            banners.add(promoBannerFromMap(doc.id, doc.data()));
          } catch (error, stack) {
            debugPrint('promoBanner parse ${doc.id}: $error\n$stack');
          }
        }
        return banners;
      });
    } catch (_) {
      // Firebase not initialized (widget tests) — treat as no promos.
      return Stream.value(const []);
    }
  }

  @override
  Future<String?> resolveImageUrl({
    String? imageUrl,
    String? imagePath,
  }) async {
    final path = imagePath?.trim();
    final rawUrl = imageUrl?.trim();
    final preferPath = path != null &&
        path.isNotEmpty &&
        (useFirebaseEmulators ||
            rawUrl == null ||
            rawUrl.isEmpty ||
            rawUrl.contains('firebasestorage.googleapis.com') ||
            rawUrl.startsWith('gs://'));

    Future<String?> fromStoragePath(String storagePath) async {
      try {
        final storage = _storage ?? FirebaseStorage.instance;
        final url = await storage.ref(storagePath).getDownloadURL();
        return rewriteEmulatorStorageUrl(url);
      } catch (_) {
        return null;
      }
    }

    Future<String?> fromUrl(String candidate) async {
      if (candidate.startsWith('gs://')) {
        try {
          final storage = _storage ?? FirebaseStorage.instance;
          final url = await storage.refFromURL(candidate).getDownloadURL();
          return rewriteEmulatorStorageUrl(url);
        } catch (_) {
          return null;
        }
      }
      return rewriteEmulatorStorageUrl(candidate);
    }

    if (preferPath) {
      final resolved = await fromStoragePath(path!);
      if (resolved != null && resolved.isNotEmpty) return resolved;
      if (rawUrl != null && rawUrl.isNotEmpty) return fromUrl(rawUrl);
      return null;
    }

    if (rawUrl != null && rawUrl.isNotEmpty) return fromUrl(rawUrl);
    if (path != null && path.isNotEmpty) return fromStoragePath(path);
    return null;
  }
}
class PromoBannerRepository {
  PromoBannerRepository({PromoBannerStore? store})
      : _store = store ?? FirestorePromoBannerStore();

  final PromoBannerStore _store;

  Stream<List<PromoBanner>> watchActiveBanners() => _store.watchActiveBanners();

  Future<String?> resolveImageUrl({
    String? imageUrl,
    String? imagePath,
  }) =>
      _store.resolveImageUrl(imageUrl: imageUrl, imagePath: imagePath);
}

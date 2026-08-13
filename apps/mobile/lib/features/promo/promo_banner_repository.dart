import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';

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
        return snap.docs
            .map((doc) => promoBannerFromMap(doc.id, doc.data()))
            .toList();
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
    final url = imageUrl?.trim();
    final preferPath = path != null &&
        path.isNotEmpty &&
        (useFirebaseEmulators ||
            url == null ||
            url.isEmpty ||
            url.contains('firebasestorage.googleapis.com'));
    if (preferPath && path != null && path.isNotEmpty) {
      try {
        final storage = _storage ?? FirebaseStorage.instance;
        return await storage.ref(path).getDownloadURL();
      } catch (_) {
        return url;
      }
    }
    return (url != null && url.isNotEmpty) ? url : null;
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

import 'promo_banner_models.dart';
import 'promo_banner_repository.dart';

/// In-memory promo store for widget/unit tests (no Firestore).
class MemoryPromoBannerStore implements PromoBannerStore {
  MemoryPromoBannerStore([this.banners = const []]);

  List<PromoBanner> banners;

  @override
  Stream<List<PromoBanner>> watchActiveBanners() async* {
    yield banners;
  }

  @override
  Future<String?> resolveImageUrl({
    String? imageUrl,
    String? imagePath,
  }) async {
    return imageUrl;
  }
}

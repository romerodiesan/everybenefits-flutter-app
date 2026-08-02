import 'package:every_benefits/features/product_tour/product_tour_prefs.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('shouldShowProductTour', () {
    test('shows for completed member who has not seen current tour', () {
      expect(
        shouldShowProductTour(
          isAnonymous: false,
          profileCompleted: true,
          productTourVersion: 0,
          localDone: false,
        ),
        isTrue,
      );
    });

    test('hides for anonymous guests', () {
      expect(
        shouldShowProductTour(
          isAnonymous: true,
          profileCompleted: true,
          productTourVersion: 0,
          localDone: false,
        ),
        isFalse,
      );
    });

    test('hides when profile incomplete', () {
      expect(
        shouldShowProductTour(
          isAnonymous: false,
          profileCompleted: false,
          productTourVersion: 0,
          localDone: false,
        ),
        isFalse,
      );
    });

    test('hides when Firestore version already current', () {
      expect(
        shouldShowProductTour(
          isAnonymous: false,
          profileCompleted: true,
          productTourVersion: kProductTourVersion,
          localDone: false,
        ),
        isFalse,
      );
    });

    test('hides when local mirror already marked', () {
      expect(
        shouldShowProductTour(
          isAnonymous: false,
          profileCompleted: true,
          productTourVersion: 0,
          localDone: true,
        ),
        isFalse,
      );
    });
  });
}

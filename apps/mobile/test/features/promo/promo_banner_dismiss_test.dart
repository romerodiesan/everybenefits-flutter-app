import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:every_benefits/features/promo/promo_banner_dismiss.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('dismiss persists version and allows bump re-show', () async {
    final store = PromoBannerDismissStore();
    expect(await store.isDismissed('b1', 1), isFalse);

    await store.dismiss('b1', 1);
    expect(await store.isDismissed('b1', 1), isTrue);
    expect(await store.isDismissed('b1', 2), isFalse);

    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(kPromoBannerDismissKey);
    expect(raw, isNotNull);
    final map = jsonDecode(raw!) as Map<String, dynamic>;
    expect(map['b1'], 1);
  });
}

import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:every_benefits/features/forums/saved_threads.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('toggle saves and removes thread ids', () async {
    final store = SavedThreadsStore();
    expect(await store.isSaved('t1'), isFalse);

    await store.toggle('t1');
    expect(await store.isSaved('t1'), isTrue);
    expect(store.isSavedSync('t1'), isTrue);

    await store.toggle('t1');
    expect(await store.isSaved('t1'), isFalse);

    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getString(kSavedThreadsKey), jsonEncode(<String>[]));
  });

  test('uses the same key shape as Pulse web', () async {
    SharedPreferences.setMockInitialValues({
      kSavedThreadsKey: jsonEncode(['a', 'b']),
    });
    final store = SavedThreadsStore();
    final ids = await store.readIds();
    expect(ids, {'a', 'b'});
  });
}

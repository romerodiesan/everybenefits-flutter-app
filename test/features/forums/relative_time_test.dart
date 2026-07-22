import 'package:flutter_test/flutter_test.dart';

import 'package:every_benefits/features/forums/widgets/relative_time.dart';

void main() {
  final now = DateTime.utc(2024, 6, 15, 12, 0);

  test('formats recent relative times in Spanish', () {
    expect(
      formatRelativeTime(now.subtract(const Duration(seconds: 10)), now: now),
      'ahora',
    );
    expect(
      formatRelativeTime(now.subtract(const Duration(minutes: 1)), now: now),
      'hace 1 min',
    );
    expect(
      formatRelativeTime(now.subtract(const Duration(minutes: 12)), now: now),
      'hace 12 min',
    );
    expect(
      formatRelativeTime(now.subtract(const Duration(hours: 1)), now: now),
      'hace 1 h',
    );
    expect(
      formatRelativeTime(now.subtract(const Duration(hours: 5)), now: now),
      'hace 5 h',
    );
  });

  test('formats day and date fallbacks', () {
    expect(
      formatRelativeTime(now.subtract(const Duration(days: 1)), now: now),
      'ayer',
    );
    expect(
      formatRelativeTime(now.subtract(const Duration(days: 3)), now: now),
      'hace 3 d',
    );
    expect(
      formatRelativeTime(DateTime.utc(2024, 1, 5, 10), now: now),
      '05/01',
    );
    expect(
      formatRelativeTime(DateTime.utc(2023, 1, 5, 10), now: now),
      '05/01/2023',
    );
  });
}

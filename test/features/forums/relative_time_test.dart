import 'package:flutter_test/flutter_test.dart';

import 'package:every_benefits/features/forums/widgets/relative_time.dart';
import 'package:every_benefits/l10n/app_localizations_en.dart';

void main() {
  final now = DateTime.utc(2024, 6, 15, 12, 0);
  final l10n = AppLocalizationsEn();

  test('formats recent relative times in English', () {
    expect(
      formatRelativeTime(
        now.subtract(const Duration(seconds: 10)),
        l10n,
        now: now,
      ),
      'now',
    );
    expect(
      formatRelativeTime(
        now.subtract(const Duration(minutes: 1)),
        l10n,
        now: now,
      ),
      '1 min ago',
    );
    expect(
      formatRelativeTime(
        now.subtract(const Duration(minutes: 12)),
        l10n,
        now: now,
      ),
      '12 min ago',
    );
    expect(
      formatRelativeTime(
        now.subtract(const Duration(hours: 1)),
        l10n,
        now: now,
      ),
      '1 h ago',
    );
    expect(
      formatRelativeTime(
        now.subtract(const Duration(hours: 5)),
        l10n,
        now: now,
      ),
      '5 h ago',
    );
  });

  test('formats day and date fallbacks', () {
    expect(
      formatRelativeTime(now.subtract(const Duration(days: 1)), l10n, now: now),
      'yesterday',
    );
    expect(
      formatRelativeTime(now.subtract(const Duration(days: 3)), l10n, now: now),
      '3 d ago',
    );
    expect(
      formatRelativeTime(DateTime.utc(2024, 1, 5, 10), l10n, now: now),
      '05/01',
    );
    expect(
      formatRelativeTime(DateTime.utc(2023, 1, 5, 10), l10n, now: now),
      '05/01/2023',
    );
  });
}

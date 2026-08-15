import 'package:flutter_test/flutter_test.dart';

import 'package:every_benefits/users/profile_badge.dart';

void main() {
  test('parses public card badges without an assigned flag', () {
    final badge = ProfileBadge.fromMap({
      'text': 'Agency owner',
      'icon': 'star',
      'backgroundColor': '#7C3AED',
    });
    expect(badge?.text, 'Agency owner');
    expect(badge?.icon, 'star');
  });

  test('parses admin-enabled user-doc badges', () {
    final badge = ProfileBadge.fromMap({
      'enabled': true,
      'text': 'Mentor',
      'icon': 'school',
      'color': 'teal',
    });
    expect(badge?.text, 'Mentor');
    expect(badge?.icon, 'school');
  });

  test('hides explicitly disabled badges', () {
    expect(
      ProfileBadge.fromMap({
        'enabled': false,
        'text': 'Hidden',
        'icon': 'badge',
      }),
      isNull,
    );
  });
}

import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

import 'package:every_benefits/users/user_profile.dart';

/// Parity check against packages/pulse-shared/fixtures/user-profile.json.
void main() {
  test('UserProfile.fromMap accepts shared user-profile fixture fields', () {
    final fixtureFile = File(
      '${Directory.current.path}/packages/pulse-shared/fixtures/user-profile.json',
    );
    expect(fixtureFile.existsSync(), isTrue, reason: 'shared fixture missing');
    final data = jsonDecode(fixtureFile.readAsStringSync()) as Map<String, dynamic>;
    final profile = UserProfile.fromMap(data);

    expect(profile.uid, 'user_agent_001');
    expect(profile.role.wireValue, 'agent');
    expect(profile.orgNodeId, 'root');
    expect(profile.accountStatus, 'active');
    expect(profile.approvalStatus, 'approved');
    expect(profile.npn, '12345678');
    expect(profile.agency, 'Every Benefits');
  });
}

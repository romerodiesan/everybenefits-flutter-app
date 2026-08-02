import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

import 'package:every_benefits/users/user_profile.dart';

void main() {
  test('UserProfile parses shared fixture fields', () {
    final fixtureFile = File(
      '../../packages/shared/fixtures/user-profile.json',
    );
    expect(fixtureFile.existsSync(), isTrue);
    final json =
        jsonDecode(fixtureFile.readAsStringSync()) as Map<String, dynamic>;
    final profile = UserProfile.fromMap(json);
    expect(profile.uid, 'user_agent_001');
    expect(profile.role.wireValue, 'agent');
    expect(profile.orgNodeId, 'root');
    expect(profile.accountStatus, 'active');
    expect(profile.approvalStatus, 'approved');
    expect(profile.npn, '12345678');
  });
}

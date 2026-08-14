import 'package:flutter_test/flutter_test.dart';

import 'package:every_benefits/users/permissions.dart';
import 'package:every_benefits/users/user_profile.dart';
import 'package:every_benefits/users/user_role.dart';

void main() {
  group('getDefaultPermissionsForRole', () {
    test('agency_owner includes forums, chats, and license', () {
      final perms = getDefaultPermissionsForRole('agency_owner');
      expect(perms, contains(Perm.forumsParticipate));
      expect(perms, contains(Perm.chatsParticipate));
      expect(perms, contains(Perm.chatsGroupsDefaultJoin));
      expect(perms, contains(Perm.licenseProfileRequired));
      expect(perms, isNot(contains(Perm.adminAccess)));
    });

    test('student participates but no license gate', () {
      final perms = getDefaultPermissionsForRole('student');
      expect(perms, contains(Perm.forumsParticipate));
      expect(perms, contains(Perm.chatsParticipate));
      expect(perms, isNot(contains(Perm.licenseProfileRequired)));
    });

    test('guest is read-only web access', () {
      final perms = getDefaultPermissionsForRole('guest');
      expect(perms, isNot(contains(Perm.forumsParticipate)));
      expect(perms, isNot(contains(Perm.chatsParticipate)));
    });

    test('custom role has empty defaults until hydration', () {
      expect(getDefaultPermissionsForRole('custom_ops'), isEmpty);
    });
  });

  group('resolveAccess / can', () {
    test('empty live list falls back to role defaults', () {
      expect(resolveAccess(null, 'agent'), 'agent');
      expect(resolveAccess(const [], 'agent'), 'agent');
      expect(can(resolveAccess(null, 'agent'), Perm.forumsParticipate), isTrue);
    });

    test('non-empty live list wins', () {
      const live = [Perm.adminAccess];
      final access = resolveAccess(live, 'student');
      expect(access, live);
      expect(can(access, Perm.adminAccess), isTrue);
      expect(can(access, Perm.forumsParticipate), isFalse);
    });
  });

  group('UserProfile.isRegisteredMember', () {
    UserProfile profile({
      bool anonymous = false,
      UserRole role = UserRole.agent,
      String accountStatus = 'active',
    }) {
      return UserProfile(
        uid: 'u1',
        role: role,
        isAnonymous: anonymous,
        profileCompleted: true,
        accountStatus: accountStatus,
        createdAt: DateTime.utc(2024),
        updatedAt: DateTime.utc(2024),
      );
    }

    test('agents are members', () {
      expect(profile().isRegisteredMember, isTrue);
    });

    test('guests and anonymous are not', () {
      expect(profile(role: UserRole.guest).isRegisteredMember, isFalse);
      expect(profile(anonymous: true).isRegisteredMember, isFalse);
    });

    test('deactivated accounts are not', () {
      expect(profile(accountStatus: 'deactivated').isRegisteredMember, isFalse);
    });
  });
}

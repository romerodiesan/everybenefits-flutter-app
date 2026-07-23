import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:cloud_functions/cloud_functions.dart';

import 'package:every_benefits/users/user_role.dart';
import 'package:every_benefits/users/user_role_callable.dart';

class _MockFunctions extends Mock implements FirebaseFunctions {}

class _MockCallable extends Mock implements HttpsCallable {}

class _MockResult extends Mock implements HttpsCallableResult<dynamic> {}

void main() {
  test('listStudentsForPromotion maps callable payload', () async {
    final functions = _MockFunctions();
    final callable = _MockCallable();
    final result = _MockResult();
    when(() => functions.httpsCallable('listStudentsForPromotion'))
        .thenReturn(callable);
    when(() => callable.call()).thenAnswer((_) async => result);
    when(() => result.data).thenReturn({
      'students': [
        {
          'uid': 's1',
          'email': 'a@b.com',
          'displayName': 'Ada',
          'photoUrl': null,
          'role': 'student',
          'isAnonymous': false,
          'profileCompleted': true,
        },
        {
          'uid': '',
          'role': 'student',
        },
      ],
    });

    final repo = UserRoleCallable(functions: functions);
    final students = await repo.listStudentsForPromotion();

    expect(students, hasLength(1));
    expect(students.single.uid, 's1');
    expect(students.single.displayName, 'Ada');
    expect(students.single.role, UserRole.student);
  });
}

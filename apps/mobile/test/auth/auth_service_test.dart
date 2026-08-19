import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:every_benefits/auth/auth_exception.dart';
import 'package:every_benefits/auth/auth_service.dart';
import 'package:every_benefits/auth/google_sign_in_gateway.dart';

class MockFirebaseAuth extends Mock implements FirebaseAuth {}

class MockUserCredential extends Mock implements UserCredential {}

class MockUser extends Mock implements User {}

class MockGoogleSignInGateway extends Mock implements GoogleSignInGateway {}

class FakeAuthCredential extends Fake implements AuthCredential {}

class FakeActionCodeSettings extends Fake implements ActionCodeSettings {}

void main() {
  late MockFirebaseAuth auth;
  late MockGoogleSignInGateway google;
  late AuthService sut;
  late MockUserCredential credential;
  late MockUser user;

  final settings = ActionCodeSettings(
    url: 'https://every-insurance.firebaseapp.com/finishSignIn',
    handleCodeInApp: true,
    iOSBundleId: 'com.everybenefits.everyinsurance',
    androidPackageName: 'com.everybenefits.everyinsurance',
    androidInstallApp: true,
  );

  setUpAll(() {
    registerFallbackValue(FakeAuthCredential());
    registerFallbackValue(FakeActionCodeSettings());
    registerFallbackValue(Duration.zero);
  });

  setUp(() {
    auth = MockFirebaseAuth();
    google = MockGoogleSignInGateway();
    credential = MockUserCredential();
    user = MockUser();
    when(() => credential.user).thenReturn(user);
    when(() => user.uid).thenReturn('uid-1');
    when(
      () => auth.setSettings(
        appVerificationDisabledForTesting: any(
          named: 'appVerificationDisabledForTesting',
        ),
      ),
    ).thenAnswer((_) async {});
    sut = AuthService(auth: auth, googleSignIn: google);
  });

  group('email / password', () {
    test('signUpWithEmail creates account', () async {
      when(
        () => auth.createUserWithEmailAndPassword(
          email: any(named: 'email'),
          password: any(named: 'password'),
        ),
      ).thenAnswer((_) async => credential);

      final result = await sut.signUpWithEmail(
        email: 'a@b.com',
        password: 'secret123',
      );

      expect(result.user?.uid, 'uid-1');
      verify(
        () => auth.createUserWithEmailAndPassword(
          email: 'a@b.com',
          password: 'secret123',
        ),
      ).called(1);
    });

    test('signInWithEmail signs in existing user', () async {
      when(
        () => auth.signInWithEmailAndPassword(
          email: any(named: 'email'),
          password: any(named: 'password'),
        ),
      ).thenAnswer((_) async => credential);

      final result = await sut.signInWithEmail(
        email: 'a@b.com',
        password: 'secret123',
      );

      expect(result.user?.uid, 'uid-1');
    });

    test('maps FirebaseAuthException to AuthException', () async {
      when(
        () => auth.signInWithEmailAndPassword(
          email: any(named: 'email'),
          password: any(named: 'password'),
        ),
      ).thenThrow(
        FirebaseAuthException(code: 'wrong-password', message: 'bad'),
      );

      expect(
        () => sut.signInWithEmail(email: 'a@b.com', password: 'x'),
        throwsA(
          isA<AuthException>().having((e) => e.code, 'code', 'wrong-password'),
        ),
      );
    });
  });

  group('passwordless', () {
    test('sendSignInLinkToEmail forwards settings', () async {
      when(
        () => auth.sendSignInLinkToEmail(
          email: any(named: 'email'),
          actionCodeSettings: any(named: 'actionCodeSettings'),
        ),
      ).thenAnswer((_) async {});

      await sut.sendSignInLinkToEmail(
        email: 'a@b.com',
        actionCodeSettings: settings,
      );

      verify(
        () => auth.sendSignInLinkToEmail(
          email: 'a@b.com',
          actionCodeSettings: settings,
        ),
      ).called(1);
    });

    test('signInWithEmailLink completes passwordless sign-in', () async {
      when(
        () => auth.signInWithEmailLink(
          email: any(named: 'email'),
          emailLink: any(named: 'emailLink'),
        ),
      ).thenAnswer((_) async => credential);

      final result = await sut.signInWithEmailLink(
        email: 'a@b.com',
        emailLink: 'https://every-insurance.firebaseapp.com/link',
      );

      expect(result.user?.uid, 'uid-1');
    });

    test('isSignInWithEmailLink delegates to FirebaseAuth', () {
      when(() => auth.isSignInWithEmailLink(any())).thenReturn(true);

      expect(sut.isSignInWithEmailLink('https://link'), isTrue);
    });
  });

  group('phone', () {
    test('signInWithSmsCode uses phone credential', () async {
      when(
        () => auth.signInWithCredential(any()),
      ).thenAnswer((_) async => credential);

      final result = await sut.signInWithSmsCode(
        verificationId: 'ver-id',
        smsCode: '123456',
      );

      expect(result.user?.uid, 'uid-1');
      verify(() => auth.signInWithCredential(any())).called(1);
    });

    test('verifyPhoneNumber forwards phone number to FirebaseAuth', () async {
      when(
        () => auth.verifyPhoneNumber(
          phoneNumber: any(named: 'phoneNumber'),
          verificationCompleted: any(named: 'verificationCompleted'),
          verificationFailed: any(named: 'verificationFailed'),
          codeSent: any(named: 'codeSent'),
          codeAutoRetrievalTimeout: any(named: 'codeAutoRetrievalTimeout'),
          timeout: any(named: 'timeout'),
          forceResendingToken: any(named: 'forceResendingToken'),
        ),
      ).thenAnswer((_) async {});

      await sut.verifyPhoneNumber(
        phoneNumber: '+15555550100',
        onCodeSent: (_, _) {},
        onVerificationFailed: (_) {},
        onVerificationCompleted: (_) {},
        onCodeAutoRetrievalTimeout: (_) {},
      );

      final verification = verify(
        () => auth.verifyPhoneNumber(
          phoneNumber: captureAny(named: 'phoneNumber'),
          verificationCompleted: any(named: 'verificationCompleted'),
          verificationFailed: any(named: 'verificationFailed'),
          codeSent: any(named: 'codeSent'),
          codeAutoRetrievalTimeout: any(named: 'codeAutoRetrievalTimeout'),
          timeout: any(named: 'timeout'),
          forceResendingToken: any(named: 'forceResendingToken'),
        ),
      );
      verification.called(1);
      expect(verification.captured.single, '+15555550100');
    });
  });

  group('google', () {
    test('signInWithGoogle signs in with id token credential', () async {
      when(
        () => google.authenticate(),
      ).thenAnswer((_) async => const GoogleIdToken(idToken: 'id-token'));
      when(
        () => auth.signInWithCredential(any()),
      ).thenAnswer((_) async => credential);

      final result = await sut.signInWithGoogle();

      expect(result?.user?.uid, 'uid-1');
    });

    test('signInWithGoogle returns null when user cancels', () async {
      when(() => google.authenticate()).thenAnswer((_) async => null);

      final result = await sut.signInWithGoogle();

      expect(result, isNull);
      verifyNever(() => auth.signInWithCredential(any()));
    });
  });

  group('session', () {
    test('signOut signs out of Google and Firebase', () async {
      when(() => google.signOut()).thenAnswer((_) async {});
      when(() => auth.signOut()).thenAnswer((_) async {});

      await sut.signOut();

      verify(() => google.signOut()).called(1);
      verify(() => auth.signOut()).called(1);
    });

    test('authStateChanges exposes Firebase stream', () {
      when(() => auth.authStateChanges()).thenAnswer((_) => Stream.value(user));

      expect(sut.authStateChanges, emits(user));
    });
  });
}

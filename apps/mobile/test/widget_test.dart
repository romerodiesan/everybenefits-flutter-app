import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:every_benefits/app/home_shell.dart';
import 'package:every_benefits/app/locale_controller.dart';
import 'package:every_benefits/app/theme.dart';
import 'package:every_benefits/app/theme_controller.dart';
import 'package:every_benefits/auth/auth_service.dart';
import 'package:every_benefits/features/chats/chat_repository.dart';
import 'package:every_benefits/features/forums/forum_models.dart';
import 'package:every_benefits/features/forums/forum_repository.dart';
import 'package:every_benefits/features/university/course_repository.dart';
import 'package:every_benefits/features/onboarding/login_screen.dart';
import 'package:every_benefits/features/onboarding/onboarding_prefs.dart';
import 'package:every_benefits/features/onboarding/register_screen.dart';
import 'package:every_benefits/features/onboarding/welcome_screen.dart';
import 'package:every_benefits/features/profile/profile_completion_flow.dart';
import 'package:every_benefits/features/profile/settings_screen.dart';
import 'package:every_benefits/l10n/app_localizations.dart';
import 'package:every_benefits/main.dart';
import 'package:every_benefits/users/user_profile.dart';
import 'package:every_benefits/users/user_repository.dart';
import 'package:every_benefits/users/user_role.dart';

import 'helpers/fake_chat_store.dart';
import 'helpers/fake_course_store.dart';

class MockAuthService extends Mock implements AuthService {}

class MockUserRepository extends Mock implements UserRepository {}

class MockUser extends Mock implements User {}

void main() {
  late MockAuthService auth;
  late MockUserRepository users;
  late ForumRepository emptyForums;
  late FakeChatStore chatStore;
  late ChatRepository emptyChats;
  late FakeCourseStore courseStore;
  late CourseRepository emptyCourses;

  setUpAll(() {
    registerFallbackValue(MockUser());
    registerFallbackValue('');
  });

  setUp(() {
    SharedPreferences.setMockInitialValues({
      OnboardingPrefs.prefsKey: true,
    });
    WelcomeScreen.debugAmbientMotion = false;
    auth = MockAuthService();
    users = MockUserRepository();
    emptyForums = ForumRepository(store: _EmptyForumStore());
    chatStore = FakeChatStore();
    emptyChats = ChatRepository(store: chatStore);
    courseStore = FakeCourseStore();
    emptyCourses = CourseRepository(store: courseStore);
  });

  tearDown(() {
    WelcomeScreen.debugAmbientMotion = true;
    chatStore.dispose();
    courseStore.dispose();
  });

  Widget app() {
    return EveryInsuranceApp(
      authService: auth,
      userRepository: users,
      themeController: ThemeController(),
      localeController: LocaleController(initialLocale: const Locale('en')),
      forumRepository: emptyForums,
      chatRepository: emptyChats,
      courseRepository: emptyCourses,
    );
  }

  UserProfile completedProfile({
    String uid = 'uid-1',
    UserRole role = UserRole.agent,
    bool anonymous = false,
  }) {
    return UserProfile(
      uid: uid,
      email: anonymous ? null : 'a@b.com',
      displayName: anonymous ? null : 'Ada',
      role: role,
      isAnonymous: anonymous,
      profileCompleted: true,
      phoneCountryCode: anonymous ? null : '+506',
      phoneNumber: anonymous ? null : '88887777',
      npn: role == UserRole.agent ? '1234567' : null,
      address: role == UserRole.agent
          ? '100 Main St\nMiami, FL 33101'
          : null,
      addressStreet: role == UserRole.agent ? '100 Main St' : null,
      addressCity: role == UserRole.agent ? 'Miami' : null,
      addressState: role == UserRole.agent ? 'FL' : null,
      addressZip: role == UserRole.agent ? '33101' : null,
      agency: role == UserRole.agent ? kDefaultAgency : null,
      createdAt: DateTime.utc(2024, 1, 1),
      updatedAt: DateTime.utc(2024, 1, 1),
    );
  }

  void stubCompletedProfile(UserProfile profile) {
    when(() => users.ensureProfile(any())).thenAnswer((_) async => profile);
    when(() => users.watchProfile(profile.uid))
        .thenAnswer((_) => Stream.value(profile));
  }

  testWidgets('shows welcome onboarding when there is no user', (tester) async {
    when(() => auth.authStateChanges).thenAnswer((_) => Stream.value(null));

    await tester.pumpWidget(
      app(),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 950));

    expect(find.text('EVERY'), findsOneWidget);
    expect(find.text('INSURANCE'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
    expect(find.text('Continue as guest'), findsOneWidget);
  });

  testWidgets('first-run onboarding shows story pages before auth',
      (tester) async {
    SharedPreferences.setMockInitialValues({});
    when(() => auth.authStateChanges).thenAnswer((_) => Stream.value(null));

    await tester.pumpWidget(app());
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 200));

    expect(find.text('Learn out loud'), findsOneWidget);
    expect(find.text('Next'), findsOneWidget);
    expect(find.text('Skip'), findsOneWidget);
    expect(find.text('Sign in'), findsNothing);

    await tester.tap(find.text('Skip'));
    await tester.pumpAndSettle();

    expect(find.text('EVERY'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
  });

  testWidgets('welcome navigates to login and register', (tester) async {
    when(() => auth.authStateChanges).thenAnswer((_) => Stream.value(null));

    await tester.pumpWidget(
      app(),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 950));

    await tester.tap(find.text('Sign in'));
    await tester.pumpAndSettle();

    expect(find.byType(LoginScreen), findsOneWidget);

    await tester.tap(find.byIcon(Icons.arrow_back_rounded));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Create account'));
    await tester.pumpAndSettle();

    expect(find.byType(RegisterScreen), findsOneWidget);
  });

  testWidgets('auth success clears login stack and shows dashboard',
      (tester) async {
    final authController = StreamController<User?>.broadcast();
    when(() => auth.authStateChanges).thenAnswer((_) => authController.stream);
    when(
      () => auth.signInWithEmail(
        email: any(named: 'email'),
        password: any(named: 'password'),
      ),
    ).thenAnswer((_) async {
      final user = MockUser();
      when(() => user.uid).thenReturn('uid-login');
      authController.add(user);
      return FakeUserCredential();
    });

    final profile = completedProfile(uid: 'uid-login');
    stubCompletedProfile(profile);

    await tester.pumpWidget(
      app(),
    );
    authController.add(null);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 950));

    await tester.tap(find.text('Sign in').first);
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextFormField).at(0), 'a@b.com');
    await tester.enterText(find.byType(TextFormField).at(1), 'secret12');
    await tester.tap(find.text('Sign in').last);
    await tester.pump();
    await tester.pumpAndSettle();

    expect(find.byType(LoginScreen), findsNothing);
    expect(find.byTooltip('Home'), findsOneWidget);
    expect(find.byTooltip('Chats'), findsOneWidget);
    expect(find.byTooltip('AI'), findsOneWidget);

    await authController.close();
  });

  testWidgets('incomplete profile shows completion flow', (tester) async {
    final user = MockUser();
    when(() => user.uid).thenReturn('uid-new');
    when(() => auth.authStateChanges).thenAnswer((_) => Stream.value(user));

    final incomplete = UserProfile(
      uid: 'uid-new',
      email: 'new@b.com',
      role: UserRole.agent,
      isAnonymous: false,
      profileCompleted: false,
      agency: kDefaultAgency,
      createdAt: DateTime.utc(2024, 1, 1),
      updatedAt: DateTime.utc(2024, 1, 1),
    );
    when(() => users.ensureProfile(any())).thenAnswer((_) async => incomplete);
    when(() => users.watchProfile('uid-new'))
        .thenAnswer((_) => Stream.value(incomplete));

    await tester.pumpWidget(
      app(),
    );
    await tester.pump();
    await tester.pump();

    expect(find.byType(ProfileCompletionFlow), findsOneWidget);
    expect(find.textContaining('How does'), findsOneWidget);
    expect(find.text("I'm an agent"), findsOneWidget);
    expect(find.text("I'm a student"), findsOneWidget);
    expect(find.text('Desk'), findsNothing);
    expect(find.text('Home'), findsNothing);
  });

  testWidgets('guest CTA signs in anonymously', (tester) async {
    when(() => auth.authStateChanges).thenAnswer((_) => Stream.value(null));
    when(() => auth.signInAnonymously()).thenAnswer((_) async {
      return FakeUserCredential();
    });

    await tester.pumpWidget(
      app(),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 950));

    await tester.tap(find.text('Continue as guest'));
    await tester.pump();

    verify(() => auth.signInAnonymously()).called(1);
  });

  testWidgets('shows home shell tabs when signed in', (tester) async {
    final user = MockUser();
    when(() => user.uid).thenReturn('uid-1');
    when(() => auth.authStateChanges).thenAnswer((_) => Stream.value(user));

    final profile = completedProfile();
    stubCompletedProfile(profile);

    await tester.pumpWidget(
      app(),
    );
    await tester.pump();
    await tester.pump();

    expect(find.byTooltip('Home'), findsOneWidget);
    expect(find.byTooltip('Chats'), findsOneWidget);
    expect(find.byTooltip('AI'), findsOneWidget);
    expect(find.byTooltip('Academy'), findsOneWidget);
    expect(find.byTooltip('Profile'), findsOneWidget);
  });

  testWidgets('pulse shell tabs switch between feed chats and profile',
      (tester) async {
    final authService = MockAuthService();
    final usersRepo = MockUserRepository();
    final profile = completedProfile(role: UserRole.guest, anonymous: true);

    await tester.pumpWidget(
      MaterialApp(
        theme: buildEveryInsuranceTheme(Brightness.dark),
        locale: const Locale('en'),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: HomeShell(
          authService: authService,
          userRepository: usersRepo,
          profile: profile,
          forumRepository: ForumRepository(store: _EmptyForumStore()),
          chatRepository: emptyChats,
          courseRepository: emptyCourses,
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));

    expect(find.textContaining('Read-only'), findsOneWidget);

    await tester.tap(find.byTooltip('Chats'));
    await tester.pumpAndSettle();
    expect(find.textContaining('Sign up with an account'), findsOneWidget);

    await tester.tap(find.byTooltip('Profile'));
    await tester.pumpAndSettle();

    // headlineName is a denormalized Firestore field kept as-is (not localized).
    expect(find.text('Invitado'), findsOneWidget);
    expect(find.byTooltip('Settings'), findsOneWidget);
    expect(find.text('Tap to add a photo'), findsOneWidget);
    expect(find.text('uid-1'), findsNothing);
  });

  testWidgets('theme and accent changes keep Settings on the stack',
      (tester) async {
    tester.view.physicalSize = const Size(800, 1600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final user = MockUser();
    when(() => user.uid).thenReturn('uid-1');
    // Simulate AuthService returning a fresh stream on every getter access.
    when(() => auth.authStateChanges).thenAnswer((_) => Stream.value(user));

    final profile = completedProfile();
    stubCompletedProfile(profile);

    final themeController = ThemeController();
    await tester.pumpWidget(
      EveryInsuranceApp(
        authService: auth,
        userRepository: users,
        themeController: themeController,
        localeController: LocaleController(initialLocale: const Locale('en')),
        forumRepository: emptyForums,
        chatRepository: emptyChats,
        courseRepository: emptyCourses,
      ),
    );
    await tester.pump();
    await tester.pump();

    await tester.tap(find.byTooltip('Profile'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Settings'));
    await tester.pumpAndSettle();

    expect(find.byType(SettingsScreen), findsOneWidget);
    expect(find.text('BRAND SIGNAL'), findsOneWidget);

    // Theme mode lives in a dropdown; open it before picking a value.
    await tester.ensureVisible(find.text('Auto'));
    await tester.tap(find.text('Auto'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Dark').last);
    await tester.pumpAndSettle();
    expect(find.byType(SettingsScreen), findsOneWidget);
    expect(themeController.mode, ThemeMode.dark);

    final amber = find.bySemanticsLabel('Amber');
    await tester.ensureVisible(amber);
    await tester.tap(amber);
    await tester.pumpAndSettle();
    expect(find.byType(SettingsScreen), findsOneWidget);
    expect(themeController.primarySeedId, 'amber');
    expect(themeController.primaryColor, const Color(0xFFF5A524));
  });
}

class FakeUserCredential extends Fake implements UserCredential {}

class _EmptyForumStore implements ForumStore {
  @override
  Future<ForumThreadPage> queryThreads({
    String? tag,
    String? authorId,
    ForumSort sort = ForumSort.recent,
    int limit = kForumPageSize,
    Object? cursor,
  }) async =>
      const ForumThreadPage(threads: []);

  @override
  Stream<ForumThread?> watchThread(String threadId) => Stream.value(null);

  @override
  Stream<List<ForumReply>> watchReplies(
    String threadId, {
    int limit = kForumReplyPageSize,
  }) =>
      Stream.value(const []);

  @override
  Stream<RelevanceVote> watchThreadVote({
    required String threadId,
    required String uid,
  }) =>
      Stream.value(RelevanceVote.none);

  @override
  Stream<RelevanceVote> watchReplyVote({
    required String threadId,
    required String replyId,
    required String uid,
  }) =>
      Stream.value(RelevanceVote.none);

  @override
  Future<Map<String, RelevanceVote>> fetchReplyVotes({
    required String threadId,
    required String uid,
    required List<String> replyIds,
  }) async =>
      {for (final id in replyIds) id: RelevanceVote.none};

  @override
  Future<Map<String, RelevanceVote>> fetchThreadVotes({
    required String uid,
    required List<String> threadIds,
  }) async =>
      {for (final id in threadIds) id: RelevanceVote.none};

  @override
  Future<List<ForumThread>> fetchThreadsByIds(List<String> ids) async =>
      const [];

  @override
  Future<ForumThread> createThread({
    required List<String> tags,
    required String title,
    required String body,
    required UserProfile author,
  }) {
    throw UnimplementedError();
  }

  @override
  Future<void> updateThread({
    required String threadId,
    required String title,
    required String body,
    required List<String> tags,
  }) async {}

  @override
  Future<ForumReply> addReply({
    required String threadId,
    required String body,
    required UserProfile author,
  }) {
    throw UnimplementedError();
  }

  @override
  Future<void> updateReply({
    required String threadId,
    required String replyId,
    required String body,
  }) async {}

  @override
  Future<void> deleteThread(String threadId) async {}

  @override
  Future<void> deleteReply({
    required String threadId,
    required String replyId,
  }) async {}

  @override
  Future<void> setAcceptedReply({
    required String threadId,
    required String? replyId,
  }) async {}

  @override
  Future<void> setThreadRelevance({
    required String threadId,
    required String uid,
    required RelevanceVote vote,
  }) async {}

  @override
  Future<void> setReplyRelevance({
    required String threadId,
    required String replyId,
    required String uid,
    required RelevanceVote vote,
  }) async {}

  @override
  Future<void> syncAuthorPhotoUrl({
    required String authorId,
    required String? photoUrl,
  }) async {}
}

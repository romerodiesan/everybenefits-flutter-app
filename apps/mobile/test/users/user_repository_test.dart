import 'dart:async';
import 'dart:typed_data';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:every_benefits/users/avatar_storage.dart';
import 'package:every_benefits/users/user_profile.dart';
import 'package:every_benefits/users/user_repository.dart';
import 'package:every_benefits/users/user_role.dart';

class MockUser extends Mock implements User {}

class FakeUserStore implements UserProfileStore {
  final Map<String, UserProfile> profiles = {};
  final Map<String, StreamController<UserProfile?>> _controllers = {};

  StreamController<UserProfile?> _controllerFor(String uid) {
    return _controllers.putIfAbsent(
      uid,
      () => StreamController<UserProfile?>.broadcast(),
    );
  }

  void dispose() {
    for (final controller in _controllers.values) {
      controller.close();
    }
  }

  @override
  Future<UserProfile?> get(String uid) async => profiles[uid];

  @override
  Future<void> create(UserProfile profile) async {
    profiles[profile.uid] = profile;
    _controllerFor(profile.uid).add(profile);
  }

  @override
  Future<void> update(UserProfile profile) async {
    profiles[profile.uid] = profile;
    _controllerFor(profile.uid).add(profile);
  }

  @override
  Stream<UserProfile?> watch(String uid) async* {
    yield profiles[uid];
    yield* _controllerFor(uid).stream;
  }

  @override
  Future<List<UserProfile>> listDirectory({
    String? excludeUid,
    int limit = 80,
  }) async {
    return profiles.values
        .where(
          (p) =>
              !p.isAnonymous &&
              p.role != UserRole.guest &&
              p.uid != excludeUid,
        )
        .take(limit)
        .toList();
  }
}

void main() {
  late FakeUserStore store;
  late UserRepository repository;
  late MockUser user;

  setUp(() {
    store = FakeUserStore();
    repository = UserRepository(
      store: store,
      syncAuthProfile: ({
        required uid,
        displayName,
        photoUrl,
      }) async {},
    );
    user = MockUser();
  });

  tearDown(() => store.dispose());

  group('ensureProfile', () {
    test('creates completed guest profile for anonymous users', () async {
      when(() => user.uid).thenReturn('anon-1');
      when(() => user.isAnonymous).thenReturn(true);
      when(() => user.email).thenReturn(null);
      when(() => user.displayName).thenReturn(null);

      final profile = await repository.ensureProfile(user);

      expect(profile.uid, 'anon-1');
      expect(profile.role, UserRole.guest);
      expect(profile.isAnonymous, isTrue);
      expect(profile.profileCompleted, isTrue);
      expect(store.profiles['anon-1']?.role, UserRole.guest);
    });

    test('creates incomplete student profile for registered users', () async {
      when(() => user.uid).thenReturn('user-1');
      when(() => user.isAnonymous).thenReturn(false);
      when(() => user.email).thenReturn('a@b.com');
      when(() => user.displayName).thenReturn('Ada');

      final profile = await repository.ensureProfile(user);

      expect(profile.role, UserRole.student);
      expect(profile.email, 'a@b.com');
      expect(profile.displayName, 'Ada');
      expect(profile.profileCompleted, isFalse);
      expect(profile.agency, kDefaultAgency);
      expect(profile.approvalStatus, 'pending');
    });

    test('creates guest with approved approvalStatus', () async {
      when(() => user.uid).thenReturn('anon-2');
      when(() => user.isAnonymous).thenReturn(true);
      when(() => user.email).thenReturn(null);
      when(() => user.displayName).thenReturn(null);

      final profile = await repository.ensureProfile(user);
      expect(profile.approvalStatus, 'approved');
    });

    test('returns existing profile without overwriting role', () async {
      final existing = UserProfile(
        uid: 'user-1',
        email: 'old@b.com',
        displayName: 'Old',
        role: UserRole.admin,
        isAnonymous: false,
        profileCompleted: true,
        createdAt: DateTime.utc(2024, 1, 1),
        updatedAt: DateTime.utc(2024, 1, 1),
      );
      store.profiles['user-1'] = existing;

      when(() => user.uid).thenReturn('user-1');
      when(() => user.isAnonymous).thenReturn(false);
      when(() => user.email).thenReturn('new@b.com');
      when(() => user.displayName).thenReturn('New');

      final profile = await repository.ensureProfile(user);

      expect(profile.role, UserRole.admin);
      expect(profile.email, 'old@b.com');
    });
  });

  group('updateProfile', () {
    test('persists student completion fields', () async {
      final base = UserProfile(
        uid: 'user-1',
        role: UserRole.agent,
        isAnonymous: false,
        profileCompleted: false,
        createdAt: DateTime.utc(2024, 1, 1),
        updatedAt: DateTime.utc(2024, 1, 1),
      );
      store.profiles['user-1'] = base;

      final updated = await repository.updateProfile(
        base.copyWith(
          role: UserRole.student,
          displayName: 'Sam',
          phoneCountryCode: '+506',
          phoneNumber: '88887777',
          profileCompleted: true,
          clearNpn: true,
          clearAddress: true,
          clearAgency: true,
        ),
      );

      expect(updated.role, UserRole.student);
      expect(updated.displayName, 'Sam');
      expect(updated.fullPhone, '+50688887777');
      expect(updated.profileCompleted, isTrue);
      expect(updated.npn, isNull);
      expect(store.profiles['user-1']?.displayName, 'Sam');
    });

    test('syncs displayName and photoUrl to Firebase Auth', () async {
      final base = UserProfile(
        uid: 'user-1',
        role: UserRole.student,
        isAnonymous: false,
        profileCompleted: true,
        displayName: 'Old',
        photoUrl: 'https://old/photo.jpg',
        createdAt: DateTime.utc(2024, 1, 1),
        updatedAt: DateTime.utc(2024, 1, 1),
      );
      store.profiles['user-1'] = base;

      String? syncedUid;
      String? syncedName;
      String? syncedPhoto;
      final repo = UserRepository(
        store: store,
        syncAuthProfile: ({
          required uid,
          displayName,
          photoUrl,
        }) async {
          syncedUid = uid;
          syncedName = displayName;
          syncedPhoto = photoUrl;
        },
      );

      await repo.updateProfile(
        base.copyWith(
          displayName: 'New Name',
          photoUrl: 'https://cdn.example/new.jpg',
        ),
      );

      expect(syncedUid, 'user-1');
      expect(syncedName, 'New Name');
      expect(syncedPhoto, 'https://cdn.example/new.jpg');
    });
  });

  group('updateAvatar', () {
    test('persists photoUrl and notifies onAuthorPhotoChanged', () async {
      final base = UserProfile(
        uid: 'user-1',
        role: UserRole.agent,
        isAnonymous: false,
        profileCompleted: true,
        photoUrl: 'https://old/photo.jpg',
        createdAt: DateTime.utc(2024, 1, 1),
        updatedAt: DateTime.utc(2024, 1, 1),
      );
      store.profiles['user-1'] = base;

      String? syncedAuthorId;
      String? syncedPhotoUrl;
      final repo = UserRepository(
        store: store,
        syncAuthProfile: ({
          required uid,
          displayName,
          photoUrl,
        }) async {},
        avatarStorage: AvatarStorage.test(
          ({required uid, required bytes}) async =>
              'https://cdn.example/avatars/$uid.jpg?alt=media&token=abc&v=99',
        ),
        onAuthorPhotoChanged: ({required authorId, required photoUrl}) async {
          syncedAuthorId = authorId;
          syncedPhotoUrl = photoUrl;
        },
      );

      final updated = await repo.updateAvatar(
        profile: base,
        bytes: Uint8List.fromList([1, 2, 3]),
      );

      expect(
        updated.photoUrl,
        'https://cdn.example/avatars/user-1.jpg?alt=media&token=abc',
      );
      expect(store.profiles['user-1']?.photoUrl, updated.photoUrl);
      expect(syncedAuthorId, 'user-1');
      expect(syncedPhotoUrl, updated.photoUrl);
    });

    test('still persists photoUrl when onAuthorPhotoChanged throws', () async {
      final base = UserProfile(
        uid: 'user-1',
        role: UserRole.agent,
        isAnonymous: false,
        profileCompleted: true,
        photoUrl: 'https://old/photo.jpg',
        createdAt: DateTime.utc(2024, 1, 1),
        updatedAt: DateTime.utc(2024, 1, 1),
      );
      store.profiles['user-1'] = base;

      final repo = UserRepository(
        store: store,
        syncAuthProfile: ({
          required uid,
          displayName,
          photoUrl,
        }) async {},
        avatarStorage: AvatarStorage.test(
          ({required uid, required bytes}) async =>
              'https://cdn.example/avatars/$uid.jpg?alt=media&token=abc',
        ),
        onAuthorPhotoChanged: ({required authorId, required photoUrl}) async {
          throw StateError('permission-denied');
        },
      );

      final updated = await repo.updateAvatar(
        profile: base,
        bytes: Uint8List.fromList([1, 2, 3]),
      );

      expect(
        updated.photoUrl,
        'https://cdn.example/avatars/user-1.jpg?alt=media&token=abc',
      );
      expect(store.profiles['user-1']?.photoUrl, updated.photoUrl);
    });
  });
}

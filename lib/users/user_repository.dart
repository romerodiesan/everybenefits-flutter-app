import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

import '../firebase/firebase_emulators.dart';
import 'avatar_storage.dart';
import 'user_profile.dart';
import 'user_role.dart';

/// Persistence port for [UserRepository] (testable without Firestore).
abstract class UserProfileStore {
  Future<UserProfile?> get(String uid);

  Future<void> create(UserProfile profile);

  Future<void> update(UserProfile profile);

  Stream<UserProfile?> watch(String uid);

  /// Directory of peers for starting chats (excludes anonymous guests).
  Future<List<UserProfile>> listDirectory({
    String? excludeUid,
    int limit = 80,
  });
}

class FirestoreUserProfileStore implements UserProfileStore {
  FirestoreUserProfileStore({FirebaseFirestore? firestore})
      : _firestore = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _firestore;

  CollectionReference<Map<String, dynamic>> get _users =>
      _firestore.collection('users');

  Map<String, Object?> _payload(UserProfile profile) {
    return {
      'uid': profile.uid,
      'email': profile.email,
      'displayName': profile.displayName,
      'photoUrl': profile.photoUrl,
      'role': profile.role.wireValue,
      'isAnonymous': profile.isAnonymous,
      'profileCompleted': profile.profileCompleted,
      'phoneCountryCode': profile.phoneCountryCode,
      'phoneNumber': profile.phoneNumber,
      'npn': profile.npn,
      'address': profile.address,
      'addressStreet': profile.addressStreet,
      'addressApt': profile.addressApt,
      'addressCity': profile.addressCity,
      'addressState': profile.addressState,
      'addressZip': profile.addressZip,
      'agency': profile.agency,
      'updatedAt': FieldValue.serverTimestamp(),
    };
  }

  @override
  Future<UserProfile?> get(String uid) async {
    // Prefer cache for first paint; fall back to server when cold.
    try {
      final cached = await _users.doc(uid).get(
            const GetOptions(source: Source.cache),
          );
      if (cached.exists && cached.data() != null) {
        return UserProfile.fromMap(cached.data()!);
      }
    } catch (_) {
      // Cache miss is expected on first launch / emulator without persistence.
    }
    final snapshot = await _users.doc(uid).get(
          const GetOptions(source: Source.serverAndCache),
        );
    if (!snapshot.exists || snapshot.data() == null) return null;
    return UserProfile.fromMap(snapshot.data()!);
  }

  @override
  Future<void> create(UserProfile profile) async {
    await _users.doc(profile.uid).set({
      ..._payload(profile),
      'createdAt': FieldValue.serverTimestamp(),
    });
  }

  @override
  Future<void> update(UserProfile profile) async {
    await _users.doc(profile.uid).update(_payload(profile));
  }

  @override
  Stream<UserProfile?> watch(String uid) {
    return _users.doc(uid).snapshots().map((snapshot) {
      if (!snapshot.exists || snapshot.data() == null) return null;
      return UserProfile.fromMap(snapshot.data()!);
    });
  }

  @override
  Future<List<UserProfile>> listDirectory({
    String? excludeUid,
    int limit = 80,
  }) async {
    final snap = await _users
        .where('isAnonymous', isEqualTo: false)
        .limit(limit + (excludeUid == null ? 0 : 1))
        .get();
    final list = snap.docs
        .map((d) => UserProfile.fromMap(d.data()))
        .where((p) => p.uid != excludeUid && p.role != UserRole.guest)
        .take(limit)
        .toList()
      ..sort(
        (a, b) => a.headlineName.toLowerCase().compareTo(
              b.headlineName.toLowerCase(),
            ),
      );
    return list;
  }
}

class UserRepository {
  UserRepository({
    UserProfileStore? store,
    AvatarStorage? avatarStorage,
  })  : _store = store ?? FirestoreUserProfileStore(),
        _avatarStorageOverride = avatarStorage;

  final UserProfileStore _store;
  final AvatarStorage? _avatarStorageOverride;

  AvatarStorage get _avatarStorage =>
      _avatarStorageOverride ?? AvatarStorage();

  Future<UserProfile> ensureProfile(User user) async {
    String? token;
    String? firestoreHost;
    var emulatorToken = false;
    if (kDebugMode && _store is FirestoreUserProfileStore) {
      token = await user.getIdToken(true);
      firestoreHost = FirebaseFirestore.instance.settings.host;
      emulatorToken = isAuthEmulatorIdToken(token);
      debugPrint(
        'ensureProfile uid=${user.uid} anonymous=${user.isAnonymous} '
        'tokenLen=${token?.length ?? 0} emulatorToken=$emulatorToken '
        'firestoreHost=$firestoreHost',
      );
    }

    try {
      final existing = await _store.get(user.uid);
      if (existing != null) return existing;

      final now = DateTime.now().toUtc();
      final isAnonymous = user.isAnonymous;
      final profile = UserProfile(
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoUrl: user.photoURL,
        role: isAnonymous ? UserRole.guest : UserRole.student,
        isAnonymous: isAnonymous,
        profileCompleted: isAnonymous,
        createdAt: now,
        updatedAt: now,
        agency: isAnonymous ? null : kDefaultAgency,
      );
      await _store.create(profile);
      return profile;
    } on FirebaseException catch (error) {
      if (error.code == 'permission-denied' && emulatorToken) {
        throw StateError(
          'Firestore permission-denied with Auth Emulator token '
          '(dart host=$firestoreHost). Usually the native Firestore client '
          'was created before emulator settings. Fully quit the app and '
          '`flutter run` again (not hot restart).',
        );
      }
      rethrow;
    }
  }

  Future<UserProfile> updateProfile(UserProfile profile) async {
    final next = profile.copyWith(updatedAt: DateTime.now().toUtc());
    await _store.update(next);
    return next;
  }

  Future<UserProfile> updateAvatar({
    required UserProfile profile,
    required Uint8List bytes,
  }) async {
    final url = await _avatarStorage.uploadAvatar(
      uid: profile.uid,
      bytes: bytes,
    );
    return updateProfile(profile.copyWith(photoUrl: url));
  }

  Stream<UserProfile?> watchProfile(String uid) => _store.watch(uid);

  Future<List<UserProfile>> listDirectory({
    String? excludeUid,
    int limit = 80,
  }) {
    return _store.listDirectory(excludeUid: excludeUid, limit: limit);
  }
}

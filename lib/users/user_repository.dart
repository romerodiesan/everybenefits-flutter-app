import 'dart:typed_data';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import 'avatar_storage.dart';
import 'user_profile.dart';
import 'user_role.dart';

/// Persistence port for [UserRepository] (testable without Firestore).
abstract class UserProfileStore {
  Future<UserProfile?> get(String uid);

  Future<void> create(UserProfile profile);

  Future<void> update(UserProfile profile);

  Stream<UserProfile?> watch(String uid);
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
      'agency': profile.agency,
      'updatedAt': FieldValue.serverTimestamp(),
    };
  }

  @override
  Future<UserProfile?> get(String uid) async {
    final snapshot = await _users.doc(uid).get();
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
    final existing = await _store.get(user.uid);
    if (existing != null) return existing;

    final now = DateTime.now().toUtc();
    final isAnonymous = user.isAnonymous;
    final profile = UserProfile(
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoUrl: user.photoURL,
      role: isAnonymous ? UserRole.guest : UserRole.agent,
      isAnonymous: isAnonymous,
      // Guests skip the completion wizard; registered users must finish it.
      profileCompleted: isAnonymous,
      createdAt: now,
      updatedAt: now,
      agency: isAnonymous ? null : kDefaultAgency,
    );
    await _store.create(profile);
    return profile;
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
}

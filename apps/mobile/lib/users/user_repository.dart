import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

import '../firebase/firebase_emulators.dart';
import 'avatar_storage.dart';
import 'profile_validation.dart';
import 'user_profile.dart';
import 'user_role.dart';

/// Persistence port for [UserRepository] (testable without Firestore).
abstract class UserProfileStore {
  Future<UserProfile?> get(String uid);

  Future<void> create(UserProfile profile);

  Future<void> update(UserProfile profile);

  /// Patch search index fields only (displayNameLower / emailLower / nameTokens).
  Future<void> updateSearchIndex({
    required String uid,
    required String? displayName,
    required String? email,
  });

  Stream<UserProfile?> watch(String uid);

  /// Directory of peers for starting chats (excludes anonymous guests).
  Future<List<UserProfile>> listDirectory({
    String? excludeUid,
    int limit = 80,
  });

  /// Updates Firebase Auth + `users/{uid}.email` via Cloud Functions.
  Future<String> updateAccountEmail(String email);
}

class FirestoreUserProfileStore implements UserProfileStore {
  FirestoreUserProfileStore({
    FirebaseFirestore? firestore,
    FirebaseFunctions? functions,
  })  : _firestore = firestore ?? FirebaseFirestore.instance,
        _functions = functions ??
            FirebaseFunctions.instanceFor(region: 'us-central1');

  final FirebaseFirestore _firestore;
  final FirebaseFunctions _functions;

  CollectionReference<Map<String, dynamic>> get _users =>
      _firestore.collection('users');

  Map<String, Object?> _payload(UserProfile profile) {
    final search = _searchFields(profile.displayName, profile.email);
    return {
      'uid': profile.uid,
      'email': profile.email,
      ...search,
      'photoUrl': profile.photoUrl,
      'role': profile.roleId,
      'isAnonymous': profile.isAnonymous,
      'profileCompleted': profile.profileCompleted,
      'productTourVersion': profile.productTourVersion,
      'phoneCountryCode': profile.phoneCountryCode,
      'phoneNumber': profile.phoneNumber,
      'phoneVerified': profile.phoneVerified,
      'npn': profile.npn,
      'address': profile.address,
      'addressStreet': profile.addressStreet,
      'addressApt': profile.addressApt,
      'addressCity': profile.addressCity,
      'addressState': profile.addressState,
      'addressZip': profile.addressZip,
      'agency': profile.agency,
      'bio': profile.bio,
      'orgNodeId': profile.orgNodeId,
      'updatedAt': FieldValue.serverTimestamp(),
    };
  }

  Map<String, Object?> _searchFields(String? displayName, String? email) {
    return userSearchIndexFields(displayName, email);
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
    // approvalStatus / accountStatus are set only on create — rules freeze
    // them for client updates (server/callables own lifecycle fields).
    await _users.doc(profile.uid).set({
      ..._payload(profile),
      'accountStatus': profile.accountStatus,
      if (profile.approvalStatus != null)
        'approvalStatus': profile.approvalStatus,
      'createdAt': FieldValue.serverTimestamp(),
    });
  }

  @override
  Future<void> update(UserProfile profile) async {
    final payload = Map<String, Object?>.from(_payload(profile))
      ..remove('email');
    await _users.doc(profile.uid).update(payload);
  }

  @override
  Future<void> updateSearchIndex({
    required String uid,
    required String? displayName,
    required String? email,
  }) async {
    await _users.doc(uid).update({
      ..._searchFields(displayName, email),
      'updatedAt': FieldValue.serverTimestamp(),
    });
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
    final result = await _functions.httpsCallable('listPublicProfiles').call(
      <String, dynamic>{'limit': limit + (excludeUid == null ? 0 : 1)},
    );
    final payload = result.data is Map ? result.data as Map : const {};
    final raw = payload['profiles'];
    final list = (raw is List ? raw : const [])
        .whereType<Map>()
        .map((data) => UserProfile.fromMap(Map<String, dynamic>.from(data)))
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

  @override
  Future<String> updateAccountEmail(String email) async {
    final result = await _functions.httpsCallable('updateAccountEmail').call(
      <String, dynamic>{'email': email.trim().toLowerCase()},
    );
    final data = result.data is Map ? result.data as Map : const {};
    final next = '${data['email'] ?? email}'.trim().toLowerCase();
    await FirebaseAuth.instance.currentUser?.reload();
    return next;
  }
}

typedef AuthorPhotoChanged = Future<void> Function({
  required String authorId,
  required String? photoUrl,
});

/// Pushes Firestore identity fields onto the signed-in Firebase Auth user.
typedef AuthProfileSync = Future<void> Function({
  required String uid,
  String? displayName,
  String? photoUrl,
});

Future<void> syncFirebaseAuthProfile({
  required String uid,
  String? displayName,
  String? photoUrl,
  FirebaseAuth? auth,
}) async {
  final user = (auth ?? FirebaseAuth.instance).currentUser;
  if (user == null || user.uid != uid) {
    throw StateError('Signed-in user required to update Auth profile fields.');
  }
  final name = displayName?.trim();
  // Soft-fail Auth mirror — emulator / invalid photo URLs must not roll back
  // a successful Firestore profile write.
  try {
    await user.updateDisplayName(name == null || name.isEmpty ? null : name);
  } catch (error) {
    debugPrint('Auth displayName sync skipped: $error');
  }
  try {
    await user.updatePhotoURL(photoUrl);
  } catch (error) {
    debugPrint('Auth photoURL sync skipped: $error');
  }
}

class UserRepository {
  UserRepository({
    UserProfileStore? store,
    AvatarStorage? avatarStorage,
    this.onAuthorPhotoChanged,
    AuthProfileSync? syncAuthProfile,
  })  : _store = store ?? FirestoreUserProfileStore(),
        _avatarStorageOverride = avatarStorage,
        _syncAuthProfile = syncAuthProfile ?? syncFirebaseAuthProfile;

  final UserProfileStore _store;
  final AvatarStorage? _avatarStorageOverride;
  final AuthorPhotoChanged? onAuthorPhotoChanged;
  final AuthProfileSync _syncAuthProfile;

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
      if (existing != null) {
        await _maybeBackfillSearchIndex(existing);
        return existing;
      }

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
        approvalStatus: isAnonymous ? 'approved' : 'pending',
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

  /// Mirrors web ensureProfile search self-heal when tokens/lower fields drift.
  Future<void> _maybeBackfillSearchIndex(UserProfile profile) async {
    final expected = userSearchIndexFields(profile.displayName, profile.email);
    final expectedTokens =
        (expected['nameTokens'] as List?)?.cast<String>() ?? const <String>[];
    final expectedDisplayLower = expected['displayNameLower'] as String?;
    final expectedEmailLower = expected['emailLower'] as String?;
    final existingTokens = profile.nameTokens ?? const <String>[];

    final needsBackfill =
        profile.displayNameLower != expectedDisplayLower ||
            profile.emailLower != expectedEmailLower ||
            !_sameTokenList(existingTokens, expectedTokens);

    if (!needsBackfill) return;

    try {
      await _store.updateSearchIndex(
        uid: profile.uid,
        displayName: profile.displayName,
        email: profile.email,
      );
    } catch (error) {
      debugPrint('Search index backfill skipped: $error');
    }
  }

  bool _sameTokenList(List<String> a, List<String> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  Future<UserProfile> updateProfile(UserProfile profile) async {
    final next = profile.copyWith(updatedAt: DateTime.now().toUtc());
    await _store.update(next);
    try {
      await _syncAuthProfile(
        uid: next.uid,
        displayName: next.displayName,
        photoUrl: next.photoUrl,
      );
    } catch (error) {
      debugPrint('Auth profile sync skipped: $error');
    }
    return next;
  }

  Future<String> updateAccountEmail(String email) {
    return _store.updateAccountEmail(email);
  }

  Future<UserProfile> updateAvatar({
    required UserProfile profile,
    required Uint8List bytes,
  }) async {
    final url = await _avatarStorage.uploadAvatar(
      uid: profile.uid,
      bytes: bytes,
    );
    final next = await updateProfile(
      profile.copyWith(photoUrl: sanitizeAvatarDownloadUrl(url)),
    );
    // Photo sync is best-effort — don't fail the avatar upload if cascade
    // hits rules/index issues (e.g. collectionGroup without a matching rule).
    try {
      await onAuthorPhotoChanged?.call(
        authorId: next.uid,
        photoUrl: next.photoUrl,
      );
    } catch (error, stack) {
      debugPrint('Author photo cascade failed: $error\n$stack');
    }
    return next;
  }

  Stream<UserProfile?> watchProfile(String uid) => _store.watch(uid);

  Future<List<UserProfile>> listDirectory({
    String? excludeUid,
    int limit = 80,
  }) {
    return _store.listDirectory(excludeUid: excludeUid, limit: limit);
  }
}

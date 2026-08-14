import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';

import '../users/user_profile.dart';
import '../users/user_role.dart';

enum SocialStatus { none, outgoing, incoming, contact }

class SocialRelationship {
  const SocialRelationship({
    required this.status,
    required this.muted,
    required this.blockedByMe,
    required this.isSelf,
  });

  final SocialStatus status;
  final bool muted;
  final bool blockedByMe;
  final bool isSelf;

  factory SocialRelationship.fromMap(Map<dynamic, dynamic> data) {
    final raw = '${data['status'] ?? 'none'}';
    final status = SocialStatus.values.firstWhere(
      (value) => value.name == raw,
      orElse: () => SocialStatus.none,
    );
    return SocialRelationship(
      status: status,
      muted: data['muted'] == true,
      blockedByMe: data['blockedByMe'] == true,
      isSelf: data['isSelf'] == true,
    );
  }
}

UserProfile publicCardFromMap(Map<dynamic, dynamic> data) {
    return UserProfile.fromMap({
      'uid': '${data['uid'] ?? ''}',
    'displayName': data['displayName'],
    'photoUrl': data['photoUrl'],
    'role': data['role'] ?? 'student',
    'agency': data['agency'],
    'bio': data['bio'],
    'profileBadge': data['profileBadge'],
    'isAnonymous': false,
    'profileCompleted': data['profileCompleted'] ?? true,
    'createdAt': DateTime.now().toUtc().toIso8601String(),
    'updatedAt': DateTime.now().toUtc().toIso8601String(),
  });
}

class SocialRepository {
  SocialRepository({
    FirebaseFunctions? functions,
    FirebaseFirestore? firestore,
  })  : _functions = functions ??
            FirebaseFunctions.instanceFor(region: 'us-central1'),
        _firestore = firestore ?? FirebaseFirestore.instance;

  final FirebaseFunctions _functions;
  final FirebaseFirestore _firestore;

  Future<UserProfile?> fetchPublicProfile(String uid) async {
    final snap = await _firestore.doc('publicProfiles/$uid').get();
    if (!snap.exists || snap.data() == null) return null;
    return publicCardFromMap({'uid': snap.id, ...snap.data()!});
  }

  Future<SocialRelationship> getRelationship(String otherUid) async {
    final result = await _functions.httpsCallable('getSocialRelationship').call(
      <String, dynamic>{'otherUid': otherUid},
    );
    final data = result.data is Map ? result.data as Map : const {};
    return SocialRelationship.fromMap(data);
  }

  Future<void> sendRequest(String otherUid) async {
    await _functions.httpsCallable('sendContactRequest').call(
      <String, dynamic>{'otherUid': otherUid},
    );
  }

  Future<void> acceptRequest(String otherUid) async {
    await _functions.httpsCallable('acceptContactRequest').call(
      <String, dynamic>{'otherUid': otherUid},
    );
  }

  Future<void> declineRequest(String otherUid) async {
    await _functions.httpsCallable('declineContactRequest').call(
      <String, dynamic>{'otherUid': otherUid},
    );
  }

  Future<void> cancelRequest(String otherUid) async {
    await _functions.httpsCallable('cancelContactRequest').call(
      <String, dynamic>{'otherUid': otherUid},
    );
  }

  Future<void> removeContact(String otherUid) async {
    await _functions.httpsCallable('removeContact').call(
      <String, dynamic>{'otherUid': otherUid},
    );
  }

  Future<void> setBlocked(String otherUid, {required bool blocked}) async {
    await _functions.httpsCallable('setBlocked').call(
      <String, dynamic>{'otherUid': otherUid, 'blocked': blocked},
    );
  }

  Future<void> setMuted(String otherUid, {required bool muted}) async {
    await _functions.httpsCallable('setMuted').call(
      <String, dynamic>{'otherUid': otherUid, 'muted': muted},
    );
  }

  Future<List<UserProfile>> listContacts() async {
    final result = await _functions.httpsCallable('listContacts').call();
    return _cards(result.data);
  }

  Future<List<UserProfile>> listIncomingRequests() async {
    final result =
        await _functions.httpsCallable('listIncomingContactRequests').call();
    return _cards(result.data);
  }

  List<UserProfile> _cards(Object? data) {
    final payload = data is Map ? data : const {};
    final raw = payload['profiles'];
    return (raw is List ? raw : const [])
        .whereType<Map>()
        .map(publicCardFromMap)
        .where((p) => p.uid.isNotEmpty && p.role != UserRole.guest)
        .toList();
  }
}

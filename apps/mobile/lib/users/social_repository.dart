import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';

import '../firebase/https_callable.dart';
import '../users/user_profile.dart';

enum SocialStatus { none, outgoing, incoming, contact }

enum MemberReportReason { spam, harassment, impersonation, other }

class SocialRelationship {
  const SocialRelationship({
    required this.status,
    required this.muted,
    required this.blockedByMe,
    required this.isSelf,
    this.following = false,
  });

  final SocialStatus status;
  final bool muted;
  final bool blockedByMe;
  final bool isSelf;
  final bool following;

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
      following: data['following'] == true,
    );
  }
}

UserProfile publicCardFromMap(Map<dynamic, dynamic> data) {
  return UserProfile.fromMap({
    'uid': '${data['uid'] ?? ''}',
    'displayName': data['displayName'],
    'username': data['username'],
    'photoUrl': data['photoUrl'],
    'role': data['role'] ?? 'student',
    'agency': data['agency'],
    'bio': data['bio'],
    'profileBadge': data['profileBadge'],
    'addressCity': data['addressCity'],
    'addressState': data['addressState'],
    'followerCount': data['followerCount'] ?? 0,
    'followingCount': data['followingCount'] ?? 0,
    'isAnonymous': false,
    'profileCompleted': data['profileCompleted'] ?? true,
    'createdAt': data['createdAt'] ?? DateTime.now().toUtc().toIso8601String(),
    'updatedAt': data['updatedAt'] ?? DateTime.now().toUtc().toIso8601String(),
  });
}

final _claimedHandle = RegExp(r'^[a-z0-9_]{3,20}$');

class SocialRepository {
  SocialRepository({
    FirebaseFunctions? functions,
    FirebaseFirestore? firestore,
    HttpsCallableClient? callables,
  }) : _callables = callables ?? HttpsCallableClient(functions: functions),
       _firestoreOverride = firestore;

  final HttpsCallableClient _callables;
  final FirebaseFirestore? _firestoreOverride;

  FirebaseFirestore get _firestore =>
      _firestoreOverride ?? FirebaseFirestore.instance;

  Future<String?> _resolveProfileUid(String handleOrUid) async {
    final raw = handleOrUid.trim();
    if (raw.isEmpty) return null;
    final handle = raw.toLowerCase();
    if (_claimedHandle.hasMatch(handle)) {
      try {
        final reserved = await _firestore.doc('usernames/$handle').get();
        final reservedUid = '${reserved.data()?['uid'] ?? ''}'.trim();
        if (reserved.exists && reservedUid.isNotEmpty) return reservedUid;
      } catch (_) {
        // Reservation read can fail if rules lag; try the public card next.
      }
      final hits = await _firestore
          .collection('publicProfiles')
          .where('username', isEqualTo: handle)
          .limit(1)
          .get();
      if (hits.docs.isNotEmpty) return hits.docs.first.id;
    }
    return raw;
  }

  Future<UserProfile?> fetchPublicProfile(String handleOrUid) async {
    final uid = await _resolveProfileUid(handleOrUid);
    if (uid == null || uid.isEmpty) return null;
    final snap = await _firestore.doc('publicProfiles/$uid').get();
    if (!snap.exists || snap.data() == null) return null;
    return publicCardFromMap({...snap.data()!, 'uid': snap.id});
  }

  Future<SocialRelationship> getRelationship(String otherUid) async {
    final result = await _callables.call(
      'getSocialRelationship',
      <String, dynamic>{'otherUid': otherUid},
    );
    final data = result is Map ? result : const {};
    return SocialRelationship.fromMap(data);
  }

  Future<void> sendRequest(String otherUid) async {
    await _callables.call('sendContactRequest', <String, dynamic>{
      'otherUid': otherUid,
    });
  }

  Future<void> acceptRequest(String otherUid) async {
    await _callables.call(
      'acceptContactRequest',
      <String, dynamic>{'otherUid': otherUid},
    );
  }

  Future<void> declineRequest(String otherUid) async {
    await _callables.call(
      'declineContactRequest',
      <String, dynamic>{'otherUid': otherUid},
    );
  }

  Future<void> cancelRequest(String otherUid) async {
    await _callables.call(
      'cancelContactRequest',
      <String, dynamic>{'otherUid': otherUid},
    );
  }

  Future<void> removeContact(String otherUid) async {
    await _callables.call('removeContact', <String, dynamic>{
      'otherUid': otherUid,
    });
  }

  Future<void> setBlocked(String otherUid, {required bool blocked}) async {
    await _callables.call('setBlocked', <String, dynamic>{
      'otherUid': otherUid,
      'blocked': blocked,
    });
  }

  Future<void> setMuted(String otherUid, {required bool muted}) async {
    await _callables.call('setMuted', <String, dynamic>{
      'otherUid': otherUid,
      'muted': muted,
    });
  }

  Future<void> follow(String otherUid) async {
    await _callables.call('followUser', <String, dynamic>{
      'otherUid': otherUid,
    });
  }

  Future<void> unfollow(String otherUid) async {
    await _callables.call('unfollowUser', <String, dynamic>{
      'otherUid': otherUid,
    });
  }

  Future<void> reportMember(
    String otherUid, {
    required MemberReportReason reason,
    String? details,
  }) async {
    await _callables.call('reportMember', <String, dynamic>{
      'otherUid': otherUid,
      'reason': reason.name,
      if (details != null && details.trim().isNotEmpty)
        'details': details.trim(),
    });
  }

  Future<List<UserProfile>> listContacts({int limit = 24}) async {
    final result = await _callables.call(
      'listContacts',
      <String, dynamic>{'limit': limit},
    );
    return _cards(result);
  }

  Future<List<UserProfile>> listIncomingRequests() async {
    final result = await _callables.call('listIncomingContactRequests');
    return _cards(result);
  }

  Future<List<UserProfile>> listFollowers(String otherUid) async {
    final result = await _callables.call(
      'listFollowers',
      <String, dynamic>{'otherUid': otherUid},
    );
    return _cards(result);
  }

  Future<List<UserProfile>> listFollowing(String otherUid) async {
    final result = await _callables.call(
      'listFollowing',
      <String, dynamic>{'otherUid': otherUid},
    );
    return _cards(result);
  }

  List<UserProfile> _cards(Object? data) {
    final payload = data is Map ? data : const {};
    final raw = payload['profiles'];
    return (raw is List ? raw : const [])
        .whereType<Map>()
        .map(publicCardFromMap)
        .where((p) => p.uid.isNotEmpty)
        .toList();
  }
}

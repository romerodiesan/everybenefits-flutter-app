import 'dart:convert';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:crypto/crypto.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

import '../../firebase/https_callable.dart';
import 'notification_models.dart';

class NotificationRepository {
  NotificationRepository({
    FirebaseFirestore? firestore,
    FirebaseFunctions? functions,
    FirebaseMessaging? messaging,
    HttpsCallableClient? callables,
  })  : _db = firestore ?? FirebaseFirestore.instance,
        _callables = callables ?? HttpsCallableClient(functions: functions),
        _messaging = messaging ?? FirebaseMessaging.instance;

  final FirebaseFirestore _db;
  final HttpsCallableClient _callables;
  final FirebaseMessaging _messaging;

  DocumentReference<Map<String, dynamic>> _stateRef(String uid) =>
      _db.doc('users/$uid/notificationState/default');

  Stream<NotificationState> watchState(String uid) {
    return _stateRef(uid).snapshots().map(
          (snap) => NotificationState.fromMap(snap.data()),
        );
  }

  Stream<List<AppNotification>> watchNotifications(String uid, {int max = 50}) {
    return _db
        .collection('users/$uid/notifications')
        .orderBy('createdAt', descending: true)
        .limit(max)
        .snapshots()
        .map(
          (snap) => snap.docs
              .map((doc) => AppNotification.fromDoc(doc))
              .toList(growable: false),
        );
  }

  Future<void> markRead(String uid, AppNotification notification) async {
    if (notification.read) return;
    try {
      await _callables.call('markNotificationRead', {
        'notificationId': notification.id,
      });
      return;
    } catch (_) {
      // Fall back when Functions are unavailable.
    }
    final stateSnap = await _stateRef(uid).get();
    final unread =
        ((stateSnap.data()?['unreadCount'] as num?)?.toInt() ?? 1) - 1;
    final forumUnread =
        ((stateSnap.data()?['unreadForumCount'] as num?)?.toInt() ?? 0) -
            (notification.type.startsWith('forum_') ? 1 : 0);
    await _db.doc('users/$uid/notifications/${notification.id}').update({
      'read': true,
    });
    await _stateRef(uid).set({
      'unreadCount': unread < 0 ? 0 : unread,
      'unreadForumCount': forumUnread < 0 ? 0 : forumUnread,
      'updatedAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));
  }

  Future<void> markAllRead(String uid) async {
    try {
      await _callables.call('markAllNotificationsRead', {});
      return;
    } catch (_) {
      // Fall through.
    }
    final snap = await _db
        .collection('users/$uid/notifications')
        .where('read', isEqualTo: false)
        .limit(100)
        .get();
    final batch = _db.batch();
    for (final doc in snap.docs) {
      batch.update(doc.reference, {'read': true});
    }
    batch.set(
      _stateRef(uid),
      {
        'unreadCount': 0,
        'unreadForumCount': 0,
        'updatedAt': FieldValue.serverTimestamp(),
      },
      SetOptions(merge: true),
    );
    await batch.commit();
  }

  Future<void> savePrefs(String uid, NotificationPrefs prefs) async {
    await _stateRef(uid).set({
      'prefs': prefs.toMap(),
      'updatedAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));
  }

  Future<void> markFeedSeen(String uid) async {
    await _stateRef(uid).set({
      'lastFeedSeenAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));
  }

  Future<int> countNewFeedThreads(DateTime? lastFeedSeenAt) async {
    try {
      Query<Map<String, dynamic>> q = _db.collection('threads');
      if (lastFeedSeenAt != null) {
        q = q.where(
          'createdAt',
          isGreaterThan: Timestamp.fromDate(lastFeedSeenAt),
        );
      }
      final agg = await q.count().get();
      return (agg.count ?? 0).clamp(0, 99);
    } catch (_) {
      return 0;
    }
  }

  static String tokenDocId(String token) {
    return sha256.convert(utf8.encode(token)).toString().substring(0, 40);
  }

  Future<String?> registerPushToken(String uid) async {
    if (kIsWeb) return null;
    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    if (settings.authorizationStatus == AuthorizationStatus.denied) {
      return null;
    }
    try {
      // Physical device / emulator: APNS may not be ready yet — don't crash logs.
      if (defaultTargetPlatform == TargetPlatform.iOS) {
        final apns = await _messaging.getAPNSToken();
        if (apns == null) {
          debugPrint('FCM skipped: APNS token not ready yet');
          return null;
        }
      }
      final token = await _messaging.getToken();
      if (token == null || token.isEmpty) return null;
      final platform = defaultTargetPlatform == TargetPlatform.iOS
          ? 'ios'
          : 'android';
      await _db.doc('users/$uid/fcmTokens/${tokenDocId(token)}').set({
        'token': token,
        'platform': platform,
        'updatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));
      return token;
    } catch (error) {
      debugPrint('FCM registerPushToken skipped: $error');
      return null;
    }
  }

  Future<void> clearPushToken(String uid, String? token) async {
    if (token == null || token.isEmpty) return;
    await _db
        .doc('users/$uid/fcmTokens/${tokenDocId(token)}')
        .delete()
        .catchError((_) {});
  }
}

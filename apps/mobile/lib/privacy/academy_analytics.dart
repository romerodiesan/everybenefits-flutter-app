import 'dart:async';
import 'dart:math';

import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../firebase/https_callable.dart';
import 'telemetry.dart';

/// Schema version mirrored from `@pulse/shared` ACADEMY_ANALYTICS_SCHEMA_VERSION.
const academyAnalyticsSchemaVersion = 1;

/// Heartbeat interval expected by the Functions aggregator.
const academyAnalyticsHeartbeat = Duration(seconds: 15);

const _sessionKey = 'pulse_academy_session_v1';

final _queue = <Map<String, dynamic>>[];
Timer? _flushTimer;
bool _flushing = false;
String? _sessionId;

String _randomId() {
  final rand = Random.secure();
  final bytes = List<int>.generate(12, (_) => rand.nextInt(256));
  return bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
}

Future<String> academySessionId() async {
  if (_sessionId != null) return _sessionId!;
  final prefs = await SharedPreferences.getInstance();
  final existing = prefs.getString(_sessionKey);
  if (existing != null && existing.isNotEmpty) {
    _sessionId = existing;
    return existing;
  }
  final next = _randomId();
  await prefs.setString(_sessionKey, next);
  _sessionId = next;
  return next;
}

String _platform() {
  if (kIsWeb) return 'web';
  switch (defaultTargetPlatform) {
    case TargetPlatform.iOS:
      return 'ios';
    case TargetPlatform.android:
      return 'android';
    default:
      return 'web';
  }
}

Future<void> _logGa(String name, Map<String, Object?> params) async {
  if (!await TelemetryPrefs.isAnalyticsEnabled()) return;
  try {
    await FirebaseAnalytics.instance.logEvent(
      name: 'academy_$name',
      parameters: {
        for (final entry in params.entries)
          if (entry.value != null) entry.key: entry.value!,
        'schema_version': academyAnalyticsSchemaVersion,
      },
    );
  } catch (_) {
    // Best-effort.
  }
}

void _scheduleFlush() {
  _flushTimer ??= Timer(const Duration(milliseconds: 2500), () {
    _flushTimer = null;
    unawaited(_flushQueue());
  });
}

Future<void> _flushQueue() async {
  if (_flushing || _queue.isEmpty) return;
  _flushing = true;
  final batch = _queue.take(20).toList(growable: false);
  _queue.removeRange(0, batch.length);
  try {
    await HttpsCallableClient().call('recordAcademyAnalytics', <String, dynamic>{
      'events': batch,
    });
  } catch (e) {
    debugPrint('[AcademyAnalytics] flush failed: $e');
    _queue.insertAll(0, batch.take(10));
    if (_queue.length > 40) {
      _queue.removeRange(40, _queue.length);
    }
  } finally {
    _flushing = false;
    if (_queue.isNotEmpty) _scheduleFlush();
  }
}

Future<void> trackAcademyEvent({
  required String name,
  required String courseId,
  String? lessonId,
  String source = 'unknown',
  int? positionSeconds,
  int? durationSeconds,
  int? watchDeltaSeconds,
  int? retentionBucket,
  bool? quizPassed,
  int? quizScore,
  String? locale,
  String? trafficSource,
}) async {
  final sessionId = await academySessionId();
  final event = <String, dynamic>{
    'name': name,
    'courseId': courseId,
    'sessionId': sessionId,
    'platform': _platform(),
    'source': source,
    'clientEventId': _randomId(),
    'lessonId': ?lessonId,
    'positionSeconds': ?positionSeconds,
    'durationSeconds': ?durationSeconds,
    'watchDeltaSeconds': ?watchDeltaSeconds,
    'retentionBucket': ?retentionBucket,
    'quizPassed': ?quizPassed,
    'quizScore': ?quizScore,
    'locale': ?locale,
    'trafficSource': ?trafficSource,
  };
  await _logGa(name, {
    'course_id': courseId,
    'lesson_id': lessonId,
    'source': source,
    'platform': _platform(),
    'watch_delta': watchDeltaSeconds ?? 0,
    'retention_bucket': retentionBucket,
    'traffic_source': trafficSource,
  });
  _queue.add(event);
  if (_queue.length >= 15) {
    unawaited(_flushQueue());
  } else {
    _scheduleFlush();
  }
}

Future<void> trackCourseImpression({
  required String courseId,
  String source = 'catalog',
}) {
  return trackAcademyEvent(
    name: 'course_impression',
    courseId: courseId,
    source: source,
  );
}

Future<void> trackCourseOpen({
  required String courseId,
  String source = 'direct',
  String? locale,
}) {
  return trackAcademyEvent(
    name: 'course_open',
    courseId: courseId,
    source: source,
    locale: locale,
  );
}

Future<void> trackLessonStart({
  required String courseId,
  required String lessonId,
  int? durationSeconds,
}) {
  return trackAcademyEvent(
    name: 'lesson_start',
    courseId: courseId,
    lessonId: lessonId,
    durationSeconds: durationSeconds,
  );
}

Future<void> trackLessonHeartbeat({
  required String courseId,
  required String lessonId,
  required int positionSeconds,
  required int durationSeconds,
  required int watchDeltaSeconds,
}) {
  final duration = durationSeconds <= 0 ? 1 : durationSeconds;
  final bucket = ((positionSeconds / duration) * 100).floor().clamp(0, 100);
  return trackAcademyEvent(
    name: 'lesson_heartbeat',
    courseId: courseId,
    lessonId: lessonId,
    positionSeconds: positionSeconds,
    durationSeconds: durationSeconds,
    watchDeltaSeconds: watchDeltaSeconds,
    retentionBucket: bucket,
  );
}

Future<void> trackLessonComplete({
  required String courseId,
  required String lessonId,
  int? positionSeconds,
  int? durationSeconds,
}) {
  return trackAcademyEvent(
    name: 'lesson_complete',
    courseId: courseId,
    lessonId: lessonId,
    positionSeconds: positionSeconds,
    durationSeconds: durationSeconds,
    retentionBucket: 100,
  );
}

Future<void> trackQuizSubmit({
  required String courseId,
  required String lessonId,
  required bool passed,
  required int score,
}) {
  return trackAcademyEvent(
    name: 'quiz_submit',
    courseId: courseId,
    lessonId: lessonId,
    quizPassed: passed,
    quizScore: score,
  );
}

import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:firebase_app_check/firebase_app_check.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

import '../../firebase/firebase_emulators.dart';
import 'pulse_ai_models.dart';

/// Thrown when the Pulse AI API rejects a request before streaming starts.
class PulseAiException implements Exception {
  PulseAiException(this.code, this.message);
  final String code;
  final String message;

  @override
  String toString() => 'PulseAiException($code): $message';
}

/// Resolves the Next.js origin that serves `/api/ai/*`.
///
/// Pass `--dart-define=PULSE_AI_BASE_URL=https://…` for production builds.
/// In debug / emulator sessions we fall back to the machine running
/// `next dev` on port 3000.
String pulseAiBaseUrl() {
  const override = String.fromEnvironment('PULSE_AI_BASE_URL');
  if (override.trim().isNotEmpty) return override.trim().replaceAll(RegExp(r'/$'), '');

  if (kDebugMode) {
    final host = firebaseEmulatorHost();
    return 'http://$host:3000';
  }
  throw StateError(
    'PULSE_AI_BASE_URL is required outside debug. '
    'Pass --dart-define=PULSE_AI_BASE_URL=https://pulse.everybenefits.us',
  );
}

class PulseAiClient {
  PulseAiClient({
    FirebaseAuth? auth,
    FirebaseAppCheck? appCheck,
    this._baseUrl,
    HttpClient? httpClient,
  })  : _auth = auth ?? FirebaseAuth.instance,
        _appCheck = appCheck ?? FirebaseAppCheck.instance,
        _httpClient = httpClient ?? HttpClient();

  final FirebaseAuth _auth;
  final FirebaseAppCheck _appCheck;
  final String? _baseUrl;
  final HttpClient _httpClient;

  String get baseUrl => _baseUrl ?? pulseAiBaseUrl();

  Future<Map<String, String>> _headers({bool jsonBody = false}) async {
    final user = _auth.currentUser;
    if (user == null) {
      throw PulseAiException('unauthenticated', 'Sign in to use Pulse AI.');
    }
    final headers = <String, String>{
      HttpHeaders.authorizationHeader: 'Bearer ${await user.getIdToken()}',
      HttpHeaders.acceptHeader: 'application/json',
    };
    if (jsonBody) {
      headers[HttpHeaders.contentTypeHeader] = 'application/json; charset=utf-8';
    }
    if (!useFirebaseEmulators) {
      try {
        final token = await _appCheck.getToken();
        if (token != null && token.isNotEmpty) {
          headers['X-Firebase-AppCheck'] = token;
        }
      } catch (_) {
        throw PulseAiException(
          'app-check-failed',
          'Device verification failed. Restart the app and try again.',
        );
      }
    }
    return headers;
  }

  Future<HttpClientResponse> _send(
    String method,
    Uri uri, {
    Object? body,
  }) async {
    final request = await _httpClient.openUrl(method, uri);
    final headers = await _headers(jsonBody: body != null);
    headers.forEach(request.headers.set);
    if (body != null) {
      final bytes = utf8.encode(jsonEncode(body));
      request.contentLength = bytes.length;
      request.add(bytes);
    }
    return request.close();
  }

  Future<Map<String, dynamic>> _json(
    String method,
    String path, {
    Object? body,
  }) async {
    final response = await _send(method, Uri.parse('$baseUrl$path'), body: body);
    final raw = await utf8.decoder.bind(response).join();
    Map<String, dynamic>? payload;
    try {
      final decoded = jsonDecode(raw);
      if (decoded is Map) payload = Map<String, dynamic>.from(decoded);
    } catch (_) {}
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final error = payload?['error'];
      if (error is Map) {
        throw PulseAiException(
          '${error['code'] ?? 'request-failed'}',
          '${error['message'] ?? 'Pulse AI is unavailable.'}',
        );
      }
      throw PulseAiException(
        'request-failed',
        'Pulse AI is unavailable (${response.statusCode}).',
      );
    }
    return payload ?? <String, dynamic>{};
  }

  Future<List<PulseConversationSummary>> listConversations() async {
    final payload = await _json('GET', '/api/ai/conversations');
    final list = payload['conversations'];
    if (list is! List) return const [];
    return list
        .whereType<Map>()
        .map((entry) => PulseConversationSummary.fromJson(
              Map<String, dynamic>.from(entry),
            ))
        .toList();
  }

  Future<List<PulseStoredMessage>> loadMessages(String conversationId) async {
    final payload = await _json(
      'GET',
      '/api/ai/conversations/${Uri.encodeComponent(conversationId)}/messages',
    );
    final list = payload['messages'];
    if (list is! List) return const [];
    return list
        .whereType<Map>()
        .map((entry) =>
            PulseStoredMessage.fromJson(Map<String, dynamic>.from(entry)))
        .toList();
  }

  Future<void> deleteConversation(String conversationId) async {
    await _json(
      'DELETE',
      '/api/ai/conversations?conversationId=${Uri.encodeComponent(conversationId)}',
    );
  }

  Future<void> sendFeedback({
    required String conversationId,
    required String messageId,
    required PulseFeedback? feedback,
  }) async {
    await _json(
      'POST',
      '/api/ai/feedback',
      body: {
        'conversationId': conversationId,
        'messageId': messageId,
        'feedback': switch (feedback) {
          PulseFeedback.up => 'up',
          PulseFeedback.down => 'down',
          null => null,
        },
      },
    );
  }

  /// Streams one turn. Emits typed events until `done` or `error`.
  Stream<PulseStreamEvent> streamTurn({
    required String message,
    required String locale,
    String? conversationId,
    CancelToken? cancelToken,
  }) async* {
    final request = await _httpClient.openUrl(
      'POST',
      Uri.parse('$baseUrl/api/ai/stream'),
    );
    final headers = await _headers(jsonBody: true);
    headers[HttpHeaders.acceptHeader] = 'text/event-stream';
    headers.forEach(request.headers.set);

    final body = utf8.encode(
      jsonEncode({
        'message': message,
        'locale': locale,
        'conversationId': ?conversationId,
      }),
    );
    request.contentLength = body.length;
    request.add(body);

    final HttpClientResponse response;
    try {
      response = await request.close();
    } on HttpException catch (error) {
      throw PulseAiException('network', error.message);
    }

    cancelToken?._attach(response);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final raw = await utf8.decoder.bind(response).join();
      try {
        final decoded = jsonDecode(raw);
        if (decoded is Map && decoded['error'] is Map) {
          final error = decoded['error'] as Map;
          throw PulseAiException(
            '${error['code'] ?? 'request-failed'}',
            '${error['message'] ?? 'Pulse AI is unavailable.'}',
          );
        }
      } catch (error) {
        if (error is PulseAiException) rethrow;
      }
      throw PulseAiException(
        'request-failed',
        'Pulse AI is unavailable (${response.statusCode}).',
      );
    }

    final buffer = StringBuffer();
    await for (final chunk in utf8.decoder.bind(response)) {
      if (cancelToken?.isCancelled == true) break;
      buffer.write(chunk);
      var content = buffer.toString();
      var separator = content.indexOf('\n\n');
      while (separator >= 0) {
        final frame = content.substring(0, separator);
        content = content.substring(separator + 2);
        final event = _parseSseFrame(frame);
        if (event != null) yield event;
        if (event is PulseDoneEvent || event is PulseErrorEvent) return;
        separator = content.indexOf('\n\n');
      }
      buffer
        ..clear()
        ..write(content);
    }
  }

  void close() => _httpClient.close(force: true);
}

PulseStreamEvent? _parseSseFrame(String frame) {
  final lines = frame.split('\n');
  final data = StringBuffer();
  for (final line in lines) {
    if (line.startsWith('data:')) {
      data.writeln(line.substring(5).trimLeft());
    }
  }
  final payload = data.toString().trim();
  if (payload.isEmpty || payload == '[DONE]') return null;
  try {
    final decoded = jsonDecode(payload);
    if (decoded is Map) {
      return parsePulseStreamEvent(Map<String, dynamic>.from(decoded));
    }
  } catch (_) {}
  return null;
}

/// Stops consuming an in-flight SSE response.
class CancelToken {
  HttpClientResponse? _response;
  bool isCancelled = false;

  void _attach(HttpClientResponse response) {
    _response = response;
    if (isCancelled) {
      unawaited(response.detachSocket().then((socket) => socket.destroy()));
    }
  }

  void cancel() {
    isCancelled = true;
    final response = _response;
    _response = null;
    if (response != null) {
      unawaited(response.detachSocket().then((socket) => socket.destroy()));
    }
  }
}

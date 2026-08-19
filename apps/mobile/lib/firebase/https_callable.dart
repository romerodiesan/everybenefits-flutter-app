import 'dart:convert';
import 'dart:io';

import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:http/http.dart' as http;

import '../firebase_options.dart';
import 'firebase_emulators.dart';

// Constructor keeps public names (`functions:`) while storing private fields.
// ignore_for_file: prefer_initializing_formals

const kFunctionsEmulatorPort = 5001;
const kFunctionsRegion = 'us-central1';

/// Hosts the iOS/macOS Functions SDK still treats as local (Auth is attached).
bool isFunctionsEmulatorLoopbackHost(String host) {
  switch (host.trim().toLowerCase()) {
    case '127.0.0.1':
    case 'localhost':
    case '::1':
    case '0.0.0.0':
      return true;
    default:
      return false;
  }
}

/// iOS SDK strips Auth on `http://` to a non-loopback host (LAN IP).
/// Dart must POST the ID token itself in that case.
///
/// `10.0.2.2` is the Android emulator's host loopback — native SDK still
/// attaches Auth there, so we leave it on the plugin path.
bool needsManualCallableAuth({
  required bool useEmulators,
  required String host,
}) {
  if (!useEmulators) return false;
  final trimmed = host.trim();
  if (isFunctionsEmulatorLoopbackHost(trimmed) || trimmed == '10.0.2.2') {
    return false;
  }
  return true;
}

String functionsErrorCodeFromStatus(String status) {
  return status.trim().toLowerCase().replaceAll('_', '-');
}

/// Cloud Functions callable wrapper.
///
/// Production and loopback emulators use the native SDK. Physical devices
/// talking to a LAN Functions emulator go through [package:http] so the
/// Firebase Auth ID token is not stripped (firebase-ios-sdk #16395).
class HttpsCallableClient {
  HttpsCallableClient({
    FirebaseFunctions? functions,
    http.Client? httpClient,
    Future<String?> Function()? readIdToken,
    String Function()? projectId,
    String Function()? emulatorHost,
    bool Function()? useEmulators,
    this.emulatorPort = kFunctionsEmulatorPort,
    this.region = kFunctionsRegion,
  }) : _functions = functions,
       _httpClient = httpClient,
       _readIdToken = readIdToken,
       _projectId = projectId,
       _emulatorHost = emulatorHost,
       _useEmulators = useEmulators;

  final FirebaseFunctions? _functions;
  final http.Client? _httpClient;
  final Future<String?> Function()? _readIdToken;
  final String Function()? _projectId;
  final String Function()? _emulatorHost;
  final bool Function()? _useEmulators;
  final int emulatorPort;
  final String region;

  bool get _manualAuth {
    final useEmulators = _useEmulators?.call() ?? useFirebaseEmulators;
    final host = _emulatorHost?.call() ?? firebaseEmulatorHost();
    return needsManualCallableAuth(useEmulators: useEmulators, host: host);
  }

  Future<dynamic> call(String name, [Map<String, dynamic>? data]) async {
    if (_manualAuth) {
      return _callOverHttp(name, data ?? const <String, dynamic>{});
    }
    final functions =
        _functions ?? FirebaseFunctions.instanceFor(region: region);
    final callable = functions.httpsCallable(name);
    final result = data == null
        ? await callable.call()
        : await callable.call(data);
    return result.data;
  }

  Future<dynamic> _callOverHttp(
    String name,
    Map<String, dynamic> data,
  ) async {
    final host = _emulatorHost?.call() ?? firebaseEmulatorHost();
    final projectId = _resolveProjectId();
    final uri = Uri(
      scheme: 'http',
      host: host,
      port: emulatorPort,
      path: '/$projectId/$region/$name',
    );
    final token = await (_readIdToken?.call() ?? _defaultIdToken());
    final headers = <String, String>{
      'Content-Type': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
    final body = jsonEncode(<String, dynamic>{'data': data});

    final http.Response response;
    try {
      response = await _post(uri, headers: headers, body: body);
    } on SocketException catch (error) {
      throw _functionsException(
        code: 'unavailable',
        message: error.message,
      );
    } on http.ClientException catch (error) {
      throw _functionsException(
        code: 'unavailable',
        message: error.message,
      );
    }

    return _decodeCallableResponse(response);
  }

  Future<http.Response> _post(
    Uri url, {
    required Map<String, String> headers,
    required String body,
  }) {
    final client = _httpClient;
    if (client != null) {
      return client.post(url, headers: headers, body: body);
    }
    return http.post(url, headers: headers, body: body);
  }

  Future<String?> _defaultIdToken() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return null;
    return user.getIdToken();
  }

  String _resolveProjectId() {
    final fromOverride = _projectId?.call().trim() ?? '';
    if (fromOverride.isNotEmpty) return fromOverride;
    try {
      final id = Firebase.app().options.projectId.trim();
      if (id.isNotEmpty) return id;
    } catch (_) {}
    return DefaultFirebaseOptions.currentPlatform.projectId;
  }
}

dynamic _decodeCallableResponse(http.Response response) {
  Object? decoded;
  final raw = response.body;
  if (raw.isNotEmpty) {
    try {
      decoded = jsonDecode(raw);
    } catch (_) {
      decoded = null;
    }
  }

  if (decoded is Map) {
    final error = decoded['error'];
    if (error is Map) {
      final status = '${error['status'] ?? error['code'] ?? 'internal'}';
      final message = '${error['message'] ?? 'Something went wrong.'}';
      throw _functionsException(
        code: functionsErrorCodeFromStatus(status),
        message: message,
        details: error['details'],
      );
    }
    if (decoded.containsKey('result')) {
      return decoded['result'];
    }
  }

  if (response.statusCode >= 200 && response.statusCode < 300) {
    return decoded;
  }

  throw _functionsException(
    code: _codeForHttpStatus(response.statusCode),
    message: raw.isEmpty ? 'HTTP ${response.statusCode}' : raw,
  );
}

String _codeForHttpStatus(int status) {
  switch (status) {
    case 401:
    case 403:
      return 'unauthenticated';
    case 404:
      return 'not-found';
    case 429:
      return 'resource-exhausted';
    case 501:
      return 'unimplemented';
    default:
      if (status >= 500) return 'unavailable';
      return 'unknown';
  }
}

FirebaseFunctionsException _functionsException({
  required String code,
  required String message,
  Object? details,
}) {
  // Constructor is @protected on the plugin type; still the public catch type.
  // ignore: invalid_use_of_protected_member
  return FirebaseFunctionsException(
    code: code,
    message: message,
    details: details,
  );
}

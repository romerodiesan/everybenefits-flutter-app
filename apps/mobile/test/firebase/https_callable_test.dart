import 'dart:convert';

import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:mocktail/mocktail.dart';

import 'package:every_benefits/firebase/https_callable.dart';

class _MockFunctions extends Mock implements FirebaseFunctions {}

class _MockCallable extends Mock implements HttpsCallable {}

class _MockResult extends Mock implements HttpsCallableResult<dynamic> {}

class _RecordingClient extends http.BaseClient {
  http.BaseRequest? lastRequest;
  String responseBody = '{"result":{"allowed":true}}';
  int statusCode = 200;

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    lastRequest = request;
    return http.StreamedResponse(
      Stream<List<int>>.value(utf8.encode(responseBody)),
      statusCode,
      request: request,
      headers: const {'content-type': 'application/json'},
    );
  }
}

void main() {
  setUpAll(() {
    registerFallbackValue(<String, dynamic>{});
  });

  test('loopback hosts do not need manual callable auth', () {
    expect(isFunctionsEmulatorLoopbackHost('127.0.0.1'), isTrue);
    expect(isFunctionsEmulatorLoopbackHost('localhost'), isTrue);
    expect(isFunctionsEmulatorLoopbackHost('::1'), isTrue);
    expect(
      needsManualCallableAuth(useEmulators: true, host: '127.0.0.1'),
      isFalse,
    );
    expect(
      needsManualCallableAuth(useEmulators: true, host: '10.0.2.2'),
      isFalse,
    );
  });

  test('LAN emulator hosts need manual callable auth', () {
    expect(isFunctionsEmulatorLoopbackHost('10.0.0.210'), isFalse);
    expect(
      needsManualCallableAuth(useEmulators: true, host: '10.0.0.210'),
      isTrue,
    );
    expect(
      needsManualCallableAuth(useEmulators: false, host: '10.0.0.210'),
      isFalse,
    );
  });

  test('functionsErrorCodeFromStatus maps gRPC status names', () {
    expect(functionsErrorCodeFromStatus('UNAUTHENTICATED'), 'unauthenticated');
    expect(functionsErrorCodeFromStatus('PERMISSION_DENIED'), 'permission-denied');
    expect(
      functionsErrorCodeFromStatus('FAILED_PRECONDITION'),
      'failed-precondition',
    );
  });

  test('loopback emulator uses the native SDK callable', () async {
    final functions = _MockFunctions();
    final callable = _MockCallable();
    final result = _MockResult();
    when(() => functions.httpsCallable('refreshMyChatAccess'))
        .thenReturn(callable);
    when(() => callable.call(any())).thenAnswer((_) async => result);
    when(() => result.data).thenReturn({'allowed': true});

    final client = HttpsCallableClient(
      functions: functions,
      useEmulators: () => true,
      emulatorHost: () => '127.0.0.1',
    );
    final data = await client.call(
      'refreshMyChatAccess',
      <String, dynamic>{},
    );
    expect(data, {'allowed': true});
    verify(() => functions.httpsCallable('refreshMyChatAccess')).called(1);
  });

  test('LAN emulator POSTs Authorization to the Functions emulator', () async {
    final httpClient = _RecordingClient();
    final client = HttpsCallableClient(
      httpClient: httpClient,
      readIdToken: () async => 'test-token',
      projectId: () => 'every-benefits-us',
      emulatorHost: () => '10.0.0.210',
      useEmulators: () => true,
    );

    final data = await client.call(
      'refreshMyChatAccess',
      <String, dynamic>{},
    );
    expect(data, {'allowed': true});

    final request = httpClient.lastRequest! as http.Request;
    expect(request.method, 'POST');
    expect(
      request.url.toString(),
      'http://10.0.0.210:5001/every-benefits-us/us-central1/refreshMyChatAccess',
    );
    expect(request.headers['Authorization'], 'Bearer test-token');
    expect(jsonDecode(request.body), {'data': <String, dynamic>{}});
  });

  test('LAN emulator maps callable error JSON to Functions exception', () async {
    final httpClient = _RecordingClient()
      ..statusCode = 401
      ..responseBody = jsonEncode({
        'error': {
          'status': 'UNAUTHENTICATED',
          'message': 'Sign in required.',
        },
      });
    final client = HttpsCallableClient(
      httpClient: httpClient,
      readIdToken: () async => 'test-token',
      projectId: () => 'every-benefits-us',
      emulatorHost: () => '10.0.0.210',
      useEmulators: () => true,
    );

    expect(
      () => client.call('listManagedGroupChats', <String, dynamic>{}),
      throwsA(
        isA<FirebaseFunctionsException>()
            .having((e) => e.code, 'code', 'unauthenticated')
            .having((e) => e.message, 'message', 'Sign in required.'),
      ),
    );
  });
}

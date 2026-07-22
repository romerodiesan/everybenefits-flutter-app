import 'dart:developer' as developer;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../auth/auth_exception.dart';

/// Logs [error] to the debug console and shows a visible floating SnackBar.
void showAppError(
  BuildContext context,
  Object error, {
  StackTrace? stackTrace,
  String? fallbackMessage,
}) {
  final message = _userMessage(error, fallbackMessage);
  _logError(error, stackTrace, message);

  if (!context.mounted) return;

  final messenger = ScaffoldMessenger.maybeOf(context);
  if (messenger == null) {
    debugPrint('[AppError] No ScaffoldMessenger — UI snackbar skipped.');
    return;
  }

  messenger
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        content: Text(
          message,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w600,
            height: 1.35,
          ),
        ),
        backgroundColor: const Color(0xFFB3261E),
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 24),
        duration: const Duration(seconds: 7),
        showCloseIcon: true,
        closeIconColor: Colors.white,
      ),
    );
}

/// Auth-specific alias used by onboarding screens.
void showAuthError(
  BuildContext context,
  Object error, {
  StackTrace? stackTrace,
}) {
  showAppError(context, error, stackTrace: stackTrace);
}

void showAppSuccess(BuildContext context, String message) {
  debugPrint('[AppSuccess] $message');
  if (!context.mounted) return;
  ScaffoldMessenger.maybeOf(context)
    ?..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        content: Text(message),
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 24),
        duration: const Duration(seconds: 3),
      ),
    );
}

String _userMessage(Object error, String? fallback) {
  if (error is AuthException) return error.userMessage;
  return fallback ??
      AuthException.fromUnknown(error).userMessage;
}

void _logError(Object error, StackTrace? stackTrace, String userMessage) {
  final buffer = StringBuffer()
    ..writeln('[AppError] $userMessage')
    ..writeln('  runtimeType: ${error.runtimeType}')
    ..writeln('  error: $error');
  if (error is AuthException) {
    buffer.writeln('  code: ${error.code}');
  }
  if (stackTrace != null) {
    buffer.writeln(stackTrace);
  }

  final text = buffer.toString();
  // Always print so it shows in `flutter run` / Debug Console.
  debugPrint(text);
  developer.log(
    userMessage,
    name: 'every_benefits.error',
    error: error,
    stackTrace: stackTrace,
    level: 1000,
  );

  if (kDebugMode) {
    FlutterError.dumpErrorToConsole(
      FlutterErrorDetails(
        exception: error,
        stack: stackTrace,
        library: 'every_benefits',
        context: ErrorDescription(userMessage),
      ),
    );
  }
}

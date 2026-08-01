import 'package:flutter/widgets.dart';

import 'di.dart';

/// Provides [AppDependencies] to the widget tree from the composition root.
class AppScope extends InheritedWidget {
  const AppScope({
    super.key,
    required this.deps,
    required super.child,
  });

  final AppDependencies deps;

  static AppDependencies of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AppScope>();
    assert(scope != null, 'AppScope not found. Wrap the app in AppScope.');
    return scope!.deps;
  }

  static AppDependencies? maybeOf(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<AppScope>()?.deps;
  }

  @override
  bool updateShouldNotify(AppScope oldWidget) => deps != oldWidget.deps;
}

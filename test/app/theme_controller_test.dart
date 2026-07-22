import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:every_benefits/app/theme.dart';
import 'package:every_benefits/app/theme_controller.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('ThemeController defaults to system and persists light', () async {
    final controller = await ThemeController.load();
    expect(controller.mode, ThemeMode.system);

    await controller.setMode(ThemeMode.light);
    expect(controller.mode, ThemeMode.light);

    final reloaded = await ThemeController.load();
    expect(reloaded.mode, ThemeMode.light);
  });

  testWidgets('light theme extension uses light palette', (tester) async {
    late AppColors colors;
    await tester.pumpWidget(
      MaterialApp(
        theme: buildEveryInsuranceTheme(Brightness.light),
        home: Builder(
          builder: (context) {
            colors = AppColors.of(context);
            return const SizedBox.shrink();
          },
        ),
      ),
    );
    expect(colors.meshBase, AppColors.light.meshBase);
    expect(colors.ink, AppColors.light.ink);
    expect(colors.meshBase, const Color(0xFFF7F7F6));
    expect(colors.ink, const Color(0xFF141816));
    expect(AppColors.accent, isNot(const Color(0xFF3DDC97)));
  });

  testWidgets('dark theme extension uses dark palette', (tester) async {
    late AppColors colors;
    await tester.pumpWidget(
      MaterialApp(
        theme: buildEveryInsuranceTheme(Brightness.dark),
        home: Builder(
          builder: (context) {
            colors = AppColors.of(context);
            return const SizedBox.shrink();
          },
        ),
      ),
    );
    expect(colors.meshBase, AppColors.dark.meshBase);
    expect(colors.ink, AppColors.dark.ink);
  });
}

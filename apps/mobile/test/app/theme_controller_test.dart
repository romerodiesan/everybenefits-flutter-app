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

  test('ThemeController defaults to system and green seed', () async {
    final controller = await ThemeController.load();
    expect(controller.mode, ThemeMode.system);
    expect(controller.primarySeedId, kDefaultPrimarySeedId);
    expect(controller.primaryColor, const Color(0xFF1F6B4A));
  });

  test('ThemeController persists theme mode and primary seed', () async {
    final controller = await ThemeController.load();

    await controller.setMode(ThemeMode.light);
    expect(controller.mode, ThemeMode.light);

    await controller.setPrimarySeed('amber');
    expect(controller.primarySeedId, 'amber');
    expect(controller.primaryColor, const Color(0xFFF5A524));

    final reloaded = await ThemeController.load();
    expect(reloaded.mode, ThemeMode.light);
    expect(reloaded.primarySeedId, 'amber');
    expect(reloaded.primaryColor, const Color(0xFFF5A524));
  });

  test('unknown primary seed falls back to green', () {
    final controller = ThemeController(initialPrimarySeedId: 'not-a-seed');
    expect(controller.primarySeedId, 'green');
    expect(controller.primaryColor, const Color(0xFF1F6B4A));
  });

  test('onBrandFor picks dark ink on light seeds and white on dark ones', () {
    expect(onBrandFor(const Color(0xFFF5A524)), AppColors.inkBrand);
    expect(onBrandFor(const Color(0xFF2563EB)), Colors.white);
    expect(onBrandFor(const Color(0xFF1F6B4A)), Colors.white);
  });

  testWidgets('light theme uses green brand by default', (tester) async {
    late AppColors colors;
    late Color primary;
    await tester.pumpWidget(
      MaterialApp(
        theme: buildEveryInsuranceTheme(Brightness.light),
        home: Builder(
          builder: (context) {
            colors = AppColors.of(context);
            primary = Theme.of(context).colorScheme.primary;
            return const SizedBox.shrink();
          },
        ),
      ),
    );
    expect(colors.meshBase, AppColors.light.meshBase);
    expect(colors.ink, AppColors.light.ink);
    expect(colors.meshBase, const Color(0xFFF3F5F7));
    expect(colors.ink, const Color(0xFF0C0D10));
    expect(AppColors.brand, const Color(0xFF1F6B4A));
    expect(primary, const Color(0xFF1F6B4A));
  });

  testWidgets('theme builder applies selected brand seed', (tester) async {
    late Color primary;
    late Color onPrimary;
    const violet = Color(0xFF7C3AED);
    await tester.pumpWidget(
      MaterialApp(
        theme: buildEveryInsuranceTheme(Brightness.light, brand: violet),
        home: Builder(
          builder: (context) {
            primary = Theme.of(context).colorScheme.primary;
            onPrimary = Theme.of(context).colorScheme.onPrimary;
            return const SizedBox.shrink();
          },
        ),
      ),
    );
    expect(primary, violet);
    expect(onPrimary, Colors.white);
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

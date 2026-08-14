import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:every_benefits/app/layout/pulse_breakpoints.dart';
import 'package:every_benefits/app/theme.dart';
import 'package:every_benefits/app/widgets/pulse_chrome.dart';
import 'package:every_benefits/l10n/app_localizations.dart';

import '../helpers/test_views.dart';

void main() {
  test('window class uses shortest side', () {
    expect(
      PulseWindowClass.fromSize(const Size(390, 844)),
      PulseWindowClass.compact,
    );
    expect(
      PulseWindowClass.fromSize(const Size(844, 390)),
      PulseWindowClass.compact,
    );
    expect(
      PulseWindowClass.fromSize(const Size(700, 900)),
      PulseWindowClass.medium,
    );
    expect(
      PulseWindowClass.fromSize(const Size(1024, 1366)),
      PulseWindowClass.expanded,
    );
  });

  testWidgets('phone chrome uses the bottom tab bar', (tester) async {
    setPhoneView(tester);
    await _pumpChrome(tester);
    expect(find.byType(PulseTabBar), findsOneWidget);
    expect(find.byType(PulseNavRail), findsNothing);
    expect(find.byTooltip('Home'), findsOneWidget);
  });

  testWidgets('wide tablet chrome uses the navigation rail', (tester) async {
    setTabletView(tester, size: const Size(1194, 834));
    setTabletView(tester);
    await _pumpChrome(tester);
    expect(find.byType(PulseNavRail), findsOneWidget);
    expect(find.byType(PulseTabBar), findsNothing);
    expect(find.byTooltip('Home'), findsOneWidget);
    expect(find.byTooltip('Chats'), findsOneWidget);
  });
}

Future<void> _pumpChrome(WidgetTester tester) async {
  const items = [
    PulseTabItem(
      label: 'Home',
      icon: Icons.home_outlined,
      selectedIcon: Icons.home_rounded,
    ),
    PulseTabItem(
      label: 'Chats',
      icon: Icons.chat_bubble_outline_rounded,
      selectedIcon: Icons.chat_bubble_rounded,
    ),
  ];

  await tester.pumpWidget(
    MaterialApp(
      theme: buildEveryInsuranceTheme(Brightness.dark),
      locale: const Locale('en'),
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: Builder(
        builder: (context) {
          final rail = pulseUseRail(context);
          return Scaffold(
            body: rail
                ? Row(
                    children: [
                      PulseNavRail(
                        items: items,
                        selectedIndex: 0,
                        onSelect: (_) {},
                      ),
                      const Expanded(child: SizedBox.expand()),
                    ],
                  )
                : const SizedBox.expand(),
            bottomNavigationBar: rail
                ? null
                : PulseTabBar(
                    items: items,
                    selectedIndex: 0,
                    onSelect: (_) {},
                  ),
          );
        },
      ),
    ),
  );
  await tester.pump();
}

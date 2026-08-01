import 'package:every_benefits/app/theme.dart';
import 'package:every_benefits/features/university/widgets/markdown_body.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _wrap(Widget child) {
  return MaterialApp(
    theme: ThemeData(
      extensions: const [AppColors.light],
      colorScheme: ColorScheme.fromSeed(seedColor: AppColors.brand),
    ),
    home: Scaffold(body: SingleChildScrollView(child: child)),
  );
}

void main() {
  group('MarkdownBody GFM', () {
    testWidgets('renders table cells from GFM markdown', (tester) async {
      await tester.pumpWidget(
        _wrap(
          const MarkdownBody(
            source: '''
# Beneficios

| Plan | Monto |
| --- | --- |
| Elite Plus | \$6,000 |
| Classic | \$2,000 |
''',
          ),
        ),
      );

      expect(find.text('Beneficios'), findsOneWidget);
      expect(find.text('Elite Plus'), findsOneWidget);
      expect(find.text(r'$6,000'), findsOneWidget);
      expect(find.text('Classic'), findsOneWidget);
      expect(find.byType(Table), findsWidgets);
    });

    testWidgets('renders blank source as empty', (tester) async {
      await tester.pumpWidget(_wrap(const MarkdownBody(source: '   \n\n')));
      expect(find.byType(SizedBox), findsWidgets);
      expect(find.textContaining('Elite'), findsNothing);
    });

    testWidgets('renders headings and quotes', (tester) async {
      await tester.pumpWidget(
        _wrap(
          const MarkdownBody(
            source: '''
## Resumen

> Nota del plan
''',
          ),
        ),
      );

      expect(find.text('Resumen'), findsOneWidget);
      expect(find.textContaining('Nota del plan'), findsOneWidget);
    });
  });
}

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app_spacing.dart';

@immutable
class AppColors extends ThemeExtension<AppColors> {
  const AppColors({
    required this.ink,
    required this.muted,
    required this.meshBase,
    required this.meshDeep,
    required this.glassFill,
    required this.glassBorder,
    required this.meshBlob,
  });

  /// Deep forest — restrained brand.
  static const Color brand = Color(0xFF1F4F40);

  /// Soft sage accent — not neon.
  static const Color accent = Color(0xFF3D6B5C);

  final Color ink;
  final Color muted;
  final Color meshBase;
  final Color meshDeep;
  final Color glassFill;
  final Color glassBorder;
  final Color meshBlob;

  Color get surface => const Color(0xFFFFFFFF);
  Color get border => glassBorder;
  Color get background => meshBase;
  Color get textPrimary => ink;
  Color get textSecondary => muted;

  static const dark = AppColors(
    ink: Color(0xFFF4F4F3),
    muted: Color(0xFF8A8F8C),
    meshBase: Color(0xFF111312),
    meshDeep: Color(0xFF171A18),
    glassFill: Color(0x14FFFFFF),
    glassBorder: Color(0x1AFFFFFF),
    meshBlob: Color(0xFF1C2A24),
  );

  static const light = AppColors(
    ink: Color(0xFF141816),
    muted: Color(0xFF6B736E),
    meshBase: Color(0xFFF7F7F6),
    meshDeep: Color(0xFFEEEEEC),
    glassFill: Color(0xCCFFFFFF),
    glassBorder: Color(0x14000000),
    meshBlob: Color(0xFFD8DDD9),
  );

  static AppColors of(BuildContext context) {
    return Theme.of(context).extension<AppColors>() ?? dark;
  }

  @override
  AppColors copyWith({
    Color? ink,
    Color? muted,
    Color? meshBase,
    Color? meshDeep,
    Color? glassFill,
    Color? glassBorder,
    Color? meshBlob,
  }) {
    return AppColors(
      ink: ink ?? this.ink,
      muted: muted ?? this.muted,
      meshBase: meshBase ?? this.meshBase,
      meshDeep: meshDeep ?? this.meshDeep,
      glassFill: glassFill ?? this.glassFill,
      glassBorder: glassBorder ?? this.glassBorder,
      meshBlob: meshBlob ?? this.meshBlob,
    );
  }

  @override
  AppColors lerp(ThemeExtension<AppColors>? other, double t) {
    if (other is! AppColors) return this;
    return AppColors(
      ink: Color.lerp(ink, other.ink, t)!,
      muted: Color.lerp(muted, other.muted, t)!,
      meshBase: Color.lerp(meshBase, other.meshBase, t)!,
      meshDeep: Color.lerp(meshDeep, other.meshDeep, t)!,
      glassFill: Color.lerp(glassFill, other.glassFill, t)!,
      glassBorder: Color.lerp(glassBorder, other.glassBorder, t)!,
      meshBlob: Color.lerp(meshBlob, other.meshBlob, t)!,
    );
  }
}

ThemeData buildEveryInsuranceTheme(Brightness brightness) {
  final colors = brightness == Brightness.dark ? AppColors.dark : AppColors.light;
  final baseText = brightness == Brightness.dark
      ? ThemeData.dark().textTheme
      : ThemeData.light().textTheme;
  final body = GoogleFonts.plusJakartaSansTextTheme(baseText);
  final display = GoogleFonts.syneTextTheme(baseText);
  const onAccent = Colors.white;

  final textTheme = body
      .apply(bodyColor: colors.ink, displayColor: colors.ink)
      .copyWith(
        displayLarge: display.displayLarge?.copyWith(
          fontWeight: FontWeight.w800,
          letterSpacing: -2.2,
          height: 0.92,
          color: colors.ink,
          fontSize: 56,
        ),
        displaySmall: display.displaySmall?.copyWith(
          fontWeight: FontWeight.w800,
          letterSpacing: -1.4,
          height: 0.95,
          color: colors.ink,
          fontSize: 40,
        ),
        headlineMedium: display.headlineMedium?.copyWith(
          fontWeight: FontWeight.w700,
          letterSpacing: -0.8,
          color: colors.ink,
          fontSize: 28,
        ),
        titleLarge: display.titleLarge?.copyWith(
          fontWeight: FontWeight.w700,
          letterSpacing: -0.4,
          color: colors.ink,
          fontSize: 22,
        ),
        titleMedium: body.titleMedium?.copyWith(
          fontWeight: FontWeight.w600,
          color: colors.ink,
        ),
        bodyLarge: body.bodyLarge?.copyWith(
          fontWeight: FontWeight.w500,
          height: 1.5,
          color: colors.ink,
        ),
        bodyMedium: body.bodyMedium?.copyWith(
          fontWeight: FontWeight.w500,
          height: 1.5,
          color: colors.muted,
        ),
        labelLarge: body.labelLarge?.copyWith(
          fontWeight: FontWeight.w700,
          letterSpacing: 0.2,
          color: colors.ink,
        ),
      );

  final scheme = ColorScheme(
    brightness: brightness,
    primary: AppColors.brand,
    onPrimary: onAccent,
    secondary: AppColors.accent,
    onSecondary: Colors.white,
    error: const Color(0xFFE57373),
    onError: Colors.white,
    surface: Colors.transparent,
    onSurface: colors.ink,
    outline: colors.glassBorder,
  );

  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    colorScheme: scheme,
    scaffoldBackgroundColor: Colors.transparent,
    textTheme: textTheme,
    extensions: [colors],
    appBarTheme: AppBarTheme(
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      backgroundColor: Colors.transparent,
      foregroundColor: colors.ink,
      surfaceTintColor: Colors.transparent,
      titleTextStyle: textTheme.titleLarge,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        elevation: 0,
        backgroundColor: AppColors.brand,
        foregroundColor: onAccent,
        minimumSize: const Size.fromHeight(56),
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        textStyle: textTheme.labelLarge?.copyWith(color: onAccent),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: colors.ink,
        textStyle: textTheme.labelLarge,
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: colors.ink,
        minimumSize: const Size.fromHeight(56),
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
        side: BorderSide(color: colors.glassBorder),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        textStyle: textTheme.labelLarge,
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: colors.glassFill,
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
      hintStyle: textTheme.bodyMedium,
      labelStyle: textTheme.bodyMedium?.copyWith(color: colors.ink),
      errorStyle: textTheme.bodyMedium?.copyWith(
        color: const Color(0xFFE57373),
        fontSize: 12,
      ),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(color: colors.glassBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(color: colors.glassBorder),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: AppColors.accent, width: 1.4),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Color(0xFFE57373)),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Color(0xFFE57373), width: 1.4),
      ),
    ),
    tabBarTheme: TabBarThemeData(
      dividerColor: Colors.transparent,
      indicatorColor: AppColors.accent,
      labelColor: colors.ink,
      unselectedLabelColor: colors.muted,
      labelStyle: textTheme.labelLarge,
      unselectedLabelStyle: textTheme.labelLarge?.copyWith(
        fontWeight: FontWeight.w500,
      ),
      indicatorSize: TabBarIndicatorSize.label,
    ),
    dividerTheme: DividerThemeData(
      color: colors.glassBorder,
      thickness: 1,
      space: 1,
    ),
  );
}

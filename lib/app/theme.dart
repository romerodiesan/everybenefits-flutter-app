import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app_spacing.dart';

abstract final class AppColors {
  static const Color brand = Color(0xFF0B6E4F);
  static const Color accent = Color(0xFF3DDC97);
  static const Color ink = Color(0xFFF2F7F4);
  static const Color muted = Color(0xFF9AABB0);
  static const Color meshBase = Color(0xFF0B1410);
  static const Color meshDeep = Color(0xFF0E1A14);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color glassFill = Color(0x14FFFFFF);
  static const Color glassBorder = Color(0x22FFFFFF);
  static const Color border = Color(0x22FFFFFF);
  static const Color background = meshBase;
  static const Color textPrimary = ink;
  static const Color textSecondary = muted;
}

ThemeData buildEveryInsuranceTheme() {
  final body = GoogleFonts.plusJakartaSansTextTheme(ThemeData.dark().textTheme);
  final display = GoogleFonts.syneTextTheme(ThemeData.dark().textTheme);

  final textTheme = body
      .apply(bodyColor: AppColors.ink, displayColor: AppColors.ink)
      .copyWith(
        displayLarge: display.displayLarge?.copyWith(
          fontWeight: FontWeight.w800,
          letterSpacing: -2.2,
          height: 0.92,
          color: AppColors.ink,
          fontSize: 56,
        ),
        displaySmall: display.displaySmall?.copyWith(
          fontWeight: FontWeight.w800,
          letterSpacing: -1.4,
          height: 0.95,
          color: AppColors.ink,
          fontSize: 40,
        ),
        headlineMedium: display.headlineMedium?.copyWith(
          fontWeight: FontWeight.w700,
          letterSpacing: -0.8,
          color: AppColors.ink,
          fontSize: 28,
        ),
        titleLarge: display.titleLarge?.copyWith(
          fontWeight: FontWeight.w700,
          letterSpacing: -0.4,
          color: AppColors.ink,
          fontSize: 22,
        ),
        titleMedium: body.titleMedium?.copyWith(
          fontWeight: FontWeight.w600,
          color: AppColors.ink,
        ),
        bodyLarge: body.bodyLarge?.copyWith(
          fontWeight: FontWeight.w500,
          height: 1.5,
          color: AppColors.ink,
        ),
        bodyMedium: body.bodyMedium?.copyWith(
          fontWeight: FontWeight.w500,
          height: 1.5,
          color: AppColors.muted,
        ),
        labelLarge: body.labelLarge?.copyWith(
          fontWeight: FontWeight.w700,
          letterSpacing: 0.2,
          color: AppColors.ink,
        ),
      );

  const scheme = ColorScheme(
    brightness: Brightness.dark,
    primary: AppColors.accent,
    onPrimary: Color(0xFF04110C),
    secondary: AppColors.brand,
    onSecondary: Colors.white,
    error: Color(0xFFFF8A80),
    onError: Color(0xFF2B0000),
    surface: Colors.transparent,
    onSurface: AppColors.ink,
    outline: AppColors.glassBorder,
  );

  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: scheme,
    scaffoldBackgroundColor: Colors.transparent,
    textTheme: textTheme,
    appBarTheme: AppBarTheme(
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      backgroundColor: Colors.transparent,
      foregroundColor: AppColors.ink,
      surfaceTintColor: Colors.transparent,
      titleTextStyle: textTheme.titleLarge,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        elevation: 0,
        backgroundColor: AppColors.accent,
        foregroundColor: const Color(0xFF04110C),
        minimumSize: const Size.fromHeight(56),
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        textStyle: textTheme.labelLarge?.copyWith(
          color: const Color(0xFF04110C),
        ),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: AppColors.ink,
        textStyle: textTheme.labelLarge,
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.ink,
        minimumSize: const Size.fromHeight(56),
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
        side: const BorderSide(color: AppColors.glassBorder),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        textStyle: textTheme.labelLarge,
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.glassFill,
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
      hintStyle: textTheme.bodyMedium,
      labelStyle: textTheme.bodyMedium?.copyWith(color: AppColors.ink),
      errorStyle: textTheme.bodyMedium?.copyWith(
        color: const Color(0xFFFF8A80),
        fontSize: 12,
      ),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: AppColors.glassBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: AppColors.glassBorder),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: AppColors.accent, width: 1.4),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Color(0xFFFF8A80)),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Color(0xFFFF8A80), width: 1.4),
      ),
    ),
    tabBarTheme: TabBarThemeData(
      dividerColor: Colors.transparent,
      indicatorColor: AppColors.accent,
      labelColor: AppColors.ink,
      unselectedLabelColor: AppColors.muted,
      labelStyle: textTheme.labelLarge,
      unselectedLabelStyle: textTheme.labelLarge?.copyWith(
        fontWeight: FontWeight.w500,
      ),
      indicatorSize: TabBarIndicatorSize.label,
    ),
    dividerTheme: const DividerThemeData(
      color: AppColors.glassBorder,
      thickness: 1,
      space: 1,
    ),
  );
}

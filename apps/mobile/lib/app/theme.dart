import 'package:flutter/material.dart';

import 'app_spacing.dart';
import 'theme_controller.dart';

/// EVERY Pulse design tokens — ink canvas + dynamic brand signal.
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

  /// Fallback when no [Theme] is available (tests / early boot).
  static const Color brand = Color(0xFF1F6B4A);

  /// Alias kept for older call sites; prefer [brandOf].
  static const Color accent = brand;

  static const Color inkBrand = Color(0xFF0C0D10);

  /// Live primary from [ColorScheme] (user-selected seed).
  static Color brandOf(BuildContext context) {
    return Theme.of(context).colorScheme.primary;
  }

  static Color onBrandOf(BuildContext context) {
    return Theme.of(context).colorScheme.onPrimary;
  }

  final Color ink;
  final Color muted;
  final Color meshBase;
  final Color meshDeep;
  final Color glassFill;
  final Color glassBorder;
  final Color meshBlob;

  Color get canvas => meshBase;
  Color get sheet => meshDeep;
  Color get quiet => muted;
  Color get surface => glassFill;
  Color get border => glassBorder;
  Color get background => meshBase;
  Color get textPrimary => ink;
  Color get textSecondary => muted;

  static const dark = AppColors(
    ink: Color(0xFFF4F3F0),
    muted: Color(0xFF8B9098),
    meshBase: Color(0xFF0C0D10),
    meshDeep: Color(0xFF16171C),
    glassFill: Color(0xFF1C1D24),
    glassBorder: Color(0x22FFFFFF),
    meshBlob: Color(0xFF1C1D24),
  );

  static const light = AppColors(
    ink: Color(0xFF0C0D10),
    muted: Color(0xFF5C6570),
    meshBase: Color(0xFFF3F5F7),
    meshDeep: Color(0xFFFFFFFF),
    glassFill: Color(0xFFFFFFFF),
    glassBorder: Color(0x14000000),
    meshBlob: Color(0xFFE4E7EB),
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

/// On-primary ink for light brands; white for dark/saturated brands.
Color onBrandFor(Color brand) {
  return brand.computeLuminance() > 0.45 ? AppColors.inkBrand : Colors.white;
}

TextStyle? _withFamily(
  TextStyle? base, {
  required String family,
  FontWeight? weight,
  double? fontSize,
  double? letterSpacing,
  double? height,
  Color? color,
}) {
  final resolvedWeight = weight ?? base?.fontWeight ?? FontWeight.w400;
  return base?.copyWith(
    fontFamily: family,
    fontWeight: resolvedWeight,
    fontSize: fontSize,
    letterSpacing: letterSpacing,
    height: height,
    color: color,
    fontVariations: [
      FontVariation('wght', resolvedWeight.value.toDouble()),
    ],
  );
}

ThemeData buildPulseTheme(
  Brightness brightness, {
  Color brand = AppColors.brand,
}) {
  final colors =
      brightness == Brightness.dark ? AppColors.dark : AppColors.light;
  final baseText = brightness == Brightness.dark
      ? ThemeData.dark().textTheme
      : ThemeData.light().textTheme;
  final onBrand = onBrandFor(brand);

  final textTheme = baseText
      .apply(bodyColor: colors.ink, displayColor: colors.ink)
      .copyWith(
        displayLarge: _withFamily(
          baseText.displayLarge,
          family: 'Outfit',
          weight: FontWeight.w800,
          letterSpacing: -2.4,
          height: 0.9,
          color: colors.ink,
          fontSize: 56,
        ),
        displaySmall: _withFamily(
          baseText.displaySmall,
          family: 'Outfit',
          weight: FontWeight.w800,
          letterSpacing: -1.6,
          height: 0.95,
          color: colors.ink,
          fontSize: 40,
        ),
        headlineMedium: _withFamily(
          baseText.headlineMedium,
          family: 'Outfit',
          weight: FontWeight.w700,
          letterSpacing: -0.9,
          color: colors.ink,
          fontSize: 28,
        ),
        titleLarge: _withFamily(
          baseText.titleLarge,
          family: 'Outfit',
          weight: FontWeight.w700,
          letterSpacing: -0.5,
          color: colors.ink,
          fontSize: 22,
        ),
        titleMedium: _withFamily(
          baseText.titleMedium,
          family: 'Figtree',
          weight: FontWeight.w600,
          color: colors.ink,
        ),
        bodyLarge: _withFamily(
          baseText.bodyLarge,
          family: 'Figtree',
          weight: FontWeight.w500,
          height: 1.5,
          color: colors.ink,
        ),
        bodyMedium: _withFamily(
          baseText.bodyMedium,
          family: 'Figtree',
          weight: FontWeight.w500,
          height: 1.5,
          color: colors.muted,
        ),
        labelLarge: _withFamily(
          baseText.labelLarge,
          family: 'Figtree',
          weight: FontWeight.w700,
          letterSpacing: 0.15,
          color: colors.ink,
        ),
        labelSmall: _withFamily(
          baseText.labelSmall,
          family: 'Figtree',
          weight: FontWeight.w600,
          color: colors.muted,
        ),
        bodySmall: _withFamily(
          baseText.bodySmall,
          family: 'Figtree',
          weight: FontWeight.w500,
          color: colors.muted,
        ),
      );

  final scheme = ColorScheme(
    brightness: brightness,
    primary: brand,
    onPrimary: onBrand,
    secondary: brand,
    onSecondary: onBrand,
    error: const Color(0xFFE57373),
    onError: Colors.white,
    surface: colors.meshDeep,
    onSurface: colors.ink,
    outline: colors.glassBorder,
  );

  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    colorScheme: scheme,
    scaffoldBackgroundColor: colors.meshBase,
    textTheme: textTheme,
    fontFamily: 'Figtree',
    extensions: [colors],
    appBarTheme: AppBarTheme(
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      backgroundColor: colors.meshBase,
      foregroundColor: colors.ink,
      surfaceTintColor: Colors.transparent,
      titleTextStyle: textTheme.titleLarge,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        elevation: 0,
        backgroundColor: brand,
        foregroundColor: onBrand,
        minimumSize: const Size.fromHeight(56),
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        textStyle: textTheme.labelLarge?.copyWith(color: onBrand),
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
          borderRadius: BorderRadius.circular(20),
        ),
        textStyle: textTheme.labelLarge,
      ),
    ),
    floatingActionButtonTheme: FloatingActionButtonThemeData(
      backgroundColor: brand,
      foregroundColor: onBrand,
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
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
        borderRadius: BorderRadius.circular(20),
        borderSide: BorderSide(color: colors.glassBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: BorderSide(color: colors.glassBorder),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: BorderSide(color: brand, width: 1.6),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: const BorderSide(color: Color(0xFFE57373)),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: const BorderSide(color: Color(0xFFE57373), width: 1.6),
      ),
    ),
    tabBarTheme: TabBarThemeData(
      dividerColor: Colors.transparent,
      indicatorColor: brand,
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
    cardTheme: CardThemeData(
      color: colors.meshDeep,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(color: colors.glassBorder),
      ),
    ),
  );
}

/// Convenience for tests / callers that only have a [ThemeController].
ThemeData themeForController(
  ThemeController controller,
  Brightness brightness,
) {
  return buildPulseTheme(
    brightness,
    brand: controller.primaryColor,
  );
}

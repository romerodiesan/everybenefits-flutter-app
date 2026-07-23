import '../l10n/app_localizations.dart';

/// Shared placeholder demo data for academy / AI surfaces (no backend).
class DemoCourse {
  const DemoCourse({
    required this.id,
    required this.title,
    required this.teacher,
    required this.level,
    required this.hours,
    required this.students,
    required this.colorValue,
    this.progress,
  });

  final String id;
  final String title;
  final String teacher;
  final String level;
  final String hours;
  final String students;
  final int colorValue;
  final double? progress;
}

/// Course level identifiers — resolve to display text via [courseLevelLabel].
const kLevelBasic = 'basic';
const kLevelIntermediate = 'intermediate';
const kLevelAdvanced = 'advanced';

const demoCourses = [
  DemoCourse(
    id: 'c1',
    title: 'Fundamentos de seguros de vida',
    teacher: 'Elena Vargas',
    level: kLevelBasic,
    hours: '8h',
    students: '1.2k',
    colorValue: 0xFF98CA3F,
    progress: 0.45,
  ),
  DemoCourse(
    id: 'c2',
    title: 'Objeciones en ventas consultivas',
    teacher: 'Diego Solano',
    level: kLevelIntermediate,
    hours: '6h',
    students: '890',
    colorValue: 0xFF33B1FF,
  ),
  DemoCourse(
    id: 'c3',
    title: 'Compliance y ética del agente',
    teacher: 'Patricia Gómez',
    level: kLevelBasic,
    hours: '4h',
    students: '2.4k',
    colorValue: 0xFFFF6B6B,
  ),
  DemoCourse(
    id: 'c4',
    title: 'Pitch de productos Every',
    teacher: 'Andrés Quirós',
    level: kLevelAdvanced,
    hours: '10h',
    students: '640',
    colorValue: 0xFFFFB84D,
    progress: 0.12,
  ),
];

/// Resolves a [DemoCourse.level] identifier to its localized label.
String courseLevelLabel(AppLocalizations l10n, String level) {
  switch (level) {
    case kLevelIntermediate:
      return l10n.levelIntermediate;
    case kLevelAdvanced:
      return l10n.levelAdvanced;
    default:
      return l10n.levelBasic;
  }
}

const demoAiChats = [
  'Resumen de objeciones comunes',
  'Script para llamada en frío',
  'Explicar deducible simple',
  'Comparar vida vs gastos médicos',
];

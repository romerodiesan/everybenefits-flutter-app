import '../../../l10n/app_localizations.dart';

/// Localized relative timestamps for forum meta lines.
String formatRelativeTime(
  DateTime dateTime,
  AppLocalizations l10n, {
  DateTime? now,
}) {
  final current = (now ?? DateTime.now()).toUtc();
  final target = dateTime.toUtc();
  var diff = current.difference(target);
  if (diff.isNegative) diff = Duration.zero;

  if (diff.inSeconds < 45) return l10n.timeNow;
  if (diff.inMinutes < 60) {
    final m = diff.inMinutes.clamp(1, 59);
    return m == 1 ? l10n.timeMinutesOne : l10n.timeMinutesOther(m);
  }
  if (diff.inHours < 24) {
    final h = diff.inHours;
    return h == 1 ? l10n.timeHoursOne : l10n.timeHoursOther(h);
  }
  if (diff.inDays == 1) return l10n.timeYesterday;
  if (diff.inDays < 7) return l10n.timeDays(diff.inDays);

  final local = target.toLocal();
  final day = local.day.toString().padLeft(2, '0');
  final month = local.month.toString().padLeft(2, '0');
  if (local.year == current.toLocal().year) {
    return '$day/$month';
  }
  return '$day/$month/${local.year}';
}

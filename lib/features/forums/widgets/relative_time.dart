/// Relative Spanish timestamps for forum meta lines.
String formatRelativeTime(DateTime dateTime, {DateTime? now}) {
  final current = (now ?? DateTime.now()).toUtc();
  final target = dateTime.toUtc();
  var diff = current.difference(target);
  if (diff.isNegative) diff = Duration.zero;

  if (diff.inSeconds < 45) return 'ahora';
  if (diff.inMinutes < 60) {
    final m = diff.inMinutes.clamp(1, 59);
    return m == 1 ? 'hace 1 min' : 'hace $m min';
  }
  if (diff.inHours < 24) {
    final h = diff.inHours;
    return h == 1 ? 'hace 1 h' : 'hace $h h';
  }
  if (diff.inDays == 1) return 'ayer';
  if (diff.inDays < 7) return 'hace ${diff.inDays} d';

  final local = target.toLocal();
  final day = local.day.toString().padLeft(2, '0');
  final month = local.month.toString().padLeft(2, '0');
  if (local.year == current.toLocal().year) {
    return '$day/$month';
  }
  return '$day/$month/${local.year}';
}

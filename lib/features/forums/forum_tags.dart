String normalizeForumTag(String raw) {
  return raw
      .trim()
      .toLowerCase()
      .replaceAll(RegExp(r'\s+'), '-')
      .replaceAll(RegExp(r'[^a-z0-9\-áéíóúüñ]'), '')
      .replaceAll(RegExp(r'-+'), '-')
      .replaceAll(RegExp(r'^-|-$'), '');
}

List<String> normalizeForumTags(Iterable<String> raw) {
  final seen = <String>{};
  final result = <String>[];
  for (final item in raw) {
    final tag = normalizeForumTag(item);
    if (tag.isEmpty || seen.contains(tag)) continue;
    seen.add(tag);
    result.add(tag);
    if (result.length >= 5) break;
  }
  return result;
}

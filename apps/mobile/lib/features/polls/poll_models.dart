import 'package:cloud_firestore/cloud_firestore.dart';

import '../promo/promo_banner_models.dart';

typedef PollLocalizedString = PromoBannerLocalizedString;

class PollOption {
  const PollOption({required this.id, required this.label});

  final String id;
  final PollLocalizedString label;
}

class Poll {
  const Poll({
    required this.id,
    required this.version,
    required this.active,
    required this.surface,
    required this.audiences,
    required this.question,
    required this.options,
    required this.allowChange,
    required this.showResultsBeforeVote,
    required this.dismissible,
    required this.counts,
    required this.voteCount,
    this.startsAt,
    this.endsAt,
    this.createdAt,
    this.updatedAt,
    this.updatedBy,
  });

  final String id;
  final int version;
  final bool active;
  final PromoBannerSurface surface;
  final List<String> audiences;
  final PollLocalizedString question;
  final List<PollOption> options;
  final bool allowChange;
  final bool showResultsBeforeVote;
  final bool dismissible;
  final Map<String, int> counts;
  final int voteCount;
  final int? startsAt;
  final int? endsAt;
  final int? createdAt;
  final int? updatedAt;
  final String? updatedBy;
}

Poll pollFromMap(String id, Map<String, dynamic> data) {
  final optionsRaw = data['options'];
  final options = <PollOption>[];
  if (optionsRaw is List) {
    for (var i = 0; i < optionsRaw.length; i++) {
      final raw = optionsRaw[i];
      if (raw is! Map) continue;
      final map = Map<String, dynamic>.from(raw);
      final optionId = (map['id'] as String?)?.trim();
      options.add(
        PollOption(
          id: (optionId != null && optionId.isNotEmpty) ? optionId : 'o${i + 1}',
          label: localizedBannerString(map['label']),
        ),
      );
    }
  }
  final counts = <String, int>{};
  final countsRaw = data['counts'];
  if (countsRaw is Map) {
    for (final entry in countsRaw.entries) {
      final value = entry.value;
      if (value is num && value.isFinite) {
        counts[entry.key.toString()] = value.toInt();
      }
    }
  }
  final audiences = data['audiences'] is List
      ? (data['audiences'] as List).map((e) => e.toString()).toList()
      : const ['all'];

  return Poll(
    id: id,
    version: (data['version'] as num?)?.toInt() ?? 1,
    active: data['active'] == true,
    surface: parsePromoBannerSurface(data['surface'] as String?),
    audiences: audiences.isEmpty ? const ['all'] : audiences,
    question: localizedBannerString(data['question']),
    options: options,
    allowChange: data['allowChange'] == true,
    showResultsBeforeVote: data['showResultsBeforeVote'] == true,
    dismissible: data['dismissible'] != false,
    counts: counts,
    voteCount: (data['voteCount'] as num?)?.toInt() ?? 0,
    startsAt: millisOrNull(data['startsAt']),
    endsAt: millisOrNull(data['endsAt']),
    createdAt: millisOrNull(data['createdAt']),
    updatedAt: millisOrNull(data['updatedAt']),
    updatedBy: data['updatedBy'] as String?,
  );
}

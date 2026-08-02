/// Shared contracts between the Pulse AI SSE API and the Flutter client.
library;

enum PulseSourceType {
  acceptedForumAnswer,
  course,
  path,
  lesson,
  official,
}

PulseSourceType pulseSourceTypeFrom(String? raw) {
  switch (raw) {
    case 'accepted_forum_answer':
      return PulseSourceType.acceptedForumAnswer;
    case 'course':
      return PulseSourceType.course;
    case 'path':
      return PulseSourceType.path;
    case 'lesson':
      return PulseSourceType.lesson;
    default:
      return PulseSourceType.official;
  }
}

class PulseSource {
  const PulseSource({
    required this.ref,
    required this.type,
    required this.title,
    required this.excerpt,
    required this.sourceId,
    required this.parentId,
    required this.url,
    required this.publisher,
  });

  factory PulseSource.fromJson(Map<String, dynamic> json) {
    return PulseSource(
      ref: '${json['ref'] ?? ''}',
      type: pulseSourceTypeFrom(json['type'] as String?),
      title: '${json['title'] ?? ''}',
      excerpt: '${json['excerpt'] ?? ''}',
      sourceId: '${json['sourceId'] ?? ''}',
      parentId: json['parentId'] == null ? null : '${json['parentId']}',
      url: '${json['url'] ?? ''}',
      publisher: json['publisher'] == null ? null : '${json['publisher']}',
    );
  }

  final String ref;
  final PulseSourceType type;
  final String title;
  final String excerpt;
  final String sourceId;
  final String? parentId;
  final String url;
  final String? publisher;

  String get number => ref.replaceFirst(RegExp(r'^S'), '');
}

enum PulseActivityKind { forum, academy, official, web, profile }

enum PulseActivityStatus { running, done, empty, error }

class PulseActivity {
  const PulseActivity({
    required this.id,
    required this.kind,
    required this.status,
    required this.query,
    required this.resultCount,
  });

  factory PulseActivity.fromJson(Map<String, dynamic> json) {
    PulseActivityKind kind;
    switch (json['kind']) {
      case 'forum':
        kind = PulseActivityKind.forum;
      case 'academy':
        kind = PulseActivityKind.academy;
      case 'official':
        kind = PulseActivityKind.official;
      case 'web':
        kind = PulseActivityKind.web;
      default:
        kind = PulseActivityKind.profile;
    }
    PulseActivityStatus status;
    switch (json['status']) {
      case 'done':
        status = PulseActivityStatus.done;
      case 'empty':
        status = PulseActivityStatus.empty;
      case 'error':
        status = PulseActivityStatus.error;
      default:
        status = PulseActivityStatus.running;
    }
    return PulseActivity(
      id: '${json['id'] ?? ''}',
      kind: kind,
      status: status,
      query: '${json['query'] ?? ''}',
      resultCount: (json['resultCount'] as num?)?.toInt() ?? 0,
    );
  }

  final String id;
  final PulseActivityKind kind;
  final PulseActivityStatus status;
  final String query;
  final int resultCount;
}

enum PulseNoticeKind { refusal, compliance, noSources }

class PulseNotice {
  const PulseNotice({required this.kind, this.reason});

  factory PulseNotice.fromJson(Map<String, dynamic> json) {
    final kind = switch (json['kind']) {
      'refusal' => PulseNoticeKind.refusal,
      'compliance' => PulseNoticeKind.compliance,
      _ => PulseNoticeKind.noSources,
    };
    return PulseNotice(kind: kind, reason: json['reason'] as String?);
  }

  final PulseNoticeKind kind;
  final String? reason;
}

class PulseConversationSummary {
  const PulseConversationSummary({
    required this.id,
    required this.title,
    required this.lastMessagePreview,
    required this.messageCount,
    required this.updatedAt,
  });

  factory PulseConversationSummary.fromJson(Map<String, dynamic> json) {
    return PulseConversationSummary(
      id: '${json['id'] ?? ''}',
      title: (json['title'] as String?)?.trim().isNotEmpty == true
          ? '${json['title']}'
          : '',
      lastMessagePreview: '${json['lastMessagePreview'] ?? ''}',
      messageCount: (json['messageCount'] as num?)?.toInt() ?? 0,
      updatedAt: json['updatedAt'] is String
          ? DateTime.tryParse(json['updatedAt'] as String)
          : null,
    );
  }

  final String id;
  final String title;
  final String lastMessagePreview;
  final int messageCount;
  final DateTime? updatedAt;
}

class PulseStoredMessage {
  const PulseStoredMessage({
    required this.id,
    required this.role,
    required this.text,
    required this.sources,
    required this.feedback,
  });

  factory PulseStoredMessage.fromJson(Map<String, dynamic> json) {
    final sources = <PulseSource>[];
    final raw = json['sources'];
    if (raw is List) {
      for (final entry in raw) {
        if (entry is Map) {
          sources.add(
            PulseSource.fromJson(Map<String, dynamic>.from(entry)),
          );
        }
      }
    }
    return PulseStoredMessage(
      id: '${json['id'] ?? ''}',
      role: json['role'] == 'user' ? PulseRole.user : PulseRole.assistant,
      text: '${json['text'] ?? ''}',
      sources: sources,
      feedback: switch (json['feedback']) {
        'up' => PulseFeedback.up,
        'down' => PulseFeedback.down,
        _ => null,
      },
    );
  }

  final String id;
  final PulseRole role;
  final String text;
  final List<PulseSource> sources;
  final PulseFeedback? feedback;
}

enum PulseRole { user, assistant }

enum PulseFeedback { up, down }

/// One turn in the mobile transcript. Assistant turns accumulate streaming
/// text, activities and sources as SSE events arrive.
class PulseChatMessage {
  PulseChatMessage({
    required this.id,
    required this.role,
    this.text = '',
    List<PulseSource>? sources,
    List<PulseActivity>? activities,
    List<PulseNotice>? notices,
    this.storedId,
    this.feedback,
  })  : sources = sources ?? <PulseSource>[],
        activities = activities ?? <PulseActivity>[],
        notices = notices ?? <PulseNotice>[];

  final String id;
  final PulseRole role;
  String text;
  List<PulseSource> sources;
  List<PulseActivity> activities;
  List<PulseNotice> notices;
  String? storedId;
  PulseFeedback? feedback;

  bool get isUser => role == PulseRole.user;
}

sealed class PulseStreamEvent {
  const PulseStreamEvent();
}

class PulseConversationEvent extends PulseStreamEvent {
  const PulseConversationEvent({required this.conversationId, this.title});
  final String conversationId;
  final String? title;
}

class PulseActivityEvent extends PulseStreamEvent {
  const PulseActivityEvent(this.activity);
  final PulseActivity activity;
}

class PulseTextEvent extends PulseStreamEvent {
  const PulseTextEvent(this.delta);
  final String delta;
}

class PulseSourcesEvent extends PulseStreamEvent {
  const PulseSourcesEvent(this.sources);
  final List<PulseSource> sources;
}

class PulseNoticeEvent extends PulseStreamEvent {
  const PulseNoticeEvent(this.notice);
  final PulseNotice notice;
}

class PulseDoneEvent extends PulseStreamEvent {
  const PulseDoneEvent({required this.messageId, this.title});
  final String messageId;
  final String? title;
}

class PulseErrorEvent extends PulseStreamEvent {
  const PulseErrorEvent({required this.code, required this.message});
  final String code;
  final String message;
}

PulseStreamEvent? parsePulseStreamEvent(Map<String, dynamic> json) {
  switch (json['type']) {
    case 'conversation':
      return PulseConversationEvent(
        conversationId: '${json['conversationId'] ?? ''}',
        title: json['title'] as String?,
      );
    case 'activity':
      final raw = json['activity'];
      if (raw is! Map) return null;
      return PulseActivityEvent(
        PulseActivity.fromJson(Map<String, dynamic>.from(raw)),
      );
    case 'text':
      return PulseTextEvent('${json['delta'] ?? ''}');
    case 'sources':
      final raw = json['sources'];
      final sources = <PulseSource>[];
      if (raw is List) {
        for (final entry in raw) {
          if (entry is Map) {
            sources.add(
              PulseSource.fromJson(Map<String, dynamic>.from(entry)),
            );
          }
        }
      }
      return PulseSourcesEvent(sources);
    case 'notice':
      final raw = json['notice'];
      if (raw is! Map) return null;
      return PulseNoticeEvent(
        PulseNotice.fromJson(Map<String, dynamic>.from(raw)),
      );
    case 'done':
      return PulseDoneEvent(
        messageId: '${json['messageId'] ?? ''}',
        title: json['title'] as String?,
      );
    case 'error':
      return PulseErrorEvent(
        code: '${json['code'] ?? 'error'}',
        message: '${json['message'] ?? 'Pulse AI hit an error.'}',
      );
    default:
      return null;
  }
}

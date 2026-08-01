import 'package:every_benefits/features/ai_chat/pulse_ai_models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('parsePulseStreamEvent', () {
    test('parses text deltas', () {
      final event = parsePulseStreamEvent({'type': 'text', 'delta': 'Hello'});
      expect(event, isA<PulseTextEvent>());
      expect((event as PulseTextEvent).delta, 'Hello');
    });

    test('parses sources', () {
      final event = parsePulseStreamEvent({
        'type': 'sources',
        'sources': [
          {
            'ref': 'S1',
            'type': 'course',
            'title': 'Medicare Basics',
            'excerpt': 'Intro lesson',
            'sourceId': 'course-1',
            'url': '/academy/course-1',
          },
        ],
      });

      expect(event, isA<PulseSourcesEvent>());
      final sources = (event as PulseSourcesEvent).sources;
      expect(sources, hasLength(1));
      expect(sources.first.ref, 'S1');
      expect(sources.first.type, PulseSourceType.course);
      expect(sources.first.title, 'Medicare Basics');
    });

    test('parses done', () {
      final event = parsePulseStreamEvent({
        'type': 'done',
        'messageId': 'msg-1',
        'title': 'Medicare AEP',
      });

      expect(event, isA<PulseDoneEvent>());
      final done = event as PulseDoneEvent;
      expect(done.messageId, 'msg-1');
      expect(done.title, 'Medicare AEP');
    });

    test('parses error', () {
      final event = parsePulseStreamEvent({
        'type': 'error',
        'code': 'rate-limit',
        'message': 'Too many requests',
      });

      expect(event, isA<PulseErrorEvent>());
      final error = event as PulseErrorEvent;
      expect(error.code, 'rate-limit');
      expect(error.message, 'Too many requests');
    });
  });
}

import 'package:flutter_test/flutter_test.dart';

import 'package:every_benefits/users/avatar_storage.dart';

void main() {
  group('sanitizeAvatarDownloadUrl', () {
    test('removes legacy v query param without touching token', () {
      expect(
        sanitizeAvatarDownloadUrl(
          'http://10.0.0.77:9199/v0/b/x/o/a.jpg?alt=media&token=t&v=1784',
        ),
        'http://10.0.0.77:9199/v0/b/x/o/a.jpg?alt=media&token=t',
      );
    });

    test('strips v when it is the only extra param after alt', () {
      expect(
        sanitizeAvatarDownloadUrl(
          'https://cdn.example/a.jpg?alt=media&v=99',
        ),
        'https://cdn.example/a.jpg?alt=media',
      );
    });

    test('leaves clean download urls unchanged', () {
      const url =
          'https://firebasestorage.googleapis.com/o/a.jpg?alt=media&token=abc';
      expect(sanitizeAvatarDownloadUrl(url), url);
    });
  });
}

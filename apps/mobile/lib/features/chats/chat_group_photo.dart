import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';

import '../../l10n/l10n.dart';
import 'chat_repository.dart';

Future<Uint8List?> pickGroupImageBytes(BuildContext context) async {
  final l10n = context.l10n;
  final source = await showModalBottomSheet<ImageSource>(
    context: context,
    showDragHandle: true,
    builder: (context) {
      return SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: Text(l10n.profilePickGallery),
              onTap: () => Navigator.pop(context, ImageSource.gallery),
            ),
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined),
              title: Text(l10n.profileTakePhoto),
              onTap: () => Navigator.pop(context, ImageSource.camera),
            ),
          ],
        ),
      );
    },
  );
  if (source == null || !context.mounted) return null;
  try {
    final file = await ImagePicker().pickImage(
      source: source,
      maxWidth: 1024,
      maxHeight: 1024,
      imageQuality: 85,
    );
    if (file == null) return null;
    return await file.readAsBytes();
  } on PlatformException catch (error) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.profilePickImageFailed('${error.message}'))),
      );
    }
    return null;
  }
}

Future<String?> pickAndUploadGroupPhoto({
  required BuildContext context,
  required String chatId,
  ChatRepository? repository,
}) async {
  final bytes = await pickGroupImageBytes(context);
  if (bytes == null || !context.mounted) return null;
  try {
    return await (repository ?? ChatRepository()).uploadGroupPhoto(
      chatId: chatId,
      bytes: bytes,
    );
  } catch (error) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.l10n.profileUploadFailed('$error'))),
      );
    }
    return null;
  }
}

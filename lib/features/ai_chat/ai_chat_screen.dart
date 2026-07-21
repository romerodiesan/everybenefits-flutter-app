import 'package:flutter/material.dart';

import '../../app/widgets/empty_state.dart';

class AiChatScreen extends StatelessWidget {
  const AiChatScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(title: const Text('Asistente IA')),
      body: const EmptyState(
        mark: 'AI',
        title: 'Tu copiloto de seguros',
        subtitle: 'Gemini vía Firebase AI Logic estará disponible aquí.',
      ),
    );
  }
}

import 'package:flutter/material.dart';

import '../../app/widgets/empty_state.dart';

class ForumsScreen extends StatelessWidget {
  const ForumsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(title: const Text('Comunidad')),
      body: const EmptyState(
        mark: '01',
        title: 'Conversaciones de la comunidad',
        subtitle: 'Pronto podrás participar en foros con otros agentes.',
      ),
    );
  }
}

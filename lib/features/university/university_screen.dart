import 'package:flutter/material.dart';

import '../../app/widgets/empty_state.dart';

class UniversityScreen extends StatelessWidget {
  const UniversityScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(title: const Text('Universidad')),
      body: const EmptyState(
        mark: 'U',
        title: 'Aprende y certifícate',
        subtitle: 'El catálogo de cursos para agentes llegará pronto.',
      ),
    );
  }
}

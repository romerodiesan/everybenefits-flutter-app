import 'package:flutter/material.dart';

import '../../app/widgets/empty_state.dart';

class ChatsScreen extends StatelessWidget {
  const ChatsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          title: const Text('Chats'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Grupos'),
              Tab(text: 'Privados'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            EmptyState(
              mark: 'G',
              title: 'Chats grupales',
              subtitle: 'Espacios compartidos para equipos y comunidades.',
            ),
            EmptyState(
              mark: 'P',
              title: 'Chats privados',
              subtitle: 'Mensajes directos entre agentes, muy pronto.',
            ),
          ],
        ),
      ),
    );
  }
}

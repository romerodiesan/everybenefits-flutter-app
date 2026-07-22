/// Shared placeholder demo data for platform-style UIs (no backend).
class DemoPerson {
  const DemoPerson({
    required this.name,
    required this.handle,
    required this.initials,
    this.subtitle,
  });

  final String name;
  final String handle;
  final String initials;
  final String? subtitle;
}

class DemoChat {
  const DemoChat({
    required this.id,
    required this.title,
    required this.preview,
    required this.time,
    required this.initials,
    this.unread = 0,
    this.isGroup = false,
    this.pinned = false,
  });

  final String id;
  final String title;
  final String preview;
  final String time;
  final String initials;
  final int unread;
  final bool isGroup;
  final bool pinned;
}

class DemoMessage {
  const DemoMessage({
    required this.body,
    required this.time,
    required this.mine,
    this.sharedPost,
  });

  final String body;
  final String time;
  final bool mine;
  final SharedPostPreview? sharedPost;
}

/// Compact post reference shared into a private chat or group.
class SharedPostPreview {
  const SharedPostPreview({
    required this.threadId,
    required this.title,
    this.excerpt = '',
    this.authorName,
    this.tags = const [],
  });

  final String threadId;
  final String title;
  final String excerpt;
  final String? authorName;
  final List<String> tags;
}

class DemoCourse {
  const DemoCourse({
    required this.id,
    required this.title,
    required this.teacher,
    required this.level,
    required this.hours,
    required this.students,
    required this.colorValue,
    this.progress,
  });

  final String id;
  final String title;
  final String teacher;
  final String level;
  final String hours;
  final String students;
  final int colorValue;
  final double? progress;
}

const demoPeople = [
  DemoPerson(name: 'María López', handle: '@marial', initials: 'ML'),
  DemoPerson(name: 'Carlos Ruiz', handle: '@caruiz', initials: 'CR'),
  DemoPerson(name: 'Ana Pérez', handle: '@anap', initials: 'AP'),
  DemoPerson(name: 'Luis Mora', handle: '@lmora', initials: 'LM'),
  DemoPerson(name: 'Sofía Díaz', handle: '@sofd', initials: 'SD'),
];

const demoChats = [
  DemoChat(
    id: '1',
    title: 'Equipo Ventas CR',
    preview: 'Listo para el cierre de mes 👍',
    time: '10:42',
    initials: 'EV',
    unread: 3,
    isGroup: true,
    pinned: true,
  ),
  DemoChat(
    id: '2',
    title: 'María López',
    preview: '¿Me pasas el PDF del producto?',
    time: '09:18',
    initials: 'ML',
    unread: 1,
  ),
  DemoChat(
    id: '3',
    title: 'Carlos Ruiz',
    preview: 'Perfecto, nos vemos mañana',
    time: 'Ayer',
    initials: 'CR',
  ),
  DemoChat(
    id: '4',
    title: 'Agencia Every',
    preview: 'Nuevo lead asignado',
    time: 'Ayer',
    initials: 'AE',
    isGroup: true,
  ),
  DemoChat(
    id: '5',
    title: 'Ana Pérez',
    preview: 'Gracias!!',
    time: 'Lun',
    initials: 'AP',
  ),
];

const demoMessages = [
  DemoMessage(body: 'Hola! ¿Cómo va el pipeline?', time: '09:10', mine: false),
  DemoMessage(
    body: 'Bien, cerramos 2 pólizas ayer 🎉',
    time: '09:12',
    mine: true,
  ),
  DemoMessage(
    body: '¿Me pasas el PDF del producto?',
    time: '09:18',
    mine: false,
  ),
  DemoMessage(
    body: 'Claro, te lo mando en un rato',
    time: '09:19',
    mine: true,
  ),
];

const demoCourses = [
  DemoCourse(
    id: 'c1',
    title: 'Fundamentos de seguros de vida',
    teacher: 'Elena Vargas',
    level: 'Básico',
    hours: '8h',
    students: '1.2k',
    colorValue: 0xFF98CA3F,
    progress: 0.45,
  ),
  DemoCourse(
    id: 'c2',
    title: 'Objeciones en ventas consultivas',
    teacher: 'Diego Solano',
    level: 'Intermedio',
    hours: '6h',
    students: '890',
    colorValue: 0xFF33B1FF,
  ),
  DemoCourse(
    id: 'c3',
    title: 'Compliance y ética del agente',
    teacher: 'Patricia Gómez',
    level: 'Básico',
    hours: '4h',
    students: '2.4k',
    colorValue: 0xFFFF6B6B,
  ),
  DemoCourse(
    id: 'c4',
    title: 'Pitch de productos Every',
    teacher: 'Andrés Quirós',
    level: 'Avanzado',
    hours: '10h',
    students: '640',
    colorValue: 0xFFFFB84D,
    progress: 0.12,
  ),
];

const demoAiChats = [
  'Resumen de objeciones comunes',
  'Script para llamada en frío',
  'Explicar deducible simple',
  'Comparar vida vs gastos médicos',
];

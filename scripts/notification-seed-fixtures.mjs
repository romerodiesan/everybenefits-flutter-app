const hour = 60 * 60 * 1000;
const day = 24 * hour;

function at(now, offsetMs) {
  return new Date(now.getTime() - offsetMs);
}

// Seed rows are illustrative only: the referenced chats/threads/courses do not
// exist, so links point at the inbox to avoid permission_denied on dead refs.
const PREVIEW_HREF = '/notifications';
const PREVIEW_DEEP_LINK = 'pulse://notifications';

export function buildNotificationSeed(uid, now = new Date()) {
  const userId = uid?.trim();
  if (!userId) throw new Error('A target user id is required.');

  const rows = [
    {
      id: 'seed-chat-new',
      type: 'chat_message',
      title: 'Nuevo mensaje de María',
      body: '¿Puedes revisar la cotización antes de las 3?',
      href: '/chats/seed-team-chat',
      deepLink: 'pulse://chats/seed-team-chat',
      ref: { chatId: 'seed-team-chat' },
      read: false,
      createdAt: at(now, 4 * 60 * 1000),
    },
    {
      id: 'seed-support',
      type: 'support_message',
      title: 'Pulse Support respondió',
      body: 'Revisamos tu solicitud. Ya puedes volver a intentar.',
      href: `/chats/support_${userId}`,
      deepLink: `pulse://chats/support_${userId}`,
      ref: { chatId: `support_${userId}` },
      read: false,
      createdAt: at(now, 18 * 60 * 1000),
    },
    {
      id: 'seed-forum-reply',
      type: 'forum_reply',
      title: 'Nueva respuesta',
      body: 'Carlos respondió a tu pregunta sobre Medicare SEP.',
      href: '/home/seed-medicare-sep',
      deepLink: 'pulse://forums/seed-medicare-sep',
      ref: { threadId: 'seed-medicare-sep', replyId: 'seed-reply-1' },
      read: false,
      createdAt: at(now, 45 * 60 * 1000),
    },
    {
      id: 'seed-forum-vote',
      type: 'forum_vote',
      title: 'Tu publicación recibió un voto',
      body: 'A alguien le resultó útil tu respuesta.',
      href: '/home/seed-aca-subsidy',
      deepLink: 'pulse://forums/seed-aca-subsidy',
      ref: { threadId: 'seed-aca-subsidy' },
      read: false,
      createdAt: at(now, 2 * hour),
    },
    {
      id: 'seed-forum-thread',
      type: 'forum_new_thread',
      title: 'Nueva publicación en la comunidad',
      body: 'Objeciones comunes al presentar seguros de vida.',
      href: '/home/seed-life-objections',
      deepLink: 'pulse://forums/seed-life-objections',
      ref: { threadId: 'seed-life-objections' },
      read: false,
      createdAt: at(now, 5 * hour),
    },
    {
      id: 'seed-course-new',
      type: 'course_published',
      title: 'Nuevo curso publicado',
      body: 'Fundamentos de seguros de vida ya está disponible.',
      href: '/academy/seed-life-basics',
      deepLink: 'pulse://academy/seed-life-basics',
      ref: { courseId: 'seed-life-basics' },
      read: false,
      createdAt: at(now, 9 * hour),
    },
    {
      id: 'seed-chat-read',
      type: 'chat_message',
      title: 'Equipo de Medicare',
      body: 'Gracias, quedó resuelta la duda.',
      href: '/chats/seed-medicare-team',
      deepLink: 'pulse://chats/seed-medicare-team',
      ref: { chatId: 'seed-medicare-team' },
      read: true,
      createdAt: at(now, day + 3 * hour),
    },
    {
      id: 'seed-course-read',
      type: 'course_published',
      title: 'Curso disponible',
      body: 'Manejo de objeciones y cierre consultivo.',
      href: '/academy/seed-objections',
      deepLink: 'pulse://academy/seed-objections',
      ref: { courseId: 'seed-objections' },
      read: true,
      createdAt: at(now, 2 * day),
    },
  ];

  const notifications = rows.map((row) => ({
    ...row,
    href: PREVIEW_HREF,
    deepLink: PREVIEW_DEEP_LINK,
  }));

  const unread = notifications.filter((item) => !item.read);
  const unreadForum = unread.filter((item) => item.type.startsWith('forum_'));

  return {
    notifications,
    state: {
      unreadCount: unread.length,
      unreadForumCount: unreadForum.length,
      lastFeedSeenAt: at(now, day),
      prefs: {
        pushChats: true,
        pushForums: true,
        pushAcademy: true,
        pushSupport: true,
      },
      updatedAt: now,
    },
  };
}

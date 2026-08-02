import type { PulseSource } from "@/lib/ai/types";
import type {
  ChatConversation,
  Course,
  ForumThread,
  LearningPath,
} from "@/lib/types";

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);

export const LANDING_VIEWER_UID = "demo-viewer";

export const LANDING_THREADS: ForumThread[] = [
  {
    id: "t1",
    tags: ["compliance", "productos"],
    title: "Medicare SEP after a client moves states?",
    body: "Client relocated last month. Looking for the cleanest way to document the SEP and what carriers usually ask for.",
    authorId: "u1",
    authorName: "Ana Rivera",
    authorPhotoUrl: null,
    authorRole: "agent",
    replyCount: 8,
    score: 12,
    acceptedReplyId: "r1",
    createdAt: hoursAgo(2),
    updatedAt: hoursAgo(1),
    lastReplyAt: hoursAgo(1),
  },
  {
    id: "t2",
    tags: ["ventas"],
    title: "Best rebuttal for “I need to think about it”",
    body: "I’m getting this on every second appointment. What scripts actually land without sounding pushy?",
    authorId: "u2",
    authorName: "Marcus Chen",
    authorPhotoUrl: null,
    authorRole: "agent",
    replyCount: 14,
    score: 19,
    acceptedReplyId: null,
    createdAt: hoursAgo(5),
    updatedAt: hoursAgo(3),
    lastReplyAt: hoursAgo(3),
  },
  {
    id: "t3",
    tags: ["npn", "onboarding"],
    title: "NPN lookup delayed — anyone else?",
    body: "NIPR says pending for 48h. Is this normal for first-time appointments in FL?",
    authorId: "u3",
    authorName: "Sofia Alvarez",
    authorPhotoUrl: null,
    authorRole: "agent",
    replyCount: 5,
    score: 7,
    acceptedReplyId: null,
    createdAt: hoursAgo(9),
    updatedAt: hoursAgo(8),
    lastReplyAt: hoursAgo(8),
  },
];

export const LANDING_TOPIC_COUNTS: { tag: string; count: number }[] = [
  { tag: "ventas", count: 18 },
  { tag: "compliance", count: 11 },
  { tag: "npn", count: 9 },
  { tag: "productos", count: 7 },
  { tag: "onboarding", count: 4 },
];

export const LANDING_CHATS: ChatConversation[] = [
  {
    id: "c1",
    memberIds: [LANDING_VIEWER_UID, "u2"],
    memberNames: {
      [LANDING_VIEWER_UID]: "You",
      u2: "Marcus Chen",
    },
    isGroup: false,
    title: null,
    dmKey: "dm-demo",
    lastMessage: "Send the PPO comparison — I’ll drop the PDF here.",
    lastMessageAt: Date.now() - 12 * 60_000,
    lastMessageSenderId: LANDING_VIEWER_UID,
    unreadCounts: { [LANDING_VIEWER_UID]: 0, u2: 0 },
    pinnedBy: {},
    createdAt: Date.now() - 86_400_000,
    createdBy: LANDING_VIEWER_UID,
    isDefaultAgentGroup: false,
    isSupportChat: false,
    autoJoinRoles: [],
  },
  {
    id: "c2",
    memberIds: [LANDING_VIEWER_UID, "u1", "u3"],
    memberNames: {
      [LANDING_VIEWER_UID]: "You",
      u1: "Ana Rivera",
      u3: "Sofia Alvarez",
    },
    isGroup: true,
    title: "Medicare team",
    dmKey: null,
    lastMessage: "Anyone free to review a quote before 3pm?",
    lastMessageAt: Date.now() - 45 * 60_000,
    lastMessageSenderId: "u1",
    unreadCounts: { [LANDING_VIEWER_UID]: 2, u1: 0, u3: 0 },
    pinnedBy: { [LANDING_VIEWER_UID]: true },
    createdAt: Date.now() - 7 * 86_400_000,
    createdBy: "u1",
    isDefaultAgentGroup: false,
    isSupportChat: false,
    autoJoinRoles: [],
  },
  {
    id: "c3",
    memberIds: [LANDING_VIEWER_UID, "support-ai"],
    memberNames: {
      [LANDING_VIEWER_UID]: "You",
      "support-ai": "Support",
    },
    isGroup: false,
    title: "Support",
    dmKey: null,
    lastMessage: "Hi — how can we help?",
    lastMessageAt: Date.now() - 2 * 86_400_000,
    lastMessageSenderId: "support-ai",
    unreadCounts: { [LANDING_VIEWER_UID]: 0 },
    pinnedBy: {},
    createdAt: Date.now() - 14 * 86_400_000,
    createdBy: "support-ai",
    isDefaultAgentGroup: false,
    isSupportChat: true,
    autoJoinRoles: [],
  },
];

export const LANDING_COURSES: Course[] = [
  {
    id: "course-ma",
    title: "Medicare Advantage fundamentals",
    description: "Plan types, eligibility, and enrollment periods.",
    teacherName: "Every Benefits Academy",
    level: "basic",
    status: "published",
    coverPath: null,
    coverUrl: null,
    lessonCount: 8,
    durationMinutes: 130,
    studentCount: 214,
    createdBy: "academy",
    createdAt: hoursAgo(720),
    updatedAt: hoursAgo(48),
    publishedAt: hoursAgo(700),
  },
  {
    id: "course-close",
    title: "Closing with confidence",
    description: "Objection handling and appointment structure.",
    teacherName: "Every Benefits Academy",
    level: "intermediate",
    status: "published",
    coverPath: null,
    coverUrl: null,
    lessonCount: 6,
    durationMinutes: 100,
    studentCount: 168,
    createdBy: "academy",
    createdAt: hoursAgo(600),
    updatedAt: hoursAgo(72),
    publishedAt: hoursAgo(580),
  },
];

export const LANDING_PATH: LearningPath = {
  id: "path-new-agent",
  title: "New agent path",
  description: "From licensing basics to your first book of business.",
  level: "basic",
  status: "published",
  courseIds: ["course-ma", "course-close"],
  order: 0,
  createdBy: "academy",
};

export const LANDING_COURSE_PROGRESS: Record<string, number> = {
  "course-ma": 0.72,
  "course-close": 0.18,
};

export const LANDING_AI_USER =
  "Write a 30-second Medicare intro for a door knock.";

export const LANDING_AI_REPLY =
  "Hi, I’m a licensed agent with Every Benefits. I help neighbors compare Medicare options at no cost — want a quick look at what fits your doctors and budget? [S1]";

export const LANDING_AI_SOURCES: PulseSource[] = [
  {
    ref: "S1",
    type: "accepted_forum_answer",
    title: "Clean Medicare door intro",
    excerpt:
      "Keep it under 30 seconds, name your license, and lead with choice — not a pitch.",
    sourceId: "t2",
    parentId: "t2",
    url: "/home/t2",
    publisher: null,
  },
];

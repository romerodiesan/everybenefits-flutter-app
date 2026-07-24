export type UserRole =
  | "guest"
  | "student"
  | "agent"
  | "instructor"
  | "manager"
  | "admin";

export const DEFAULT_AGENCY = "Every Benefits";

export type UserProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;
  role: UserRole;
  isAnonymous: boolean;
  profileCompleted: boolean;
  phoneCountryCode: string | null;
  phoneNumber: string | null;
  npn: string | null;
  address: string | null;
  addressStreet: string | null;
  addressApt: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  agency: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type ForumThread = {
  id: string;
  tags: string[];
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  authorPhotoUrl: string | null;
  authorRole: UserRole;
  replyCount: number;
  score: number;
  acceptedReplyId: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  lastReplyAt: Date | null;
};

export type ForumReply = {
  id: string;
  threadId: string;
  body: string;
  authorId: string;
  authorName: string;
  authorPhotoUrl: string | null;
  authorRole: UserRole;
  score: number;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type SharedPostPreview = {
  threadId: string;
  title: string;
  excerpt: string;
  authorName?: string | null;
  tags: string[];
};

export type ChatConversation = {
  id: string;
  memberIds: string[];
  memberNames: Record<string, string>;
  isGroup: boolean;
  title: string | null;
  dmKey: string | null;
  lastMessage: string;
  lastMessageAt: number;
  lastMessageSenderId: string | null;
  unreadCounts: Record<string, number>;
  pinnedBy: Record<string, boolean>;
  createdAt: number;
  createdBy: string;
  isDefaultAgentGroup: boolean;
  isSupportChat: boolean;
};

export type ChatMessage = {
  id: string;
  chatId: string;
  body: string;
  senderId: string;
  senderName: string;
  createdAt: number;
  sharedPost?: SharedPostPreview | null;
  isAi?: boolean;
  reactions?: Record<string, string>;
};

export const SUPPORT_AI_UID = "support-ai";
export const AGENTS_DEFAULT_ID = "agents-default";

export const FORUM_TAGS = [
  "npn",
  "ventas",
  "productos",
  "compliance",
  "onboarding",
  "comisiones",
  "renovacion",
  "general",
] as const;

export const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;

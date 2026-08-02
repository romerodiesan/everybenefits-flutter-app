import type { UIMessage } from "ai";
import type { AppLocale } from "@/i18n/routing";

/** Where a retrieved passage came from. Drives ranking, labels and links. */
export type PulseSourceType =
  | "accepted_forum_answer"
  | "course"
  | "path"
  | "lesson"
  | "official";

/**
 * A citation the server vouches for.
 *
 * Every field is built from retrieval results, never from model output, so a
 * hallucinated id or URL can never reach the client.
 */
export type PulseSource = {
  /** Short handle the model uses inline, e.g. `S1`. */
  ref: string;
  type: PulseSourceType;
  title: string;
  excerpt: string;
  /** Firestore id of the thread, course, path or curated official entry. */
  sourceId: string;
  /** Course id for lessons, thread id for accepted answers. */
  parentId: string | null;
  /** Web destination; relative for in-app content, absolute for official sources. */
  url: string;
  /** Host shown next to official citations, e.g. `www.cms.gov`. */
  publisher: string | null;
};

/** Human-readable progress shown while the agent works. */
export type PulseActivity = {
  id: string;
  kind: "forum" | "academy" | "official" | "web" | "profile";
  status: "running" | "done" | "empty" | "error";
  query: string;
  resultCount: number;
};

/** Why the agent declined, so clients can show the right copy. */
export type PulseRefusalReason = "out_of_scope" | "legal_advice" | "unsafe";

export type PulseNotice = {
  kind: "refusal" | "compliance" | "no_sources";
  reason?: PulseRefusalReason;
};

export type PulseDataParts = {
  "pulse-activity": PulseActivity;
  "pulse-sources": { sources: PulseSource[] };
  "pulse-notice": PulseNotice;
  "pulse-conversation": { conversationId: string; title: string | null };
  /** Firestore id of the persisted answer, needed to attach feedback. */
  "pulse-saved": { messageId: string };
};

export type PulseMetadata = {
  createdAt?: number;
  model?: string;
  locale?: AppLocale;
};

export type PulseUIMessage = UIMessage<PulseMetadata, PulseDataParts>;

/** A stored turn. Sources are persisted so history renders identically. */
export type PulseStoredMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  sources: PulseSource[];
  createdAt: Date | null;
  feedback: "up" | "down" | null;
};

export type PulseConversation = {
  id: string;
  title: string;
  locale: AppLocale;
  messageCount: number;
  lastMessagePreview: string;
  createdAt: Date | null;
  updatedAt: Date | null;
};

/** Event shape consumed by the Flutter client over plain SSE. */
export type PulseMobileEvent =
  | { type: "conversation"; conversationId: string; title: string | null }
  | { type: "activity"; activity: PulseActivity }
  | { type: "text"; delta: string }
  | { type: "sources"; sources: PulseSource[] }
  | { type: "notice"; notice: PulseNotice }
  | { type: "done"; messageId: string; title: string | null }
  | { type: "error"; code: string; message: string };

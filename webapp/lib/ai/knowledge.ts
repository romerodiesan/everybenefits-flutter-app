import { createHash } from "node:crypto";
import type { AppLocale } from "@/i18n/routing";
import type { PulseSourceType } from "./types";

/** Coarse bucket a chunk is filtered by. Keeps vector indexes to one per group. */
export type KnowledgeGroup = "forum" | "academy" | "official";

export const GROUP_BY_SOURCE_TYPE: Record<PulseSourceType, KnowledgeGroup> = {
  accepted_forum_answer: "forum",
  course: "academy",
  path: "academy",
  lesson: "academy",
  official: "official",
};

/** One retrievable passage. Written only by the server-side indexer. */
export type KnowledgeChunk = {
  id: string;
  group: KnowledgeGroup;
  sourceType: PulseSourceType;
  sourceId: string;
  parentId: string | null;
  chunkIndex: number;
  language: AppLocale;
  title: string;
  content: string;
  tags: string[];
  searchTokens: string[];
  /** 0–1 authority weight; official rules outrank community experience. */
  trustWeight: number;
  /** Relative in-app path (locale is injected at read time) or absolute URL. */
  url: string;
  publisher: string | null;
  contentHash: string;
};

const STOPWORDS = new Set([
  // English
  "a", "about", "an", "and", "are", "as", "at", "be", "but", "by", "can", "do",
  "does", "for", "from", "has", "have", "how", "i", "if", "in", "into", "is",
  "it", "its", "me", "my", "no", "not", "of", "on", "or", "our", "so", "than",
  "that", "the", "their", "them", "then", "there", "these", "they", "this",
  "to", "was", "we", "were", "what", "when", "where", "which", "who", "why",
  "will", "with", "you", "your",
  // Spanish
  "al", "algo", "como", "con", "cual", "cuando", "de", "del", "donde", "el",
  "ella", "ellos", "en", "es", "esa", "ese", "eso", "esta", "este", "esto",
  "hay", "la", "las", "lo", "los", "mas", "me", "mi", "muy", "nos", "para",
  "pero", "por", "porque", "que", "quien", "se", "ser", "si", "sin", "sobre",
  "son", "su", "sus", "tambien", "te", "tiene", "todo", "un", "una", "uno",
  "y", "ya",
]);

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9&\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Content words used for the lexical half of retrieval. */
export function tokenize(value: string, limit = 60): string[] {
  const seen = new Set<string>();
  for (const word of normalizeText(value).split(" ")) {
    if (word.length < 3 || STOPWORDS.has(word)) continue;
    seen.add(word);
    if (seen.size >= limit) break;
  }
  return [...seen];
}

const SPANISH_MARKERS = /[áéíóúñü¿¡]|\b(?:de|que|para|como|los|las|con|por|una|del|seguro|poliza|cobertura)\b/gi;
const ENGLISH_MARKERS = /\b(?:the|and|for|with|your|this|that|from|policy|coverage|insurance|claim)\b/gi;

/** Best-effort locale tag so retrieval can prefer same-language passages. */
export function detectLanguage(text: string): AppLocale {
  const sample = text.slice(0, 2000);
  const spanish = sample.match(SPANISH_MARKERS)?.length ?? 0;
  const english = sample.match(ENGLISH_MARKERS)?.length ?? 0;
  return spanish > english ? "es" : "en";
}

export function hashContent(...parts: string[]): string {
  return createHash("sha256").update(parts.join("\u0000")).digest("hex").slice(0, 32);
}

/** Firestore ids may not contain `/`; source ids are already safe but titles are not. */
export function chunkDocId(
  sourceType: PulseSourceType,
  sourceId: string,
  chunkIndex: number,
): string {
  const safe = sourceId.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 120);
  return `${sourceType}__${safe}__${chunkIndex}`;
}

/**
 * Splits long text on paragraph boundaries, falling back to sentences and then
 * hard slicing. Chunks overlap slightly so a definition split across a boundary
 * still retrieves cleanly.
 */
export function splitIntoChunks(
  text: string,
  options: { maxChars?: number; overlapChars?: number } = {},
): string[] {
  const maxChars = options.maxChars ?? 1200;
  const overlapChars = options.overlapChars ?? 120;
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];

  const pieces = clean
    .split(/\n{2,}/)
    .flatMap((paragraph) =>
      paragraph.length <= maxChars
        ? [paragraph]
        : paragraph.split(/(?<=[.!?])\s+/),
    )
    .flatMap((piece) => {
      if (piece.length <= maxChars) return [piece];
      const slices: string[] = [];
      for (let i = 0; i < piece.length; i += maxChars) {
        slices.push(piece.slice(i, i + maxChars));
      }
      return slices;
    })
    .map((piece) => piece.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";
  for (const piece of pieces) {
    if (!current) {
      current = piece;
      continue;
    }
    if (current.length + piece.length + 2 <= maxChars) {
      current = `${current}\n\n${piece}`;
      continue;
    }
    chunks.push(current);
    const tail = current.slice(-overlapChars);
    current = overlapChars > 0 ? `${tail}\n\n${piece}`.slice(-maxChars) : piece;
  }
  if (current) chunks.push(current);
  return chunks;
}

/** Strips markdown to plain prose so embeddings score on meaning, not syntax. */
export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s{0,3}([-*+]|\d+[.)])\s+/gm, "")
    .replace(/(\*\*|__|\*|_)/g, "")
    .replace(/^\s*([-*_]\s*){3,}\s*$/gm, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Authority weight used to break ties during fusion. Official regulator
 * material outranks curricula, which outrank community experience; within the
 * forum, answers accepted on well-voted threads by staff rank highest.
 */
export function trustWeightFor(input: {
  sourceType: PulseSourceType;
  score?: number;
  authorRole?: string;
}): number {
  switch (input.sourceType) {
    case "official":
      return 1;
    case "course":
    case "path":
      return 0.8;
    case "lesson":
      return 0.75;
    case "accepted_forum_answer": {
      const staff = ["instructor", "manager", "admin"].includes(
        input.authorRole ?? "",
      );
      const votes = Math.max(0, Math.min(input.score ?? 0, 20)) / 20;
      return Math.min(0.7, 0.45 + (staff ? 0.15 : 0) + votes * 0.1);
    }
    default:
      return 0.5;
  }
}

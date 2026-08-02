import type { AppLocale } from "@/i18n/routing";
import type { PulseSource, PulseSourceType } from "./types";
import type { RetrievedChunk } from "./retrieval";

/** Relative in-app destinations, stored without a locale prefix. */
export function inAppPath(
  sourceType: PulseSourceType,
  sourceId: string,
  parentId: string | null,
): string {
  switch (sourceType) {
    case "accepted_forum_answer":
      return `/home/${sourceId}`;
    case "course":
      return `/academy/${sourceId}`;
    case "path":
      return `/academy/paths/${sourceId}`;
    case "lesson":
      return parentId
        ? `/academy/${parentId}/learn?lesson=${encodeURIComponent(sourceId)}`
        : `/academy`;
    default:
      return "/";
  }
}

export function localizeUrl(url: string, locale: AppLocale): string {
  if (/^https?:\/\//i.test(url)) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `/${locale}${path}`;
}

function excerptOf(text: string, maxChars = 220): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, maxChars).replace(/\s+\S*$/, "")}…`;
}

/**
 * Issues and remembers the citations a single run is allowed to use.
 *
 * The model only ever sees the short `ref` handles this registry hands out, so
 * a citation it emits either resolves to a document a tool actually returned or
 * is dropped. Titles and URLs are always taken from the index, never from the
 * model.
 */
export class CitationRegistry {
  private readonly byRef = new Map<string, PulseSource>();
  private readonly refByChunk = new Map<string, string>();
  private counter = 0;

  constructor(private readonly locale: AppLocale) {}

  /** Returns the stable ref for a chunk, registering it on first sight. */
  register(chunk: RetrievedChunk): PulseSource {
    const key = `${chunk.sourceType}:${chunk.sourceId}`;
    const existingRef = this.refByChunk.get(key);
    if (existingRef) {
      const existing = this.byRef.get(existingRef);
      if (existing) return existing;
    }

    this.counter += 1;
    const ref = `S${this.counter}`;
    const source: PulseSource = {
      ref,
      type: chunk.sourceType,
      title: chunk.title || ref,
      excerpt: excerptOf(chunk.content),
      sourceId: chunk.sourceId,
      parentId: chunk.parentId,
      url: localizeUrl(chunk.url, this.locale),
      publisher: chunk.publisher,
    };
    this.byRef.set(ref, source);
    this.refByChunk.set(key, ref);
    return source;
  }

  registerAll(chunks: RetrievedChunk[]): PulseSource[] {
    return chunks.map((chunk) => this.register(chunk));
  }

  all(): PulseSource[] {
    return [...this.byRef.values()];
  }

  /** Citations the finished answer actually referenced, in first-use order. */
  usedIn(answer: string): PulseSource[] {
    const used: PulseSource[] = [];
    const pattern = /\[(S\d+)\]/g;
    let match = pattern.exec(answer);
    while (match) {
      const source = this.byRef.get(match[1]);
      if (source && !used.includes(source)) used.push(source);
      match = pattern.exec(answer);
    }
    return used;
  }

  /** Refs the model invented; recorded on the run so drift is measurable. */
  invalidRefsIn(answer: string): string[] {
    const invalid = new Set<string>();
    const pattern = /\[(S\d+)\]/g;
    let match = pattern.exec(answer);
    while (match) {
      if (!this.byRef.has(match[1])) invalid.add(match[1]);
      match = pattern.exec(answer);
    }
    return [...invalid];
  }
}

/** Compact form handed to the model: enough to summarise, no raw HTML or ids. */
export function formatChunkForModel(
  source: PulseSource,
  chunk: RetrievedChunk,
  maxChars: number,
): {
  ref: string;
  type: PulseSourceType;
  title: string;
  publisher: string | null;
  content: string;
} {
  return {
    ref: source.ref,
    type: source.type,
    title: source.title,
    publisher: source.publisher,
    content: chunk.content.slice(0, maxChars),
  };
}

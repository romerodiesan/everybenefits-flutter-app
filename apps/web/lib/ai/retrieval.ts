import "server-only";

import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import type { AppLocale } from "@pulse/i18n";
import { aiConfig, KNOWLEDGE_COLLECTION } from "./config";
import { adminDb } from "./firebase-admin";
import { cosineSimilarity, embedQuery } from "./embeddings";
import { GROUP_BY_SOURCE_TYPE, tokenize, type KnowledgeGroup } from "./knowledge";
import type { PulseSourceType } from "./types";

export type RetrievedChunk = {
  id: string;
  sourceType: PulseSourceType;
  sourceId: string;
  parentId: string | null;
  title: string;
  content: string;
  tags: string[];
  language: AppLocale;
  url: string;
  publisher: string | null;
  trustWeight: number;
  score: number;
};

/** Firestore caps `array-contains-any` at 30 values. */
const MAX_LEXICAL_TOKENS = 20;
const LEXICAL_CANDIDATES = 40;
const VECTOR_CANDIDATES = 24;
/** Reciprocal-rank-fusion damping; 60 is the value from the original paper. */
const RRF_K = 60;

/** `firebase-admin` does not re-export `VectorValue`, so match it structurally. */
function readEmbedding(value: unknown): number[] | null {
  if (!value) return null;
  if (Array.isArray(value)) return value as number[];
  const vector = value as { toArray?: () => number[] };
  return typeof vector.toArray === "function" ? vector.toArray() : null;
}

function toChunk(snapshot: QueryDocumentSnapshot): RetrievedChunk | null {
  const data = snapshot.data();
  if (!data || typeof data.content !== "string" || !data.content.trim()) {
    return null;
  }
  return {
    id: snapshot.id,
    sourceType: data.sourceType as PulseSourceType,
    sourceId: String(data.sourceId ?? ""),
    parentId: typeof data.parentId === "string" ? data.parentId : null,
    title: String(data.title ?? ""),
    content: data.content,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    language: data.language === "es" ? "es" : "en",
    url: String(data.url ?? ""),
    publisher: typeof data.publisher === "string" ? data.publisher : null,
    trustWeight: Number(data.trustWeight ?? 0.5),
    score: 0,
  };
}

async function vectorCandidates(
  group: KnowledgeGroup,
  queryVector: number[],
  limit: number,
): Promise<RetrievedChunk[]> {
  const snapshot = await adminDb()
    .collection(KNOWLEDGE_COLLECTION)
    .where("group", "==", group)
    .findNearest({
      vectorField: "embedding",
      queryVector,
      limit,
      distanceMeasure: "COSINE",
    })
    .get();

  return snapshot.docs
    .map(toChunk)
    .filter((chunk): chunk is RetrievedChunk => chunk !== null);
}

async function lexicalCandidates(
  group: KnowledgeGroup,
  tokens: string[],
  limit: number,
): Promise<{ chunks: RetrievedChunk[]; embeddings: Map<string, number[]> }> {
  const collection = adminDb().collection(KNOWLEDGE_COLLECTION);
  const query = tokens.length
    ? collection
        .where("group", "==", group)
        .where("searchTokens", "array-contains-any", tokens.slice(0, MAX_LEXICAL_TOKENS))
        .limit(limit)
    : collection.where("group", "==", group).limit(limit);

  const snapshot = await query.get();
  const chunks: RetrievedChunk[] = [];
  const embeddings = new Map<string, number[]>();
  for (const doc of snapshot.docs) {
    const chunk = toChunk(doc);
    if (!chunk) continue;
    chunks.push(chunk);
    const embedding = readEmbedding(doc.get("embedding"));
    if (embedding) embeddings.set(chunk.id, embedding);
  }
  return { chunks, embeddings };
}

function lexicalOverlap(chunk: RetrievedChunk, tokens: string[]): number {
  if (!tokens.length) return 0;
  const haystack = tokenize(`${chunk.title} ${chunk.content}`, 400);
  const bag = new Set(haystack);
  let hits = 0;
  for (const token of tokens) {
    if (bag.has(token)) hits += 1;
  }
  return hits / tokens.length;
}

/** Reciprocal rank fusion, nudged by authority and language match. */
function fuse(input: {
  rankings: RetrievedChunk[][];
  locale: AppLocale;
  limit: number;
}): RetrievedChunk[] {
  const scores = new Map<string, number>();
  const byId = new Map<string, RetrievedChunk>();

  for (const ranking of input.rankings) {
    ranking.forEach((chunk, index) => {
      byId.set(chunk.id, chunk);
      scores.set(chunk.id, (scores.get(chunk.id) ?? 0) + 1 / (RRF_K + index + 1));
    });
  }

  const fused: RetrievedChunk[] = [];
  for (const [id, base] of scores) {
    const chunk = byId.get(id);
    if (!chunk) continue;
    const languageBonus = chunk.language === input.locale ? 0.004 : 0;
    fused.push({ ...chunk, score: base + chunk.trustWeight * 0.01 + languageBonus });
  }

  fused.sort((a, b) => b.score - a.score);

  // One passage per source keeps six citations pointing at six documents.
  const seenSources = new Set<string>();
  const deduped: RetrievedChunk[] = [];
  for (const chunk of fused) {
    const key = `${chunk.sourceType}:${chunk.sourceId}`;
    if (seenSources.has(key)) continue;
    seenSources.add(key);
    deduped.push(chunk);
    if (deduped.length >= input.limit) break;
  }
  return deduped;
}

export type SearchOptions = {
  query: string;
  sourceTypes: PulseSourceType[];
  locale: AppLocale;
  limit?: number;
  /** Restrict to these forum tags / course ids when the caller knows them. */
  tags?: string[];
};

/**
 * Hybrid search over the materialised knowledge index.
 *
 * Runs a vector search and a lexical search in parallel and fuses the two
 * rankings. If the vector index is missing (fresh project, emulator) the
 * lexical half still answers, re-ranked in memory against the stored
 * embeddings, so retrieval degrades instead of failing.
 */
export async function searchKnowledge(
  options: SearchOptions,
): Promise<RetrievedChunk[]> {
  const query = options.query.trim();
  if (!query) return [];

  const limit = options.limit ?? aiConfig.maxChunksPerTool;
  const groups = [
    ...new Set(options.sourceTypes.map((type) => GROUP_BY_SOURCE_TYPE[type])),
  ];
  const tokens = tokenize(query, MAX_LEXICAL_TOKENS);

  let queryVector: number[] | null = null;
  try {
    queryVector = await embedQuery(query);
  } catch (error) {
    console.warn("[pulse-ai] embedding failed, falling back to lexical", error);
  }

  const perGroup = await Promise.all(
    groups.map(async (group) => {
      const [vector, lexical] = await Promise.all([
        queryVector
          ? vectorCandidates(group, queryVector, VECTOR_CANDIDATES).catch(
              (error) => {
                console.warn("[pulse-ai] vector search unavailable", error);
                return null;
              },
            )
          : Promise.resolve(null),
        lexicalCandidates(group, tokens, LEXICAL_CANDIDATES).catch((error) => {
          console.warn("[pulse-ai] lexical search failed", error);
          return { chunks: [], embeddings: new Map<string, number[]>() };
        }),
      ]);

      const lexicalRanking = [...lexical.chunks].sort(
        (a, b) => lexicalOverlap(b, tokens) - lexicalOverlap(a, tokens),
      );

      if (vector && vector.length > 0) {
        return [vector, lexicalRanking];
      }

      // No vector index: approximate it by scoring the lexical candidates
      // against the query embedding we already computed.
      if (queryVector && lexical.embeddings.size > 0) {
        const approximate = [...lexical.chunks].sort((a, b) => {
          const ea = lexical.embeddings.get(a.id);
          const eb = lexical.embeddings.get(b.id);
          const sa = ea ? cosineSimilarity(queryVector, ea) : -1;
          const sb = eb ? cosineSimilarity(queryVector, eb) : -1;
          return sb - sa;
        });
        return [approximate, lexicalRanking];
      }

      return [lexicalRanking];
    }),
  );

  const rankings = perGroup.flat().map((ranking) =>
    ranking.filter((chunk) => {
      if (!options.sourceTypes.includes(chunk.sourceType)) return false;
      if (options.tags?.length) {
        return chunk.tags.some((tag) => options.tags?.includes(tag));
      }
      return true;
    }),
  );

  return fuse({ rankings, locale: options.locale, limit });
}

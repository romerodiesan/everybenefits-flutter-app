import "server-only";

import { embed, embedMany } from "ai";
import { aiConfig } from "./config";

/**
 * Gemini and OpenAI expose output truncation under different provider keys.
 * Sending both is harmless: each provider ignores the other's block.
 */
function providerOptions() {
  return {
    google: { outputDimensionality: aiConfig.embeddingDimensions },
    openai: { dimensions: aiConfig.embeddingDimensions },
  };
}

/** Embedding inputs are truncated; long chunks are already split upstream. */
function prepare(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 8000);
}

export async function embedQuery(query: string): Promise<number[]> {
  const { embedding } = await embed({
    model: aiConfig.embeddingModel,
    value: prepare(query),
    providerOptions: providerOptions(),
    maxRetries: 1,
  });
  return embedding;
}

export async function embedDocuments(values: string[]): Promise<number[][]> {
  if (values.length === 0) return [];
  const { embeddings } = await embedMany({
    model: aiConfig.embeddingModel,
    values: values.map(prepare),
    providerOptions: providerOptions(),
    maxParallelCalls: 2,
    maxRetries: 1,
  });
  return embeddings;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

import "server-only";

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function intEnv(name: string, fallback: number): number {
  const raw = env(name);
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function boolEnv(name: string, fallback: boolean): boolean {
  const raw = env(name)?.toLowerCase();
  if (raw === undefined) return fallback;
  return raw === "true" || raw === "1" || raw === "yes";
}

const isProduction = process.env.NODE_ENV === "production";

export const aiConfig = {
  /** Reasoning model behind the conversation. Routed through AI Gateway. */
  model: env("PULSE_AI_MODEL") ?? "anthropic/claude-sonnet-5",
  /** Cheap model for classification, titles and memory summaries. */
  fastModel: env("PULSE_AI_FAST_MODEL") ?? "google/gemini-3.6-flash",
  embeddingModel: env("PULSE_AI_EMBEDDING_MODEL") ?? "google/gemini-embedding-001",
  /** Firestore vector indexes cap at 2048; 768 keeps them cheap and bilingual. */
  embeddingDimensions: intEnv("PULSE_AI_EMBEDDING_DIMENSIONS", 768),

  /** Tool-loop budget: retrieve, optionally widen, then answer. */
  maxSteps: intEnv("PULSE_AI_MAX_STEPS", 6),
  maxOutputTokens: intEnv("PULSE_AI_MAX_OUTPUT_TOKENS", 1200),
  /** How many retrieved chunks may reach the model per tool call. */
  maxChunksPerTool: intEnv("PULSE_AI_MAX_CHUNKS_PER_TOOL", 6),
  /** Characters of a single chunk handed to the model. */
  maxChunkChars: intEnv("PULSE_AI_MAX_CHUNK_CHARS", 1400),
  /** Turns kept verbatim before older ones collapse into the memory summary. */
  memoryWindow: intEnv("PULSE_AI_MEMORY_WINDOW", 12),

  requestTimeoutMs: intEnv("PULSE_AI_REQUEST_TIMEOUT_MS", 90_000),
  dailyMessageLimit: intEnv("PULSE_AI_DAILY_MESSAGE_LIMIT", 60),
  perMinuteMessageLimit: intEnv("PULSE_AI_PER_MINUTE_MESSAGE_LIMIT", 8),
  maxPromptChars: intEnv("PULSE_AI_MAX_PROMPT_CHARS", 4000),
  maxIncomingMessages: intEnv("PULSE_AI_MAX_INCOMING_MESSAGES", 40),

  /** Anonymous/guest accounts get no agent access by default. */
  allowAnonymous: boolEnv("PULSE_AI_ALLOW_ANONYMOUS", false),
  /** App Check is enforced in production unless explicitly disabled. */
  requireAppCheck: boolEnv("PULSE_AI_REQUIRE_APP_CHECK", isProduction),

  webSearchProvider: (env("PULSE_AI_WEB_SEARCH_PROVIDER") ?? "none").toLowerCase(),
  webSearchApiKey: env("PULSE_AI_WEB_SEARCH_API_KEY"),
  webSearchTimeoutMs: intEnv("PULSE_AI_WEB_SEARCH_TIMEOUT_MS", 8000),

  /** Shared secret for the reindex endpoint when called by a cron job. */
  adminTaskKey: env("PULSE_AI_ADMIN_TASK_KEY"),

  /** Absolute base used to build citation links, e.g. https://app.example.com. */
  publicBaseUrl: env("PULSE_AI_PUBLIC_BASE_URL") ?? env("NEXT_PUBLIC_SITE_URL"),
} as const;

export const KNOWLEDGE_COLLECTION = "aiKnowledgeChunks";
export const RUNS_COLLECTION = "aiRuns";
export const CONVERSATIONS_SUBCOLLECTION = "aiConversations";
export const MESSAGES_SUBCOLLECTION = "messages";
export const USAGE_SUBCOLLECTION = "aiUsage";

import "server-only";

import { aiConfig } from "./config";
import { isAllowedOfficialUrl, publisherOf } from "./official-sources";

export type OfficialWebResult = {
  title: string;
  url: string;
  publisher: string;
  snippet: string;
  publishedAt: string | null;
};

export type OfficialWebSearch =
  | { available: false; reason: "not-configured" | "failed" }
  | { available: true; results: OfficialWebResult[] };

function clean(value: unknown, maxChars: number): string {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, maxChars)
    : "";
}

/** Biases the provider toward federal and state material before we filter. */
function scopeQuery(query: string): string {
  return `${query} (site:.gov OR site:naic.org)`.slice(0, 380);
}

async function searchTavily(query: string, signal: AbortSignal) {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${aiConfig.webSearchApiKey}`,
    },
    body: JSON.stringify({
      query: scopeQuery(query),
      max_results: 8,
      search_depth: "basic",
    }),
    signal,
  });
  if (!response.ok) throw new Error(`tavily ${response.status}`);
  const body = (await response.json()) as {
    results?: Array<{
      title?: string;
      url?: string;
      content?: string;
      published_date?: string;
    }>;
  };
  return (body.results ?? []).map((item) => ({
    title: clean(item.title, 160),
    url: clean(item.url, 500),
    snippet: clean(item.content, 500),
    publishedAt: clean(item.published_date, 40) || null,
  }));
}

async function searchBrave(query: string, signal: AbortSignal) {
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", scopeQuery(query));
  url.searchParams.set("count", "10");
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "x-subscription-token": aiConfig.webSearchApiKey ?? "",
    },
    signal,
  });
  if (!response.ok) throw new Error(`brave ${response.status}`);
  const body = (await response.json()) as {
    web?: {
      results?: Array<{
        title?: string;
        url?: string;
        description?: string;
        age?: string;
      }>;
    };
  };
  return (body.web?.results ?? []).map((item) => ({
    title: clean(item.title, 160),
    url: clean(item.url, 500),
    snippet: clean(item.description, 500),
    publishedAt: clean(item.age, 40) || null,
  }));
}

/**
 * Searches the open web but only ever returns results served by an official US
 * regulator or federal agency. The domain filter runs on our side, after the
 * provider responds, so a provider that ignores the site scoping still cannot
 * introduce a non-official citation.
 *
 * Returns `available: false` when no provider is configured; the agent is
 * instructed to say it is limited to the curated corpus rather than guess.
 */
export async function searchOfficialWeb(query: string): Promise<OfficialWebSearch> {
  const provider = aiConfig.webSearchProvider;
  if (provider === "none" || !aiConfig.webSearchApiKey) {
    return { available: false, reason: "not-configured" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), aiConfig.webSearchTimeoutMs);
  try {
    const raw =
      provider === "brave"
        ? await searchBrave(query, controller.signal)
        : await searchTavily(query, controller.signal);

    const seen = new Set<string>();
    const results: OfficialWebResult[] = [];
    for (const item of raw) {
      if (!item.url || !item.title) continue;
      if (!isAllowedOfficialUrl(item.url)) continue;
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      results.push({
        title: item.title,
        url: item.url,
        publisher: publisherOf(item.url) ?? "",
        snippet: item.snippet,
        publishedAt: item.publishedAt,
      });
      if (results.length >= 5) break;
    }
    return { available: true, results };
  } catch (error) {
    console.warn("[pulse-ai] official web search failed", error);
    return { available: false, reason: "failed" };
  } finally {
    clearTimeout(timeout);
  }
}

import "server-only";

import { tool } from "ai";
import { z } from "zod";
import type { AppLocale } from "@pulse/i18n";
import { aiConfig } from "./config";
import { adminDb } from "./firebase-admin";
import { CitationRegistry, formatChunkForModel } from "./citations";
import { searchKnowledge, type RetrievedChunk } from "./retrieval";
import { searchOfficialWeb } from "./official-web";
import { hashContent } from "./knowledge";
import type { PulseActivity, PulseSourceType } from "./types";
import type { PulseViewer } from "./auth";

export type ToolContext = {
  locale: AppLocale;
  viewer: PulseViewer;
  registry: CitationRegistry;
  /** Streams a progress row to the client. Must never throw. */
  emitActivity: (activity: PulseActivity) => void;
};

let activityCounter = 0;

function startActivity(
  ctx: ToolContext,
  kind: PulseActivity["kind"],
  query: string,
): (status: PulseActivity["status"], resultCount: number) => void {
  activityCounter += 1;
  const id = `act-${activityCounter}`;
  const trimmed = query.slice(0, 120);
  ctx.emitActivity({
    id,
    kind,
    status: "running",
    query: trimmed,
    resultCount: 0,
  });
  return (status, resultCount) =>
    ctx.emitActivity({ id, kind, status, query: trimmed, resultCount });
}

function present(ctx: ToolContext, chunks: RetrievedChunk[]) {
  return chunks.map((chunk) =>
    formatChunkForModel(
      ctx.registry.register(chunk),
      chunk,
      aiConfig.maxChunkChars,
    ),
  );
}

const NO_RESULTS = {
  results: [] as unknown[],
  note: "No indexed match. Call searchOfficialWeb next when the question needs current or regulatory detail; otherwise answer the question directly. Never tell the user the index was empty or that a search failed.",
};

export function buildPulseTools(ctx: ToolContext) {
  let embeddingSearches = 0;
  let webSearches = 0;
  const cappedKnowledgeSearch = (
    input: Parameters<typeof searchKnowledge>[0],
  ) => {
    if (embeddingSearches >= aiConfig.maxEmbeddingSearchesPerRun) {
      return Promise.resolve([] as RetrievedChunk[]);
    }
    embeddingSearches += 1;
    return searchKnowledge(input);
  };

  return {
    searchAcceptedAnswers: tool({
      description:
        "Search forum questions that already have an answer the asker accepted. Use this first for practical 'how do we handle X' questions — if the community already settled it, summarise briefly and cite the thread instead of writing a new answer.",
      inputSchema: z.object({
        query: z
          .string()
          .min(3)
          .max(300)
          .describe("The question in the user's own words, keywords included."),
        tags: z
          .array(z.string().max(32))
          .max(5)
          .optional()
          .describe("Optional forum tags to narrow the search, e.g. npn, comisiones."),
      }),
      execute: async ({ query, tags }) => {
        const finish = startActivity(ctx, "forum", query);
        try {
          const chunks = await cappedKnowledgeSearch({
            query,
            sourceTypes: ["accepted_forum_answer"],
            locale: ctx.locale,
            tags,
          });
          finish(chunks.length ? "done" : "empty", chunks.length);
          if (!chunks.length) return NO_RESULTS;
          return {
            results: present(ctx, chunks),
            note: "Community answers are practitioner experience, not regulatory authority. Link the thread rather than restating it in full.",
          };
        } catch (error) {
          finish("error", 0);
          console.error("[pulse-ai] searchAcceptedAnswers failed", error);
          return { results: [], note: "Forum search unavailable. Try searchOfficialWeb or answer directly without mentioning tools." };
        }
      },
    }),

    searchAcademy: tool({
      description:
        "Search published Every Benefits courses, lessons and learning paths. Use it to answer from the curriculum and to recommend what the user should study next.",
      inputSchema: z.object({
        query: z.string().min(3).max(300).describe("Topic or skill to look for."),
        kind: z
          .enum(["any", "course", "lesson", "path"])
          .optional()
          .describe("Narrow to a content type. Defaults to any."),
      }),
      execute: async ({ query, kind }) => {
        const finish = startActivity(ctx, "academy", query);
        const sourceTypes: PulseSourceType[] =
          !kind || kind === "any" ? ["course", "lesson", "path"] : [kind];
        try {
          const chunks = await cappedKnowledgeSearch({
            query,
            sourceTypes,
            locale: ctx.locale,
          });
          finish(chunks.length ? "done" : "empty", chunks.length);
          if (!chunks.length) return NO_RESULTS;
          return {
            results: present(ctx, chunks),
            note: "When a course or path fits, recommend it by name and cite it so the user can open it.",
          };
        } catch (error) {
          finish("error", 0);
          console.error("[pulse-ai] searchAcademy failed", error);
          return { results: [], note: "Academy search unavailable. Try searchOfficialWeb or answer directly without mentioning tools." };
        }
      },
    }),

    searchOfficialSources: tool({
      description:
        "Search the curated library of US regulator and federal-agency references (NAIC, CMS, Medicare, HealthCare.gov, DOL, IRS, SSA, FEMA, state departments of insurance). Use it for rules, deadlines, definitions and anything regulatory.",
      inputSchema: z.object({
        query: z.string().min(3).max(300).describe("Regulatory topic or term."),
      }),
      execute: async ({ query }) => {
        const finish = startActivity(ctx, "official", query);
        try {
          const chunks = await cappedKnowledgeSearch({
            query,
            sourceTypes: ["official"],
            locale: ctx.locale,
          });
          finish(chunks.length ? "done" : "empty", chunks.length);
          if (!chunks.length) return NO_RESULTS;
          return {
            results: present(ctx, chunks),
            note: "These summaries describe scope, not current figures. Send the user to the cited page for this year's dollar amounts and dates, and remind them rules vary by state.",
          };
        } catch (error) {
          finish("error", 0);
          console.error("[pulse-ai] searchOfficialSources failed", error);
          return { results: [], note: "Official corpus unavailable. Call searchOfficialWeb or answer directly without mentioning tools." };
        }
      },
    }),

    searchOfficialWeb: tool({
      description:
        "Look up current pages on official US government and regulator websites. Call this automatically when the curated library / academy / forum tools returned nothing useful, or when the user needs this year's figures, deadlines or a state-specific rule.",
      inputSchema: z.object({
        query: z
          .string()
          .min(3)
          .max(300)
          .describe("Specific lookup, including the state or year when relevant."),
      }),
      execute: async ({ query }) => {
        const finish = startActivity(ctx, "web", query);
        if (webSearches >= aiConfig.maxWebSearchesPerRun) {
          finish("empty", 0);
          return NO_RESULTS;
        }
        webSearches += 1;
        const search = await searchOfficialWeb(query);

        if (!search.available) {
          finish("empty", 0);
          return {
            results: [],
            note: "Official live lookup is unavailable. Answer the question directly from solid industry knowledge. Do not mention tools, indexes or missing sources.",
          };
        }

        finish(search.results.length ? "done" : "empty", search.results.length);
        if (!search.results.length) {
          return {
            results: [],
            note: "No official page matched. Answer the question directly. Do not invent a URL or mention the failed lookup.",
          };
        }

        const results = search.results.map((result) => {
          const source = ctx.registry.register({
            id: hashContent(result.url),
            sourceType: "official",
            sourceId: result.url,
            parentId: null,
            title: result.title,
            content: result.snippet,
            tags: [],
            language: ctx.locale,
            url: result.url,
            publisher: result.publisher,
            trustWeight: 1,
            score: 0,
          });
          return {
            ref: source.ref,
            title: result.title,
            publisher: result.publisher,
            publishedAt: result.publishedAt,
            snippet: result.snippet,
          };
        });

        return {
          results,
          note: "These are search snippets, not full pages. Only state what the snippet supports and point the user to the page for detail.",
        };
      },
    }),

    getMyLearningContext: tool({
      description:
        "Read the signed-in user's academy progress: which courses they are enrolled in and how far along they are. Use it before recommending what to study next.",
      inputSchema: z.object({}),
      execute: async () => {
        const finish = startActivity(ctx, "profile", "");
        try {
          const snapshot = await adminDb()
            .collection("users")
            .doc(ctx.viewer.uid)
            .collection("enrollments")
            .limit(20)
            .get();

          if (snapshot.empty) {
            finish("empty", 0);
            return {
              role: ctx.viewer.role,
              enrollments: [],
              note: "The user has not enrolled in anything yet.",
            };
          }

          const courseRefs = snapshot.docs.map((doc) =>
            adminDb()
              .collection("courses")
              .doc(String(doc.get("courseId") ?? doc.id)),
          );
          const courseSnapshots = await adminDb().getAll(...courseRefs);
          const courses = snapshot.docs.map((doc, index) => {
              const courseId = String(doc.get("courseId") ?? doc.id);
              const course = courseSnapshots[index];
              const completed = doc.get("completedLessonIds");
              const lessonCount = Number(course?.get("lessonCount") ?? 0);
              const completedCount = Array.isArray(completed) ? completed.length : 0;
              return {
                courseId,
                title: String(course?.get("title") ?? courseId),
                level: String(course?.get("level") ?? "basic"),
                completedLessons: completedCount,
                totalLessons: lessonCount,
                finished: Boolean(doc.get("completedAt")),
              };
            });

          finish("done", courses.length);
          return { role: ctx.viewer.role, enrollments: courses };
        } catch (error) {
          finish("error", 0);
          console.error("[pulse-ai] getMyLearningContext failed", error);
          return { role: ctx.viewer.role, enrollments: [] };
        }
      },
    }),
  };
}

export type PulseTools = ReturnType<typeof buildPulseTools>;

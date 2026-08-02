import "server-only";

import { FieldValue, type DocumentData } from "firebase-admin/firestore";
import { KNOWLEDGE_COLLECTION } from "./config";
import { adminDb } from "./firebase-admin";
import { embedDocuments } from "./embeddings";
import { inAppPath } from "./citations";
import {
  chunkDocId,
  detectLanguage,
  GROUP_BY_SOURCE_TYPE,
  hashContent,
  markdownToPlainText,
  splitIntoChunks,
  tokenize,
  trustWeightFor,
  type KnowledgeChunk,
  type KnowledgeGroup,
} from "./knowledge";
import { OFFICIAL_SOURCE_SEEDS, publisherOf } from "./official-sources";
import type { PulseSourceType } from "./types";

export type IngestReport = {
  scanned: number;
  written: number;
  unchanged: number;
  removed: number;
  failed: number;
  groups: KnowledgeGroup[];
  durationMs: number;
};

/** Firestore writes cap at 500 ops; embedding calls are batched more tightly. */
const WRITE_BATCH = 400;
const EMBED_BATCH = 32;
/** Safety valve so a runaway collection cannot spend the whole embedding budget. */
const MAX_DOCUMENTS_PER_SOURCE = 2000;

type DraftChunk = Omit<KnowledgeChunk, "id" | "contentHash"> & {
  contentHash: string;
};

function draft(input: {
  sourceType: PulseSourceType;
  sourceId: string;
  parentId: string | null;
  title: string;
  content: string;
  tags: string[];
  chunkIndex: number;
  url: string;
  publisher: string | null;
  trustWeight: number;
}): DraftChunk {
  const language = detectLanguage(`${input.title} ${input.content}`);
  return {
    group: GROUP_BY_SOURCE_TYPE[input.sourceType],
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    parentId: input.parentId,
    chunkIndex: input.chunkIndex,
    language,
    title: input.title.slice(0, 200),
    content: input.content,
    tags: input.tags.slice(0, 10),
    searchTokens: tokenize(`${input.title} ${input.content}`, 60),
    trustWeight: input.trustWeight,
    url: input.url,
    publisher: input.publisher,
    contentHash: hashContent(input.title, input.content, input.url),
  };
}

/**
 * Accepted forum answers: the question plus the answer the asker accepted.
 * Unanswered threads and non-accepted replies are deliberately skipped — the
 * agent should only surface knowledge the community endorsed.
 */
async function collectForumChunks(): Promise<DraftChunk[]> {
  const threads = await adminDb()
    .collection("threads")
    .limit(MAX_DOCUMENTS_PER_SOURCE)
    .get();

  const chunks: DraftChunk[] = [];
  for (const thread of threads.docs) {
    const acceptedReplyId = thread.get("acceptedReplyId");
    if (typeof acceptedReplyId !== "string" || !acceptedReplyId) continue;

    const reply = await thread.ref
      .collection("replies")
      .doc(acceptedReplyId)
      .get()
      .catch(() => null);
    const answer = reply?.get("body");
    if (typeof answer !== "string" || !answer.trim()) continue;

    const title = String(thread.get("title") ?? "").trim();
    const question = String(thread.get("body") ?? "").trim();
    const tags = Array.isArray(thread.get("tags"))
      ? (thread.get("tags") as unknown[]).map(String)
      : [];

    const body = [
      `Question: ${title}`,
      question,
      "",
      `Accepted answer (${String(reply?.get("authorRole") ?? "member")}): ${answer.trim()}`,
    ]
      .filter(Boolean)
      .join("\n");

    const trustWeight = trustWeightFor({
      sourceType: "accepted_forum_answer",
      score: Number(thread.get("score") ?? 0),
      authorRole: String(reply?.get("authorRole") ?? ""),
    });

    splitIntoChunks(body).forEach((content, index) => {
      chunks.push(
        draft({
          sourceType: "accepted_forum_answer",
          sourceId: thread.id,
          parentId: null,
          title: title || "Forum thread",
          content,
          tags,
          chunkIndex: index,
          url: inAppPath("accepted_forum_answer", thread.id, null),
          publisher: null,
          trustWeight,
        }),
      );
    });
  }
  return chunks;
}

/** Published courses, their reading lessons and the paths that bundle them. */
async function collectAcademyChunks(): Promise<DraftChunk[]> {
  const db = adminDb();
  const chunks: DraftChunk[] = [];

  const courses = await db
    .collection("courses")
    .where("status", "==", "published")
    .limit(MAX_DOCUMENTS_PER_SOURCE)
    .get();

  for (const course of courses.docs) {
    const title = String(course.get("title") ?? "").trim();
    const description = String(course.get("description") ?? "").trim();
    const level = String(course.get("level") ?? "basic");
    const teacher = String(course.get("teacherName") ?? "").trim();

    const overview = [
      `Course: ${title}`,
      `Level: ${level}${teacher ? ` · Instructor: ${teacher}` : ""}`,
      description,
    ]
      .filter(Boolean)
      .join("\n");

    splitIntoChunks(overview).forEach((content, index) => {
      chunks.push(
        draft({
          sourceType: "course",
          sourceId: course.id,
          parentId: null,
          title: title || "Course",
          content,
          tags: [level],
          chunkIndex: index,
          url: inAppPath("course", course.id, null),
          publisher: null,
          trustWeight: trustWeightFor({ sourceType: "course" }),
        }),
      );
    });

    const lessons = await course.ref.collection("lessons").limit(500).get();
    for (const lesson of lessons.docs) {
      const lessonTitle = String(lesson.get("title") ?? "").trim();
      const type = String(lesson.get("type") ?? "video");
      const markdown = lesson.get("bodyMarkdown");

      // Videos carry no transcript today, so only their title is indexable.
      const bodyText =
        typeof markdown === "string" && markdown.trim()
          ? markdownToPlainText(markdown)
          : "";
      const lessonBody = [
        `Lesson: ${lessonTitle} (${type})`,
        `From the course "${title}".`,
        bodyText,
      ]
        .filter(Boolean)
        .join("\n");
      if (lessonBody.length < 40) continue;

      splitIntoChunks(lessonBody).forEach((content, index) => {
        chunks.push(
          draft({
            sourceType: "lesson",
            sourceId: lesson.id,
            parentId: course.id,
            title: lessonTitle ? `${lessonTitle} — ${title}` : title,
            content,
            tags: [level, type],
            chunkIndex: index,
            url: inAppPath("lesson", lesson.id, course.id),
            publisher: null,
            trustWeight: trustWeightFor({ sourceType: "lesson" }),
          }),
        );
      });
    }
  }

  const paths = await db
    .collection("paths")
    .where("status", "==", "published")
    .limit(500)
    .get();

  for (const path of paths.docs) {
    const title = String(path.get("title") ?? "").trim();
    const description = String(path.get("description") ?? "").trim();
    const courseIds = Array.isArray(path.get("courseIds"))
      ? (path.get("courseIds") as unknown[]).map(String)
      : [];

    const body = [
      `Learning path: ${title}`,
      description,
      `Includes ${courseIds.length} course${courseIds.length === 1 ? "" : "s"}.`,
    ]
      .filter(Boolean)
      .join("\n");

    splitIntoChunks(body).forEach((content, index) => {
      chunks.push(
        draft({
          sourceType: "path",
          sourceId: path.id,
          parentId: null,
          title: title || "Learning path",
          content,
          tags: [String(path.get("level") ?? "basic")],
          chunkIndex: index,
          url: inAppPath("path", path.id, null),
          publisher: null,
          trustWeight: trustWeightFor({ sourceType: "path" }),
        }),
      );
    });
  }

  return chunks;
}

function collectOfficialChunks(): DraftChunk[] {
  return OFFICIAL_SOURCE_SEEDS.flatMap((seed) =>
    splitIntoChunks(`${seed.title}\n${seed.summary}`).map((content, index) =>
      draft({
        sourceType: "official",
        sourceId: seed.slug,
        parentId: null,
        title: seed.title,
        content,
        tags: seed.tags,
        chunkIndex: index,
        url: seed.url,
        publisher: publisherOf(seed.url),
        trustWeight: trustWeightFor({ sourceType: "official" }),
      }),
    ),
  );
}

async function commitInBatches(
  operations: ((batch: FirebaseFirestore.WriteBatch) => void)[],
) {
  for (let i = 0; i < operations.length; i += WRITE_BATCH) {
    const batch = adminDb().batch();
    operations.slice(i, i + WRITE_BATCH).forEach((apply) => apply(batch));
    await batch.commit();
  }
}

/**
 * Rebuilds the knowledge index for the requested groups.
 *
 * Idempotent: a chunk is only re-embedded when its content hash changed, and
 * chunks whose source disappeared (thread deleted, course unpublished, lesson
 * shortened) are removed in the same pass.
 */
export async function reindexKnowledge(
  groups: KnowledgeGroup[] = ["forum", "academy", "official"],
): Promise<IngestReport> {
  const startedAt = Date.now();
  const report: IngestReport = {
    scanned: 0,
    written: 0,
    unchanged: 0,
    removed: 0,
    failed: 0,
    groups,
    durationMs: 0,
  };

  const drafts: DraftChunk[] = [];
  if (groups.includes("forum")) drafts.push(...(await collectForumChunks()));
  if (groups.includes("academy")) drafts.push(...(await collectAcademyChunks()));
  if (groups.includes("official")) drafts.push(...collectOfficialChunks());
  report.scanned = drafts.length;

  const collection = adminDb().collection(KNOWLEDGE_COLLECTION);

  const existing = new Map<string, DocumentData>();
  for (const group of groups) {
    const snapshot = await collection.where("group", "==", group).get();
    snapshot.docs.forEach((doc) => existing.set(doc.id, doc.data()));
  }

  const keep = new Set<string>();
  const stale: DraftChunk[] = [];
  const unchanged: { id: string; draftChunk: DraftChunk }[] = [];

  for (const draftChunk of drafts) {
    const id = chunkDocId(
      draftChunk.sourceType,
      draftChunk.sourceId,
      draftChunk.chunkIndex,
    );
    keep.add(id);
    const current = existing.get(id);
    if (current && current.contentHash === draftChunk.contentHash && current.embedding) {
      unchanged.push({ id, draftChunk });
    } else {
      stale.push(draftChunk);
    }
  }
  report.unchanged = unchanged.length;

  for (let i = 0; i < stale.length; i += EMBED_BATCH) {
    const slice = stale.slice(i, i + EMBED_BATCH);
    let embeddings: number[][];
    try {
      embeddings = await embedDocuments(
        slice.map((chunk) => `${chunk.title}\n\n${chunk.content}`),
      );
    } catch (error) {
      console.error("[pulse-ai] embedding batch failed", error);
      report.failed += slice.length;
      continue;
    }

    await commitInBatches(
      slice.map((chunk, index) => (batch: FirebaseFirestore.WriteBatch) => {
        const id = chunkDocId(chunk.sourceType, chunk.sourceId, chunk.chunkIndex);
        batch.set(collection.doc(id), {
          ...chunk,
          embedding: FieldValue.vector(embeddings[index]),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }),
    );
    report.written += slice.length;
  }

  const removals = [...existing.keys()].filter((id) => !keep.has(id));
  await commitInBatches(
    removals.map((id) => (batch: FirebaseFirestore.WriteBatch) => {
      batch.delete(collection.doc(id));
    }),
  );
  report.removed = removals.length;
  report.durationMs = Date.now() - startedAt;
  return report;
}

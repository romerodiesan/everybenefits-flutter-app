"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  readVideoDuration,
  uploadLessonVideo,
} from "@/lib/firebase/courses";

export type UploadJobStatus =
  | "queued"
  | "uploading"
  | "done"
  | "error"
  | "cancelled";

export type UploadJob = {
  id: string;
  courseId: string;
  lessonId: string;
  fileName: string;
  status: UploadJobStatus;
  progress: number;
  error?: string;
  attempts?: number;
};

type EnqueueInput = {
  courseId: string;
  lessonId: string;
  file: File;
};

type UploadQueueContextValue = {
  jobs: UploadJob[];
  activeCount: number;
  enqueue: (input: EnqueueInput) => string;
  cancel: (jobId: string) => void;
  clearFinished: () => void;
  expandQueue: boolean;
  setExpandQueue: (open: boolean) => void;
};

const UploadQueueContext = createContext<UploadQueueContextValue | null>(null);

const MAX_CONCURRENCY = 2;
const MAX_ATTEMPTS = 3;

type InternalJob = UploadJob & {
  file: File | null;
  abort?: AbortController;
  attempts: number;
};

function newJobId() {
  return `upl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function LessonUploadQueueProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [expandQueue, setExpandQueue] = useState(false);
  const internals = useRef(new Map<string, InternalJob>());
  const running = useRef(new Set<string>());

  const publish = useCallback(() => {
    setJobs(
      [...internals.current.values()].map((job) => ({
        id: job.id,
        courseId: job.courseId,
        lessonId: job.lessonId,
        fileName: job.fileName,
        status: job.status,
        progress: job.progress,
        error: job.error,
        attempts: job.attempts,
      })),
    );
  }, []);

  const patch = useCallback(
    (id: string, patchJob: Partial<InternalJob>) => {
      const current = internals.current.get(id);
      if (!current) return;
      internals.current.set(id, { ...current, ...patchJob });
      publish();
    },
    [publish],
  );

  const releaseFile = useCallback((id: string) => {
    const current = internals.current.get(id);
    if (!current) return;
    internals.current.set(id, { ...current, file: null, abort: undefined });
  }, []);

  const pump = useCallback(() => {
    const queued = [...internals.current.values()].filter(
      (job) => job.status === "queued",
    );
    while (running.current.size < MAX_CONCURRENCY && queued.length > 0) {
      const next = queued.shift();
      if (!next) break;
      void runJob(next.id);
    }

    async function runJob(id: string) {
      const job = internals.current.get(id);
      if (!job || job.status !== "queued" || !job.file) return;
      if (running.current.has(id)) return;
      running.current.add(id);

      const abort = new AbortController();
      const attempt = job.attempts + 1;
      internals.current.set(id, {
        ...job,
        abort,
        attempts: attempt,
        status: "uploading",
        progress: 0,
        error: undefined,
      });
      publish();

      try {
        const file = job.file;
        const durationSeconds = await readVideoDuration(file);
        if (abort.signal.aborted) throw new DOMException("Aborted", "AbortError");
        await uploadLessonVideo({
          courseId: job.courseId,
          lessonId: job.lessonId,
          file,
          durationSeconds,
          signal: abort.signal,
          onProgress: (fraction) => patch(id, { progress: fraction }),
        });
        patch(id, { status: "done", progress: 1, file: null, abort: undefined });
      } catch (error) {
        const aborted =
          (error instanceof DOMException && error.name === "AbortError") ||
          (typeof error === "object" &&
            error !== null &&
            "code" in error &&
            String((error as { code: unknown }).code).includes("canceled"));
        if (aborted) {
          patch(id, {
            status: "cancelled",
            progress: 0,
            file: null,
            abort: undefined,
          });
        } else if (attempt < MAX_ATTEMPTS) {
          const backoffMs = 500 * 2 ** (attempt - 1);
          await sleep(backoffMs);
          const current = internals.current.get(id);
          if (current && current.status === "uploading" && current.file) {
            patch(id, { status: "queued", progress: 0, abort: undefined });
          } else {
            releaseFile(id);
          }
        } else {
          patch(id, {
            status: "error",
            error: error instanceof Error ? error.message : "Upload failed",
            file: null,
            abort: undefined,
          });
        }
      } finally {
        running.current.delete(id);
        publish();
        queueMicrotask(() => pump());
      }
    }
  }, [patch, publish, releaseFile]);

  const enqueue = useCallback(
    (input: EnqueueInput) => {
      for (const [id, job] of internals.current) {
        if (job.lessonId !== input.lessonId) continue;
        if (job.status === "queued") {
          internals.current.set(id, {
            ...job,
            status: "cancelled",
            progress: 0,
            file: null,
          });
        } else if (job.status === "uploading") {
          job.abort?.abort();
        }
      }

      const id = newJobId();
      const job: InternalJob = {
        id,
        courseId: input.courseId,
        lessonId: input.lessonId,
        fileName: input.file.name,
        file: input.file,
        status: "queued",
        progress: 0,
        attempts: 0,
      };
      internals.current.set(id, job);
      publish();
      setExpandQueue(true);
      queueMicrotask(() => pump());
      return id;
    },
    [pump, publish],
  );

  const cancel = useCallback(
    (jobId: string) => {
      const job = internals.current.get(jobId);
      if (!job) return;
      if (job.status === "queued") {
        patch(jobId, { status: "cancelled", file: null });
        return;
      }
      if (job.status === "uploading") {
        job.abort?.abort();
      }
    },
    [patch],
  );

  const clearFinished = useCallback(() => {
    for (const [id, job] of internals.current) {
      if (
        job.status === "done" ||
        job.status === "error" ||
        job.status === "cancelled"
      ) {
        internals.current.delete(id);
      }
    }
    publish();
  }, [publish]);

  const activeCount = useMemo(
    () =>
      jobs.filter((j) => j.status === "queued" || j.status === "uploading")
        .length,
    [jobs],
  );

  const value = useMemo(
    () => ({
      jobs,
      activeCount,
      enqueue,
      cancel,
      clearFinished,
      expandQueue,
      setExpandQueue,
    }),
    [jobs, activeCount, enqueue, cancel, clearFinished, expandQueue],
  );

  return (
    <UploadQueueContext.Provider value={value}>
      {children}
    </UploadQueueContext.Provider>
  );
}

export function useLessonUploadQueue() {
  const ctx = useContext(UploadQueueContext);
  if (!ctx) {
    throw new Error(
      "useLessonUploadQueue must be used within LessonUploadQueueProvider",
    );
  }
  return ctx;
}

/** Optional hook when UI may render outside the provider (falls back to null). */
export function useLessonUploadQueueOptional() {
  return useContext(UploadQueueContext);
}

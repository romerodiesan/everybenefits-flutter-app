"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/providers/auth-provider";
import { watchEnrollments } from "@/lib/firebase/courses";
import { useVisibleSubscription } from "@/lib/hooks/use-visible-subscription";
import type { Enrollment } from "@/lib/types";

type EnrollmentsContextValue = {
  enrollments: Enrollment[];
  byCourseId: Record<string, Enrollment>;
  learningCount: number;
  ready: boolean;
};

const EnrollmentsContext = createContext<EnrollmentsContextValue | null>(null);

/**
 * Single shared enrollments listener for the authenticated shell + academy
 * pages. Pauses while the tab is hidden.
 */
export function EnrollmentsProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const uid =
    profile && !profile.isAnonymous
      ? profile.uid
      : null;

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [ready, setReady] = useState(false);

  useVisibleSubscription(
    Boolean(uid),
    () => {
      if (!uid) return () => undefined;
      return watchEnrollments(
        uid,
        (list) => {
          setEnrollments(list);
          setReady(true);
        },
        () => {
          setEnrollments([]);
          setReady(true);
        },
      );
    },
    [uid],
  );

  const value = useMemo<EnrollmentsContextValue>(() => {
    const byCourseId: Record<string, Enrollment> = {};
    for (const entry of enrollments) byCourseId[entry.courseId] = entry;
    return {
      enrollments,
      byCourseId,
      learningCount: enrollments.filter((e) => !e.completedAt).length,
      ready,
    };
  }, [enrollments, ready]);

  return (
    <EnrollmentsContext.Provider value={value}>
      {children}
    </EnrollmentsContext.Provider>
  );
}

export function useEnrollments() {
  const ctx = useContext(EnrollmentsContext);
  if (!ctx) {
    throw new Error("useEnrollments must be used within EnrollmentsProvider");
  }
  return ctx;
}

/** Optional access when a component may render outside the provider. */
export function useEnrollmentsOptional() {
  return useContext(EnrollmentsContext);
}

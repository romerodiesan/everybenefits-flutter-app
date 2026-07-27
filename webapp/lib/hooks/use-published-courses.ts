"use client";

import { useState } from "react";
import { watchPublishedCourses } from "@/lib/firebase/courses";
import { useVisibleSubscription } from "@/lib/hooks/use-visible-subscription";
import type { Course } from "@/lib/types";

/**
 * Shared published-course catalog listener with tab-visibility pause.
 * Multiple mounts still each subscribe today; prefer one caller per view tree.
 * Visibility pause at least stops background reads when the tab is hidden.
 */
export function usePublishedCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useVisibleSubscription(true, () => {
    return watchPublishedCourses(
      (next) => {
        setCourses(next);
        setLoading(false);
        setFailed(false);
      },
      () => {
        setLoading(false);
        setFailed(true);
      },
    );
  }, []);

  return { courses, loading, failed };
}

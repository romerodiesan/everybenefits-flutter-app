"use client";

import {
  LANDING_THREADS,
  LANDING_TOPIC_COUNTS,
} from "@/lib/landing/fixtures";
import { ForumsFeedChrome } from "@/components/landing/screens/feed-preview";

export function ForumsScreen() {
  return (
    <ForumsFeedChrome
      threads={LANDING_THREADS.slice(0, 2)}
      topicCounts={LANDING_TOPIC_COUNTS}
      compact
    />
  );
}

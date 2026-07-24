"use client";

import { use, useSyncExternalStore } from "react";
import { ForumsHome, ThreadDetail } from "@/components/forums/forums-home";

function subscribeDesktop(onStoreChange: () => void) {
  const mq = window.matchMedia("(min-width: 1024px)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getDesktopSnapshot() {
  return window.matchMedia("(min-width: 1024px)").matches;
}

function getServerSnapshot() {
  return true;
}

export default function ThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = use(params);
  const isDesktop = useSyncExternalStore(
    subscribeDesktop,
    getDesktopSnapshot,
    getServerSnapshot,
  );

  if (isDesktop) {
    return <ForumsHome selectedId={threadId} />;
  }

  return <ThreadDetail threadId={threadId} />;
}

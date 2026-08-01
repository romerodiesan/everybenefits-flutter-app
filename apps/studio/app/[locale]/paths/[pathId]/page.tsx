"use client";

import { use } from "react";
import { PathWorkspace } from "@/components/studio/path-workspace";

export default function PathWorkspacePage({
  params,
}: {
  params: Promise<{ pathId: string }>;
}) {
  const { pathId } = use(params);
  return <PathWorkspace pathId={pathId} />;
}

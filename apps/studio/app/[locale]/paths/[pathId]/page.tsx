"use client";

import { use } from "react";
import { StudioShell } from "@/components/chrome/studio-shell";
import { PathWorkspace } from "@/components/studio/path-workspace";

export default function PathWorkspacePage({
  params,
}: {
  params: Promise<{ pathId: string }>;
}) {
  const { pathId } = use(params);
  return (
    <StudioShell>
      <PathWorkspace pathId={pathId} />
    </StudioShell>
  );
}

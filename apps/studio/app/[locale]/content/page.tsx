"use client";

import { Suspense } from "react";
import { StudioShell } from "@/components/chrome/studio-shell";
import { LibraryHome } from "@/components/studio/library-home";

export default function ContentPage() {
  return (
    <StudioShell>
      <Suspense fallback={<p className="p-6 text-sm text-muted">Loading…</p>}>
        <LibraryHome />
      </Suspense>
    </StudioShell>
  );
}

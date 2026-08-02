"use client";

import { StudioShell } from "@/components/chrome/studio-shell";
import { LibraryHome } from "@/components/studio/library-home";

export default function StudioHomePage() {
  return (
    <StudioShell>
      <LibraryHome />
    </StudioShell>
  );
}

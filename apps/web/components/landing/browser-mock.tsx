"use client";

import type { ReactNode } from "react";

export function BrowserMock({
  children,
  className = "",
  urlLabel = "pulse.everybenefits.com",
}: {
  children: ReactNode;
  className?: string;
  urlLabel?: string;
}) {
  return (
    <div aria-hidden className={`browser-frame ${className}`}>
      <div className="flex items-center gap-2 border-b border-glass-border px-3 py-2.5">
        <span className="flex gap-1.5">
          <i className="block h-2.5 w-2.5 rounded-full bg-ink/20" />
          <i className="block h-2.5 w-2.5 rounded-full bg-ink/20" />
          <i className="block h-2.5 w-2.5 rounded-full bg-ink/20" />
        </span>
        <span className="ml-2 flex h-7 flex-1 items-center rounded-lg border border-glass-border bg-mesh px-3 text-[10px] text-muted">
          {urlLabel}
        </span>
      </div>
      <div className="browser-screen mesh-bg relative overflow-hidden pointer-events-none">
        {children}
      </div>
    </div>
  );
}

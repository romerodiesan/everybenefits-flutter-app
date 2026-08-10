import type { ReactNode } from "react";
import { Button } from "@/components/ui/primitives";

export function Drawer({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close drawer"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-glass-border bg-sheet shadow-xl">
        <header className="flex items-start justify-between gap-3 border-b border-glass-border px-5 py-4">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 text-sm text-muted">{subtitle}</p>
            ) : null}
          </div>
          <Button variant="ghost" className="h-9 px-3 text-xs" onClick={onClose}>
            Close
          </Button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <footer className="border-t border-glass-border px-5 py-4">
            {footer}
          </footer>
        ) : null}
      </aside>
    </div>
  );
}

"use client";

import { useEffect, useId, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/primitives";
import type {
  AlertKind,
  ConfirmState,
  ToastItem,
} from "@/lib/providers/alert-provider";

const KIND_STYLES: Record<AlertKind, { bar: string; icon: string }> = {
  success: {
    bar: "bg-ok",
    icon: "text-ok",
  },
  error: {
    bar: "bg-danger",
    icon: "text-danger",
  },
  warning: {
    bar: "bg-warn",
    icon: "text-warn",
  },
  info: {
    bar: "bg-brand",
    icon: "text-brand",
  },
};

function KindIcon({ kind }: { kind: AlertKind }) {
  const className = `mt-0.5 h-4 w-4 shrink-0 ${KIND_STYLES[kind].icon}`;
  if (kind === "success") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
        <path
          d="M20 6 9 17l-5-5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === "error") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
        <path
          d="M18 6 6 18M6 6l12 12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (kind === "warning") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
        <path
          d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 8h.01M11 12h1v4h1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const t = useTranslations();
  const styles = KIND_STYLES[toast.kind];

  return (
    <motion.div
      layout
      role="status"
      aria-live={toast.kind === "error" ? "assertive" : "polite"}
      initial={{ opacity: 0, y: -12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      className="pointer-events-auto relative overflow-hidden rounded-xl border border-glass-border bg-sheet shadow-lg"
    >
      <div className={`absolute inset-y-0 left-0 w-1 ${styles.bar}`} />
      <div className="flex items-start gap-3 py-3 pr-3 pl-4">
        <KindIcon kind={toast.kind} />
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-semibold text-ink">{toast.title}</p>
          {toast.description ? (
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              {toast.description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          aria-label={t("alertDismiss")}
          onClick={() => onDismiss(toast.id)}
          className="rounded-lg p-1.5 text-muted transition hover:bg-ink/[0.05] hover:text-ink dark:hover:bg-white/[0.06]"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-3.5 w-3.5">
            <path
              d="M18 6 6 18M6 6l12 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}

function ConfirmDialog({
  confirm,
  onConfirm,
  onCancel,
}: {
  confirm: ConfirmState;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations();
  const titleId = useId();
  const descId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onCancel]);

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button
        type="button"
        aria-label={t("alertCancel")}
        className="absolute inset-0 bg-black/45"
        onClick={onCancel}
      />
      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={confirm.description ? descId : undefined}
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 420, damping: 32 }}
        className="relative w-full max-w-md rounded-2xl border border-glass-border bg-sheet p-5 shadow-xl"
      >
        <h2 id={titleId} className="font-display text-xl font-bold tracking-tight">
          {confirm.title}
        </h2>
        {confirm.description ? (
          <p id={descId} className="mt-2 text-sm leading-relaxed text-muted">
            {confirm.description}
          </p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            {confirm.cancelLabel ?? t("alertCancel")}
          </Button>
          <Button
            ref={confirmRef}
            variant={confirm.danger ? "danger" : "primary"}
            onClick={onConfirm}
          >
            {confirm.confirmLabel ?? t("alertConfirm")}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function AlertHost({
  toasts,
  onDismiss,
  confirm,
  onConfirm,
  onCancel,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  confirm: ConfirmState | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-end gap-2 p-4 sm:p-5"
        aria-live="polite"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <div key={toast.id} className="w-full max-w-sm">
              <ToastCard toast={toast} onDismiss={onDismiss} />
            </div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {confirm ? (
          <ConfirmDialog
            key={confirm.id}
            confirm={confirm}
            onConfirm={onConfirm}
            onCancel={onCancel}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}

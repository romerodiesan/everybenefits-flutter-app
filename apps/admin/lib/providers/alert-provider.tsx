"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertHost } from "@/components/ui/alerts";

export type AlertKind = "success" | "error" | "info" | "warning";

export type ToastInput = {
  kind?: AlertKind;
  title: string;
  description?: string;
  durationMs?: number;
};

export type ToastItem = {
  id: string;
  kind: AlertKind;
  title: string;
  description?: string;
  durationMs: number;
};

export type ConfirmInput = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

export type ConfirmState = ConfirmInput & {
  id: string;
};

type ConfirmRequest = ConfirmState & {
  resolve: (value: boolean) => void;
};

type AlertsApi = {
  show: (input: ToastInput) => string;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
  dismiss: (id: string) => void;
  confirm: (input: ConfirmInput) => Promise<boolean>;
};

const AlertContext = createContext<AlertsApi | null>(null);

const DEFAULT_DURATION: Record<AlertKind, number> = {
  success: 4000,
  info: 4500,
  warning: 5500,
  error: 7000,
};

function nextId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function AlertProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const confirmResolver = useRef<((value: boolean) => void) | null>(null);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (input: ToastInput) => {
      const kind = input.kind ?? "info";
      const id = nextId("toast");
      const durationMs = input.durationMs ?? DEFAULT_DURATION[kind];
      const toast: ToastItem = {
        id,
        kind,
        title: input.title,
        description: input.description,
        durationMs,
      };

      setToasts((prev) => [...prev.slice(-4), toast]);

      if (durationMs > 0) {
        const timer = setTimeout(() => dismiss(id), durationMs);
        timers.current.set(id, timer);
      }

      return id;
    },
    [dismiss],
  );

  const resolveConfirm = useCallback((value: boolean) => {
    confirmResolver.current?.(value);
    confirmResolver.current = null;
    setConfirmState(null);
  }, []);

  const confirm = useCallback((input: ConfirmInput) => {
    return new Promise<boolean>((resolve) => {
      if (confirmResolver.current) {
        confirmResolver.current(false);
      }
      const request: ConfirmRequest = {
        id: nextId("confirm"),
        ...input,
        resolve,
      };
      confirmResolver.current = request.resolve;
      setConfirmState({
        id: request.id,
        title: request.title,
        description: request.description,
        confirmLabel: request.confirmLabel,
        cancelLabel: request.cancelLabel,
        danger: request.danger,
      });
    });
  }, []);

  const api = useMemo<AlertsApi>(
    () => ({
      show,
      dismiss,
      confirm,
      success: (title, description) => show({ kind: "success", title, description }),
      error: (title, description) => show({ kind: "error", title, description }),
      info: (title, description) => show({ kind: "info", title, description }),
      warning: (title, description) => show({ kind: "warning", title, description }),
    }),
    [show, dismiss, confirm],
  );

  return (
    <AlertContext.Provider value={api}>
      {children}
      <AlertHost
        toasts={toasts}
        onDismiss={dismiss}
        confirm={confirmState}
        onConfirm={() => resolveConfirm(true)}
        onCancel={() => resolveConfirm(false)}
      />
    </AlertContext.Provider>
  );
}

export function useAlerts() {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    throw new Error("useAlerts must be used within AlertProvider");
  }
  return ctx;
}

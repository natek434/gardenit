"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import classNames from "classnames";

export type ToastVariant = "success" | "error" | "warning" | "info";

export type ToastDescriptor = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration: number;
};

export type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastContextValue = {
  pushToast: (toast: ToastInput) => string;
  dismissToast: (id: string) => void;
};

const DEFAULT_DURATION = 10_000;

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastDescriptor[]>([]);
  const timers = useRef<Map<string, number>>(new Map());

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const pushToast = useCallback(
    ({ title, description, variant = "info", durationMs }: ToastInput) => {
      const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
      const descriptor: ToastDescriptor = {
        id,
        title,
        description,
        variant,
        duration: durationMs ?? DEFAULT_DURATION,
      };
      setToasts((current) => [...current, descriptor]);
      if ((durationMs ?? DEFAULT_DURATION) !== Infinity) {
        const timeout = window.setTimeout(() => {
          dismissToast(id);
        }, durationMs ?? DEFAULT_DURATION);
        timers.current.set(id, timeout);
      }
      return id;
    },
    [dismissToast],
  );

  useEffect(() => {
    const timerMap = timers.current;
    return () => {
      timerMap.forEach((timeout) => window.clearTimeout(timeout));
      timerMap.clear();
    };
  }, []);

  const contextValue = useMemo(() => ({ pushToast, dismissToast }), [dismissToast, pushToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

type ToastViewportProps = {
  toasts: ToastDescriptor[];
  onDismiss: (id: string) => void;
};

function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  return (
    <div className="pointer-events-none fixed top-4 right-4 z-50 flex w-80 max-w-full flex-col gap-3">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

type ToastProps = {
  toast: ToastDescriptor;
  onDismiss: (id: string) => void;
};

function Toast({ toast, onDismiss }: ToastProps) {
  const variantClasses: Record<ToastVariant, string> = {
    success: "border-emerald-500/70 bg-emerald-50 text-emerald-800",
    error: "border-red-500/70 bg-red-50 text-red-800",
    warning: "border-amber-500/70 bg-amber-50 text-amber-800",
    info: "border-slate-500/50 bg-white text-slate-700",
  };

  const indicatorClasses: Record<ToastVariant, string> = {
    success: "bg-emerald-500",
    error: "bg-red-500",
    warning: "bg-amber-500",
    info: "bg-slate-400",
  };

  return (
    <div
      role="status"
      className={classNames(
        "pointer-events-auto flex gap-3 rounded-lg border px-3 py-3 shadow-lg ring-1 ring-black/5",
        variantClasses[toast.variant],
      )}
    >
      <span className={classNames("mt-1 h-2 w-2 flex-shrink-0 rounded-full", indicatorClasses[toast.variant])} />
      <div className="flex-1 space-y-1">
        <p className="text-sm font-semibold leading-tight">{toast.title}</p>
        {toast.description ? <p className="text-xs leading-snug opacity-80">{toast.description}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="text-xs font-semibold uppercase tracking-wide opacity-60 transition hover:opacity-100"
      >
        Close
      </button>
    </div>
  );
}

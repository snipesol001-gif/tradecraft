"use client";

// TradeCraft's toast system. Provider mounts once, any component calls
// useToast().toast({...}). Stacked top-right (top-center on mobile),
// each with a title, optional description, an animated progress bar
// counting down its life, click-to-open support, and manual dismiss.
// Auto-dismisses, but (per product spec) dismissal here never implies
// the underlying notification was read: that is the notification
// center's job in STEP 27.

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastVariant = "info" | "success" | "error";

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
  onClick?: () => void;
};

type ToastItem = ToastInput & { id: number; variant: ToastVariant; durationMs: number };

const ToastContext = createContext<{ toast: (t: ToastInput) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const icons: Record<ToastVariant, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  error: AlertTriangle,
};

const iconColors: Record<ToastVariant, string> = {
  info: "text-text-muted",
  success: "text-success",
  error: "text-danger",
};

const barColors: Record<ToastVariant, string> = {
  info: "bg-text-faint",
  success: "bg-success",
  error: "bg-danger",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = idRef.current++;
      const item: ToastItem = {
        variant: "info",
        durationMs: 5000,
        ...input,
        id,
      };
      // Keep at most 4 on screen: oldest quietly removed.
      setToasts((list) => [...list.slice(-3), item]);
      window.setTimeout(() => dismiss(id), item.durationMs);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-3 top-3 z-[100] flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:w-96">
        {toasts.map((t) => {
          const Icon = icons[t.variant];
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto overflow-hidden rounded-xl border border-border bg-surface-raised shadow-raised animate-[toast-in_200ms_ease-out]"
            >
              <div className="flex items-start gap-3 p-4">
                <Icon size={18} className={cn("mt-0.5 shrink-0", iconColors[t.variant])} />
                <button
                  type="button"
                  onClick={() => {
                    t.onClick?.();
                    dismiss(t.id);
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block text-sm font-semibold text-text-primary">{t.title}</span>
                  {t.description && (
                    <span className="mt-0.5 block text-xs leading-relaxed text-text-muted">
                      {t.description}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss notification"
                  className="shrink-0 rounded-md p-1 text-text-faint transition-colors hover:bg-sunken hover:text-text-primary"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="h-0.5 bg-sunken">
                <div
                  className={cn("h-full origin-left", barColors[t.variant])}
                  style={{ animation: `toast-progress ${t.durationMs}ms linear forwards` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export type ToastTone = "success" | "danger" | "warn" | "info";
export type Toast = { tone: ToastTone; title: string; body?: string };

type ToastCtx = {
  toast: (t: Toast) => void;
  success: (title: string, body?: string) => void;
  danger: (title: string, body?: string) => void;
  warn: (title: string, body?: string) => void;
  info: (title: string, body?: string) => void;
};

const Ctx = createContext<ToastCtx>({
  toast: () => {},
  success: () => {},
  danger: () => {},
  warn: () => {},
  info: () => {},
});
export const useToast = () => useContext(Ctx);

type Item = Toast & { id: number; leaving: boolean };

const DOT: Record<ToastTone, string> = {
  success: "bg-success",
  danger: "bg-danger",
  warn: "bg-warn",
  info: "bg-foreground",
};
const LIFE: Record<ToastTone, number> = {
  success: 4200, danger: 6500, warn: 5500, info: 4200,
};
const EXIT_MS = 180;

/** Token-styled toasts — bottom-right stack, slide-up in, fade out,
 *  auto-dismiss. aria-live polite so screen readers announce them;
 *  decorative status toasts never steal focus. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, leaving: true } : i)));
    setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), EXIT_MS);
  }, []);

  const toast = useCallback((t: Toast) => {
    const id = nextId.current++;
    setItems((prev) => [...prev.slice(-3), { ...t, id, leaving: false }]); // cap 4
    setTimeout(() => dismiss(id), LIFE[t.tone]);
  }, [dismiss]);

  // Stable identity — consumers put this in dep arrays; a fresh object each
  // render would retrigger their effects.
  const api = useMemo<ToastCtx>(() => ({
    toast,
    success: (title, body) => toast({ tone: "success", title, body }),
    danger: (title, body) => toast({ tone: "danger", title, body }),
    warn: (title, body) => toast({ tone: "warn", title, body }),
    info: (title, body) => toast({ tone: "info", title, body }),
  }), [toast]);

  return (
    <Ctx.Provider value={api}>
      {children}
      {/* Portal only once a toast exists — toasts can only appear after a
          client interaction, so SSR and hydration both render nothing here
          and there's no server/client branch mismatch. */}
      {items.length > 0 &&
        typeof document !== "undefined" &&
        createPortal(
          <ol
            aria-live="polite"
            className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
          >
            {items.map((t) => (
              <li
                key={t.id}
                role="status"
                className={`pointer-events-auto flex items-start gap-2.5 rounded-md border border-foreground/40 bg-card px-3.5 py-3 text-sm text-foreground ${
                  t.leaving ? "rise-out" : "rise-in"
                }`}
              >
                <span aria-hidden className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${DOT[t.tone]}`} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-snug">{t.title}</p>
                  {t.body && (
                    <p className="mt-0.5 break-words text-xs leading-snug text-muted-foreground">
                      {t.body}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss"
                  className="inline-flex min-h-6 min-w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors [@media(hover:hover)]:hover:bg-muted"
                >
                  <X size={13} aria-hidden />
                </button>
              </li>
            ))}
          </ol>,
          document.body,
        )}
    </Ctx.Provider>
  );
}

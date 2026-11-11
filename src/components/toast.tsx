"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Toast = { id: number; tone: "positive" | "danger"; headline: string; message?: string };
const Ctx = createContext<(t: Omit<Toast, "id">) => void>(() => {});

export function useToast() {
  return useContext(Ctx);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((s) => [...s, { ...t, id }]);
    setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), t.tone === "danger" ? 7000 : 3500);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-20 z-[60] flex w-[360px] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "animate-toast-in pointer-events-auto flex gap-3 rounded-[6px] p-4 text-white shadow-xl",
              t.tone === "positive" ? "bg-brand-700" : "bg-[#5c0d10]",
            )}
          >
            {t.tone === "positive" ? <CheckCircle2 className="size-5 shrink-0" /> : <AlertTriangle className="size-5 shrink-0" />}
            <div className="flex-1">
              <div className="font-bold">{t.headline}</div>
              {t.message && <div className="mt-0.5 text-sm opacity-90">{t.message}</div>}
            </div>
            <button onClick={() => setToasts((s) => s.filter((x) => x.id !== t.id))} aria-label="Dismiss">
              <X className="size-4 opacity-80" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

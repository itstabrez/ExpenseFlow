"use client";

import { createContext, useContext, useMemo, useState } from "react";

type Toast = { id: string; message: string; tone: "success" | "error" | "info" };
type ToastContextValue = { push: (message: string, tone?: Toast["tone"]) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const value = useMemo<ToastContextValue>(
    () => ({
      push: (message, tone = "info") => {
        const id = crypto.randomUUID();
        setToasts((items) => [...items, { id, message, tone }]);
        window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 3500);
      }
    }),
    []
  );
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-md border px-4 py-3 text-sm shadow-panel ${
              toast.tone === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : toast.tone === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-white text-ink"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return context;
};

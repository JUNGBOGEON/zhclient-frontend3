"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type ToastTone = "success" | "error" | "info" | "warning";

type ToastEntry = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  show: (message: string, tone?: ToastTone) => void;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<ToastEntry[]>([]);

  const dismiss = useCallback((id: number) => {
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const show = useCallback((message: string, tone: ToastTone = "info") => {
    const id =
      typeof performance !== "undefined"
        ? Math.floor(performance.now() * 1000)
        : Date.now();
    setEntries((current) => [...current, { id, message, tone }]);
  }, []);

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-0 bottom-10 z-[200] flex flex-col items-center justify-end gap-3 px-4"
      >
        {entries.map((entry) => (
          <ToastCard
            key={entry.id}
            entry={entry}
            onClose={() => dismiss(entry.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({
  entry,
  onClose,
}: {
  entry: ToastEntry;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4200);
    return () => clearTimeout(timer);
  }, [onClose]);

  const isSuccess = entry.tone === "success";
  const isError = entry.tone === "error";
  
  const bgClass = isSuccess ? "bg-[#1ed760]" : isError ? "bg-[#f3727f]" : "bg-[#2a2a2a]";
  const textClass = isSuccess || isError ? "text-black" : "text-white";

  return (
    <div
      role="status"
      style={{
        animation: "zh-toast-in 300ms cubic-bezier(0.16, 1, 0.3, 1)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
      }}
      className={`pointer-events-auto flex items-center justify-between gap-4 rounded-full px-6 py-3 ${bgClass} ${textClass}`}
    >
      <p className="text-[14px] font-bold tracking-wide">
        {entry.message}
      </p>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 p-1 text-[16px] font-bold leading-none opacity-60 transition-opacity hover:opacity-100"
        aria-label="알림 닫기"
      >
        ×
      </button>
    </div>
  );
}

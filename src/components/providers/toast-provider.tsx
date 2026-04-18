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

const TONE_BORDER: Record<ToastTone, string> = {
  success: "border-[#1ed760]",
  error: "border-[#f3727f]",
  info: "border-[#539df5]",
  warning: "border-[#ffa42b]",
};

const TONE_DOT: Record<ToastTone, string> = {
  success: "bg-[#1ed760]",
  error: "bg-[#f3727f]",
  info: "bg-[#539df5]",
  warning: "bg-[#ffa42b]",
};

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
        className="pointer-events-none fixed inset-x-0 bottom-6 z-[200] flex flex-col items-center gap-3 px-4 sm:bottom-8 sm:right-8 sm:left-auto sm:items-end"
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

  return (
    <div
      role="status"
      style={{
        animation: "zh-toast-in 200ms ease-out",
        boxShadow: "var(--shadow-heavy)",
      }}
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-[#181818] px-4 py-3 ${TONE_BORDER[entry.tone]}`}
    >
      <span
        className={`mt-[6px] h-2 w-2 shrink-0 rounded-full ${TONE_DOT[entry.tone]}`}
      />
      <p className="flex-1 text-[14px] font-medium leading-snug text-white">
        {entry.message}
      </p>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 rounded-full p-1 text-[14px] leading-none text-[#b3b3b3] transition-colors hover:text-white"
        aria-label="알림 닫기"
      >
        ×
      </button>
    </div>
  );
}

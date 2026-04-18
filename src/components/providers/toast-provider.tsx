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
    // 여러개가 쌓이더라도 관리할 수 있게 유지
    setEntries((current) => [...current, { id, message, tone }]);
  }, []);

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-0 bottom-10 z-[200] flex flex-col items-center justify-end px-4"
      >
        <div className="relative flex w-full max-w-sm flex-col items-center justify-end h-[48px]">
          {entries.map((entry, idx) => {
            const offset = entries.length - 1 - idx;
            return (
              <ToastCard
                key={entry.id}
                entry={entry}
                offset={offset}
                onClose={() => dismiss(entry.id)}
              />
            );
          })}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({
  entry,
  offset,
  onClose,
}: {
  entry: ToastEntry;
  offset: number;
  onClose: () => void;
}) {
  const [isExiting, setIsExiting] = useState(false);

  // 3초 후 자동으로 퇴장 애니메이션 시작
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // 퇴장 상태일 때, 애니메이션 종료 후 실제 삭제 (onClose)
  useEffect(() => {
    if (isExiting) {
      const exitTimer = setTimeout(onClose, 300); // 퇴장 애니메이션 길이와 일치
      return () => clearTimeout(exitTimer);
    }
  }, [isExiting, onClose]);

  const isSuccess = entry.tone === "success";
  const isError = entry.tone === "error";
  
  const bgClass = isSuccess ? "bg-[#1ed760]" : isError ? "bg-[#f3727f]" : "bg-[#2a2a2a]";
  const textClass = isSuccess || isError ? "text-black" : "text-white";

  // 최대 3개까지만 보여주고 나머지는 숨김 처리
  const isVisible = offset < 3;

  return (
    <div
      role="status"
      style={{
        animation: isExiting 
          ? "zh-toast-out 300ms cubic-bezier(0.16, 1, 0.3, 1) forwards"
          : "zh-toast-in 300ms cubic-bezier(0.16, 1, 0.3, 1)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        transform: `translateY(-${offset * 14}px) scale(${1 - offset * 0.05})`,
        zIndex: 200 - offset,
        opacity: isVisible && !isExiting ? 1 - offset * 0.15 : 0,
        pointerEvents: offset === 0 ? "auto" : "none",
        position: "absolute",
        transition: "transform 300ms cubic-bezier(0.16, 1, 0.3, 1), opacity 300ms cubic-bezier(0.16, 1, 0.3, 1)",
        bottom: 0,
      }}
      className={`flex w-full items-center justify-between gap-4 rounded-full px-6 py-3.5 ${bgClass} ${textClass}`}
    >
      <p className="text-[14px] font-bold tracking-wide">
        {entry.message}
      </p>
      <button
        type="button"
        onClick={() => setIsExiting(true)}
        className="shrink-0 p-1 text-[16px] font-bold leading-none opacity-60 transition-opacity hover:opacity-100"
        aria-label="알림 닫기"
      >
        ×
      </button>
    </div>
  );
}

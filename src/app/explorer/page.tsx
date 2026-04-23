"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api";
import type {
  ExplorerCategory,
  ExplorerResult,
  ExplorerScan,
} from "@/types/api";

const MAX_NAMES = 1000;
const POLL_MS = 1000;

type Tab = "human" | "inactive" | "active" | "error";
const TABS: { key: Tab; label: string; accent: string }[] = [
  { key: "human", label: "휴먼 상태", accent: "text-emerald-400" },
  { key: "inactive", label: "장기 미접속", accent: "text-amber-400" },
  { key: "active", label: "사용 중", accent: "text-white" },
  { key: "error", label: "에러", accent: "text-red-400" },
];

function parseNames(raw: string): string[] {
  const names = raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(new Set(names));
}

function relativeTime(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return "-";
  const diff = Date.now() - ms;
  if (diff < 0) return "방금";
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) return `${Math.floor(diff / (60 * 60 * 1000))}시간 전`;
  if (diff < 30 * day) return `${Math.floor(diff / day)}일 전`;
  if (diff < 365 * day) return `${Math.floor(diff / (30 * day))}개월 전`;
  return `${Math.floor(diff / (365 * day))}년 전`;
}

function absoluteDate(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return "";
  const d = new Date(ms);
  return d.toLocaleString("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

export default function ExplorerPage() {
  const toast = useToast();
  const [input, setInput] = useState("");
  const [inactivityDays, setInactivityDays] = useState(180);
  const [scan, setScan] = useState<ExplorerScan | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<Tab>("human");
  const scanIdRef = useRef<string | null>(null);

  const names = useMemo(() => parseNames(input), [input]);
  const nameCount = names.length;

  const isRunning = scan?.status === "running";

  const poll = useCallback(
    async (scanId: string) => {
      try {
        const next = await api.explorerGetScan(scanId);
        setScan(next);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          scanIdRef.current = null;
          setScan(null);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!isRunning || !scan) return;
    const id = scan.id;
    const timer = window.setInterval(() => {
      void poll(id);
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [isRunning, scan, poll]);

  const onStart = async () => {
    if (nameCount === 0) {
      toast.show("닉네임을 입력해 주세요.", "error");
      return;
    }
    if (nameCount > MAX_NAMES) {
      toast.show(`최대 ${MAX_NAMES}개까지 입력 가능합니다.`, "error");
      return;
    }
    setSubmitting(true);
    try {
      const created = await api.explorerStartScan({
        names, inactivity_days: inactivityDays,
      });
      scanIdRef.current = created.id;
      setScan(created);
      setTab("human");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "탐색 실패";
      toast.show(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const onCancel = async () => {
    if (!scan) return;
    try {
      const next = await api.explorerCancelScan(scan.id);
      setScan(next);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "취소 실패";
      toast.show(msg, "error");
    }
  };

  const bucketed = useMemo(() => {
    const buckets: Record<ExplorerCategory, ExplorerResult[]> = {
      human: [], inactive: [], active: [], error: [],
    };
    if (scan) {
      for (const r of scan.results) buckets[r.category].push(r);
    }
    return buckets;
  }, [scan]);

  const percent = scan
    ? Math.min(100, Math.round((scan.processed / Math.max(scan.total, 1)) * 100))
    : 0;

  return (
    <div className="flex flex-col gap-12 pb-20">
      <div>
        <h1 className="text-[32px] font-bold tracking-tight text-white">휴먼 탐색기</h1>
        <p className="mt-2 text-[14px] text-[#b3b3b3]">
          닉네임을 한 줄에 하나씩 입력하면 휴먼 상태(풀린 닉) · 장기 미접속 · 사용 중 으로 분류합니다.
          한 번에 최대 {MAX_NAMES}개까지 · 유저 검색/클랜 응답성 확보 위해 1 lane 은
          예약된 채로 병렬 처리 (매크로/로그인에는 영향 없음).
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-[14px] font-bold text-[#b3b3b3]">닉네임 목록</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={"사랑\n초콜릿\n하트"}
            rows={10}
            disabled={isRunning}
            className="w-full resize-none rounded-[6px] border border-[#272727] bg-[#1f1f1f] px-4 py-3 text-[14px] leading-relaxed text-white placeholder:text-[#525252] outline-none focus:border-[#7c7c7c] disabled:opacity-60"
          />
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-[#7c7c7c]">
              {nameCount}개 입력됨 {nameCount > MAX_NAMES && (
                <span className="text-red-400"> · 최대 {MAX_NAMES}개 초과</span>
              )}
            </span>
            <span className="text-[#7c7c7c]">쉼표 또는 줄바꿈으로 구분 · 중복 자동 제거</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[14px] font-bold text-[#b3b3b3]">
            장기 미접속 기준 (일)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={3650}
              value={inactivityDays}
              disabled={isRunning}
              onChange={(e) =>
                setInactivityDays(Math.max(1, Math.min(3650, Number(e.target.value) || 180)))
              }
              className="w-32 rounded-[6px] border border-[#272727] bg-[#1f1f1f] px-3 py-2 text-[14px] text-white outline-none focus:border-[#7c7c7c] disabled:opacity-60"
            />
            <span className="text-[13px] text-[#7c7c7c]">
              기본 180일 · 이 값보다 오래 접속 안 한 계정은 &ldquo;장기 미접속&rdquo; 탭에 표시
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          {isRunning ? (
            <Button variant="outline" onClick={onCancel}>중단</Button>
          ) : (
            <Button variant="outline" onClick={() => setInput("")}>초기화</Button>
          )}
          <Button
            size="lg"
            loading={submitting || isRunning}
            disabled={isRunning || nameCount === 0 || nameCount > MAX_NAMES}
            onClick={onStart}
            className="px-10"
          >
            {isRunning ? `진행 중 ${percent}%` : "탐색 시작"}
          </Button>
        </div>
      </div>

      {scan && (
        <>
          <div className="h-[1px] w-full bg-[#272727]" />
          <ProgressBlock scan={scan} percent={percent} />
          <ResultTabs
            tab={tab}
            onTab={setTab}
            counts={{
              human: bucketed.human.length,
              inactive: bucketed.inactive.length,
              active: bucketed.active.length,
              error: bucketed.error.length,
            }}
          />
          <ResultList results={bucketed[tab]} tab={tab} />
        </>
      )}
    </div>
  );
}

function ProgressBlock({ scan, percent }: { scan: ExplorerScan; percent: number }) {
  const statusLabel = (() => {
    switch (scan.status) {
      case "running":   return "탐색 중";
      case "succeeded": return "완료";
      case "canceled":  return "중단됨";
      case "failed":    return "실패";
    }
  })();
  return (
    <div className="flex flex-col gap-3 rounded-[6px] bg-[#1f1f1f] px-5 py-4">
      <div className="flex items-center justify-between text-[13px]">
        <span className="font-bold text-white">{statusLabel}</span>
        <span className="text-[#b3b3b3]">
          {scan.processed} / {scan.total} ({percent}%)
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#141414]">
        <div
          className="h-full bg-[#1ed760] transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      {scan.error && (
        <div className="text-[12px] text-red-400">{scan.error}</div>
      )}
    </div>
  );
}

function ResultTabs({
  tab,
  onTab,
  counts,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  counts: Record<Tab, number>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {TABS.map((t) => {
        const on = t.key === tab;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onTab(t.key)}
            className={`rounded-full px-5 py-2 text-[14px] font-bold transition-colors ${
              on
                ? "bg-white text-black"
                : "bg-[#1f1f1f] text-[#b3b3b3] hover:bg-[#2a2a2a] hover:text-white"
            }`}
          >
            <span className={on ? "" : t.accent}>{t.label}</span>
            <span className="ml-2 text-[12px] opacity-70">{counts[t.key]}</span>
          </button>
        );
      })}
    </div>
  );
}

type SortDir = "asc" | "desc";

function ResultList({
  results,
  tab,
}: {
  results: ExplorerResult[];
  tab: Tab;
}) {
  const [copied, setCopied] = useState(false);
  // 기본값: 장기 미접속 탭은 "가장 오래된 순"(asc) — 풀 타이밍 임박 후보가 상단
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const sorted = useMemo(() => {
    if (tab !== "inactive" && tab !== "active") return results;
    const arr = [...results];
    arr.sort((a, b) => {
      const av = a.last_login_ms ?? 0;
      const bv = b.last_login_ms ?? 0;
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return arr;
  }, [results, sortDir, tab]);

  const doCopy = () => {
    const text = sorted.map((r) => r.nickname).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  if (results.length === 0) {
    return (
      <div className="rounded-[6px] border border-[#272727] px-5 py-10 text-center text-[13px] text-[#7c7c7c]">
        해당 카테고리 결과가 없습니다.
      </div>
    );
  }

  const showSort = tab === "inactive" || tab === "active";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end gap-2">
        {showSort && (
          <div className="flex items-center gap-1 rounded-full bg-[#1f1f1f] p-1">
            <button
              type="button"
              onClick={() => setSortDir("asc")}
              className={`rounded-full px-3 py-1 text-[12px] font-bold transition-colors ${
                sortDir === "asc"
                  ? "bg-white text-black"
                  : "text-[#b3b3b3] hover:text-white"
              }`}
              title="마지막 접속이 오래된 순"
            >
              오래된 순 ↑
            </button>
            <button
              type="button"
              onClick={() => setSortDir("desc")}
              className={`rounded-full px-3 py-1 text-[12px] font-bold transition-colors ${
                sortDir === "desc"
                  ? "bg-white text-black"
                  : "text-[#b3b3b3] hover:text-white"
              }`}
              title="마지막 접속이 최근인 순"
            >
              최근 순 ↓
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={doCopy}
          className="rounded-full bg-[#1f1f1f] px-4 py-1.5 text-[12px] font-bold text-[#b3b3b3] hover:bg-[#2a2a2a] hover:text-white"
        >
          {copied ? "복사됨" : `닉 목록 복사 (${sorted.length})`}
        </button>
      </div>
      <div className="flex flex-col divide-y divide-[#272727] rounded-[6px] border border-[#272727]">
        {sorted.map((r) => (
          <div
            key={r.nickname}
            className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-[#1f1f1f]"
          >
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-[14px] font-bold text-white">
                {r.nickname}
              </span>
              {tab === "inactive" && (
                <span className="mt-0.5 text-[12px] text-[#7c7c7c]">
                  마지막 접속: {absoluteDate(r.last_login_ms)} ({relativeTime(r.last_login_ms)})
                </span>
              )}
              {tab === "active" && r.last_login_ms ? (
                <span className="mt-0.5 text-[12px] text-[#7c7c7c]">
                  {relativeTime(r.last_login_ms)}
                  {r.clan_name ? ` · ${r.clan_name}` : ""}
                </span>
              ) : null}
              {tab === "error" && (
                <span className="mt-0.5 text-[11px] text-red-400/70">{r.error}</span>
              )}
            </div>
            {(tab === "active" || tab === "inactive") && r.level != null && (
              <span className="shrink-0 text-[12px] text-[#7c7c7c]">Lv.{r.level}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

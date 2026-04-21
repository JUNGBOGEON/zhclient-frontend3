"use client";

import { useCallback, useEffect, useState } from "react";

import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/input";
import { ApiError, api } from "@/lib/api";
import { formatRelativeFromISO } from "@/lib/format";
import type { JobResponse, MacroOpType, MacroStatus } from "@/types/api";

const STATUS_LABEL: Record<MacroStatus, string> = {
  queued: "대기",
  running: "실행중",
  succeeded: "성공",
  failed: "실패",
  cancelled: "중지됨",
};

const OP_LABEL: Record<MacroOpType, string> = {
  badname: "미통디 닉변",
  rename: "통합 닉변",
  character: "캐릭터 생성",
  snipe: "매크로",
  snipe_rename: "닉변 매크로",
  snipe_character: "캐릭터 매크로",
  snipe_badname: "미통디 매크로",
};

const LEGACY_OP_TYPES: ReadonlySet<MacroOpType> = new Set<MacroOpType>([
  "badname",
  "snipe_badname",
]);

// ─── 현재 실행중 ────────────────────────────────────────────────────

export function ActiveJobsCard({
  jobs,
  loading = false,
  refreshing = false,
  onRefresh,
  lastUpdated,
}: {
  jobs: JobResponse[];
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  lastUpdated?: number | null;
}) {
  return (
    <section className="flex flex-col gap-6 pt-4">
      <header className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-bold uppercase tracking-[2px] text-[#7c7c7c]">Now Playing</span>
          <h2 className="text-[48px] font-bold leading-none tracking-tight text-white md:text-[64px]">현재 실행중</h2>
        </div>
        <div className="flex items-center gap-4 pb-2">
          <span className="hidden text-[14px] font-bold text-[#7c7c7c] md:inline">
            {jobs.length} 트랙
            {lastUpdated
              ? ` · ${new Date(lastUpdated).toLocaleTimeString("ko-KR")}`
              : ""}
          </span>
          {onRefresh ? (
            <Button
              variant="ghost"
              size="sm"
              loading={refreshing}
              onClick={onRefresh}
              className="rounded-full"
            >
              새로고침
            </Button>
          ) : null}
        </div>
      </header>
      <JobTableBody jobs={jobs} loading={loading} emptyText="실행 중인 매크로가 없습니다." />
    </section>
  );
}

// ─── 이전 로그 ──────────────────────────────────────────────────────

const STATUS_FILTERS: Array<{ key: MacroStatus | "all"; label: string }> = [
  { key: "all", label: "전체" },
  { key: "succeeded", label: "성공" },
  { key: "failed", label: "실패" },
  { key: "cancelled", label: "중지됨" },
];

const PAGE_SIZE = 10;

export function HistoryJobsCard() {
  const toast = useToast();
  const [filter, setFilter] = useState<MacroStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [resetKey, setResetKey] = useState("all|");
  const [jobs, setJobs] = useState<JobResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const [pendingBulk, setPendingBulk] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const currentKey = `${filter}|${debouncedSearch}`;
  if (currentKey !== resetKey) {
    setResetKey(currentKey);
    if (page !== 0) setPage(0);
  }

  useEffect(() => {
    let cancelled = false;
    const fetchPage = async () => {
      setLoading(true);
      try {
        const res = await api.listMacroHistory({
          status: filter === "all" ? undefined : [filter],
          nickname: debouncedSearch || undefined,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        });
        if (cancelled) return;
        setJobs(res.jobs);
        setTotal(res.total);
      } catch (err) {
        if (cancelled) return;
        toast.show(
          err instanceof ApiError ? err.message : "로그 조회 실패",
          "error",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchPage();
    return () => {
      cancelled = true;
    };
  }, [filter, debouncedSearch, page, refreshTick, toast]);

  const reload = useCallback(() => setRefreshTick((t) => t + 1), []);

  const handleDelete = async (jobId: string) => {
    try {
      await api.deleteMacro(jobId);
      toast.show("삭제됨", "info");
      reload();
    } catch (err) {
      toast.show(
        err instanceof ApiError ? err.message : "삭제 실패",
        "error",
      );
    }
  };

  const handleBulkDelete = async () => {
    if (jobs.length === 0) return;
    const confirmed = window.confirm(
      filter === "all"
        ? "모든 로그를 삭제할까요?"
        : `${STATUS_LABEL[filter as MacroStatus]} 로그를 모두 삭제할까요?`,
    );
    if (!confirmed) return;
    setPendingBulk(true);
    try {
      const res = await api.deleteMacroHistory(
        filter === "all" ? undefined : [filter],
      );
      toast.show(`${res.removed}개 삭제됨`, "success");
      reload();
    } catch (err) {
      toast.show(
        err instanceof ApiError ? err.message : "삭제 실패",
        "error",
      );
    } finally {
      setPendingBulk(false);
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section className="mt-20 flex flex-col gap-6">
      <header className="flex flex-col gap-6">
        <h2 className="text-[32px] font-bold tracking-tight text-white md:text-[48px]">이전 로그</h2>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {STATUS_FILTERS.map((f) => {
              const on = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={`rounded-full px-4 py-2 text-[14px] font-bold transition-colors ${
                    on
                      ? "bg-white text-black"
                      : "bg-[#2a2a2a] text-white hover:bg-[#333333]"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            <div className="w-56">
              <SearchInput
                placeholder="타겟 닉네임 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              loading={pendingBulk}
              disabled={jobs.length === 0}
              onClick={handleBulkDelete}
              className="text-[13px] font-bold text-[#f3727f] hover:bg-[#f3727f]/10"
            >
              일괄 삭제
            </Button>
          </div>
        </div>
      </header>

      <JobTableBody
        jobs={jobs}
        loading={loading}
        emptyText="조건에 맞는 로그가 없습니다."
        deletable
        onDelete={handleDelete}
      />

      {pageCount > 1 ? (
        <div className="mt-8 flex items-center justify-center gap-4">
          <Button
            variant="ghost"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || loading}
          >
            이전
          </Button>
          <span className="text-[13px] font-bold tracking-wide text-[#b3b3b3]">
            {page + 1} / {pageCount}
          </span>
          <Button
            variant="ghost"
            onClick={() => setPage((p) => p + 1)}
            disabled={page + 1 >= pageCount || loading}
          >
            다음
          </Button>
        </div>
      ) : null}
    </section>
  );
}

// ─── 공용 테이블 바디 (Spotify Playlist Style) ─────────────────────────

function JobTableBody({
  jobs,
  loading,
  emptyText,
  deletable = false,
  onDelete,
}: {
  jobs: JobResponse[];
  loading: boolean;
  emptyText: string;
  deletable?: boolean;
  onDelete?: (id: string) => void | Promise<void>;
}) {
  const toast = useToast();

  const handleCancel = async (jobId: string) => {
    try {
      await api.cancelMacro(jobId);
      toast.show("중지 요청됨", "success");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "중지 실패", "error");
    }
  };

  if (loading && jobs.length === 0) {
    return (
      <div className="py-20 text-center text-[15px] font-bold text-[#b3b3b3]">
        로그를 불러오는 중입니다...
      </div>
    );
  }
  if (jobs.length === 0) {
    return (
      <div className="py-20 text-center text-[15px] font-bold text-[#7c7c7c]">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-4 px-4 py-2 text-[12px] font-bold uppercase tracking-[1.4px] text-[#b3b3b3]">
        <div className="w-8 text-center">#</div>
        <div className="flex-1 min-w-0">제목</div>
        <div className="hidden w-56 md:block">결과 / 상태</div>
        <div className="w-32 text-right">업데이트</div>
      </div>
      <div className="mb-2 h-[1px] w-full bg-[#272727]" />

      <div className="flex flex-col">
        {jobs.map((job, idx) => {
          const isRunning = job.status === "running" || job.status === "queued";
          const titleColor = isRunning ? "text-[#1ed760]" : "text-white";
          
          return (
            <div
              key={job.id}
              className="group flex items-start gap-4 rounded-[4px] px-4 py-3 transition-colors hover:bg-[#2a2a2a]"
            >
              {/* 곡 번호 영역 (호버 시 액션 버튼) */}
              <div className="relative w-8 pt-1 text-center text-[14px] text-[#b3b3b3]">
                {isRunning ? (
                  <div className="flex h-full items-center justify-center group-hover:hidden">
                    <span
                      aria-hidden
                      style={{ animation: "zh-pulse-dot 1s ease-in-out infinite" }}
                      className="inline-block h-2 w-2 rounded-full bg-[#1ed760]"
                    />
                  </div>
                ) : (
                  <span className="group-hover:hidden">{idx + 1}</span>
                )}
                
                {/* 호버 액션 */}
                <div className="hidden h-full items-center justify-center group-hover:flex">
                  {isRunning ? (
                    <button
                      type="button"
                      onClick={() => handleCancel(job.id)}
                      className="text-[#f3727f] hover:text-[#ff99a4]"
                      aria-label="중지"
                      title="매크로 중지"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>
                    </button>
                  ) : deletable ? (
                    <button
                      type="button"
                      onClick={() => onDelete?.(job.id)}
                      className="text-[#7c7c7c] hover:text-white"
                      aria-label="삭제"
                      title="로그 삭제"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                  ) : (
                    <span className="text-[#b3b3b3]">{idx + 1}</span>
                  )}
                </div>
              </div>

              {/* 제목 (타겟 닉네임) & 메타 (계정 종류 / 유형 / 로그인 ID / 슬롯) */}
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                <span className={`truncate text-[16px] font-bold ${titleColor}`}>
                  → {extractNickname(job.payload) ?? "알 수 없음"}
                </span>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-bold text-[#b3b3b3] group-hover:text-white transition-colors">
                  <span
                    className={`rounded-full px-2 py-[2px] text-[10px] tracking-[0.08em] ${
                      LEGACY_OP_TYPES.has(job.op_type)
                        ? "bg-[#2a1f1a] text-[#f3b57c]"
                        : "bg-[#1a2a2a] text-[#7ce5e5]"
                    }`}
                  >
                    {LEGACY_OP_TYPES.has(job.op_type) ? "미통디" : "통합"}
                  </span>
                  <span>{OP_LABEL[job.op_type]}</span>
                  {extractUserId(job.payload) ? (
                    <>
                      <span className="text-[#7c7c7c]">·</span>
                      <span className="truncate">{extractUserId(job.payload)}</span>
                    </>
                  ) : null}
                  {extractSlaveIndex(job.payload) !== null ? (
                    <>
                      <span className="text-[#7c7c7c]">·</span>
                      <span>슬롯 {extractSlaveIndex(job.payload)}</span>
                    </>
                  ) : null}
                  <span className="text-[#7c7c7c]">·</span>
                  <span className="truncate">{job.id.slice(0, 8)}</span>
                </div>
              </div>

              {/* 앨범/상태 영역 (결과 로그 및 세부 사항) */}
              <div className="hidden w-56 flex-col pt-1 md:flex">
                <JobResultCell job={job} />
              </div>

              {/* 업데이트 (시간) */}
              <div className="w-32 pt-1 text-right text-[13px] font-bold text-[#b3b3b3]">
                {formatRelativeFromISO(job.updated_at)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 결과 셀 (실시간 진행 + 체크 펼침 + 완료 상태) ──────────────────

function JobResultCell({ job }: { job: JobResponse }) {
  const checks = extractChecks(job.result);
  
  if (job.error && checks) {
    return <ChecksView error={job.error} checks={checks} />;
  }
  if (job.error) {
    return (
      <span className="line-clamp-2 text-[13px] font-bold text-[#f3727f]">
        {job.error}
      </span>
    );
  }
  if (job.status === "succeeded") {
    return (
      <span className="text-[14px] font-bold text-[#1ed760]">
        {summariseSuccess(job.result)}
      </span>
    );
  }
  if (job.status === "running") {
    const live = extractLiveProgress(job.result);
    if (live) {
      return <LiveProgressView progress={live} />;
    }
    return (
      <span className="text-[13px] font-bold text-[#b3b3b3]">
        진행 중...
      </span>
    );
  }
  return <span className="text-[13px] font-bold text-[#7c7c7c]">—</span>;
}

type EligibilityCheck = {
  name: string;
  passed: boolean;
  detail: string;
};

const CHECK_LABEL: Record<string, string> = {
  preflight: "클라이언트 상태",
  client_version: "클라 버전",
  xigncode_cookie: "XIGNCODE 쿠키",
  server_reachable: "서버 접속",
  integrated_account: "통합계정 여부",
  legacy_account: "미통합 계정 여부",
  linked_to_integrated: "통합 계정 연결",
  account_not_banned: "계정 정지 여부",
  credentials: "아이디/비번",
  character_exists: "캐릭터 존재",
  slave_token: "부캐 토큰",
  mineral_threshold: "미네랄 50,000+",
  rename_cooldown: "닉변 쿨다운",
};

function extractChecks(
  result: Record<string, unknown> | null,
): EligibilityCheck[] | null {
  if (!result) return null;
  const raw = result["checks"];
  if (!Array.isArray(raw)) return null;
  const out: EligibilityCheck[] = [];
  for (const c of raw) {
    if (!c || typeof c !== "object") continue;
    const entry = c as Record<string, unknown>;
    const name = typeof entry["name"] === "string" ? entry["name"] : "";
    if (!name) continue;
    out.push({
      name,
      passed: Boolean(entry["passed"]),
      detail: typeof entry["detail"] === "string" ? entry["detail"] : "",
    });
  }
  return out.length > 0 ? out : null;
}

function ChecksView({
  error,
  checks,
}: {
  error: string;
  checks: EligibilityCheck[];
}) {
  const failed = checks.filter((c) => !c.passed);
  const passed = checks.filter((c) => c.passed);
  return (
    <details className="group">
      <summary className="cursor-pointer list-none text-[13px] font-bold text-[#f3727f] hover:underline">
        <span className="line-clamp-2">{error}</span>
      </summary>
      <div className="mt-2 flex flex-col gap-1 text-[12px] font-bold">
        {failed.map((c) => (
          <div key={c.name} className="flex items-start gap-1.5">
            <span className="mt-0.5 text-[#f3727f]">✗</span>
            <div className="min-w-0">
              <span className="text-[#f3727f]">
                {CHECK_LABEL[c.name] ?? c.name}
              </span>
              {c.detail ? (
                <span className="ml-1 text-[#b3b3b3]">· {c.detail}</span>
              ) : null}
            </div>
          </div>
        ))}
        {passed.length > 0 ? (
          <div className="mt-1 text-[#7c7c7c]">
            통과: {passed.map((c) => CHECK_LABEL[c.name] ?? c.name).join(", ")}
          </div>
        ) : null}
      </div>
    </details>
  );
}

type LiveProbes = {
  total: number;
  try_409: number;
  try_300: number;
  confirm_ok: number;
  confirm_409: number;
  captcha_fail: number;
  error: number;
};

type LiveRecent = { t: number; kind: string; detail?: string };

type LiveProgress = {
  elapsed_s: number;
  requested_rate: number;
  actual_rate: number;
  probes: LiveProbes;
  recent: LiveRecent[];
};

const EVENT_LABEL: Record<string, { label: string; color: string }> = {
  try_300: { label: "캡챠 시도", color: "text-[#539df5]" },
  try_409: { label: "사용중", color: "text-[#7c7c7c]" },
  try_other: { label: "기타 응답", color: "text-[#7c7c7c]" },
  confirm_ok: { label: "선점 성공", color: "text-[#1ed760]" },
  confirm_409: { label: "휴먼 상태 유지", color: "text-[#ffa42b]" },
  captcha_fail: { label: "캡챠 실패", color: "text-[#ffa42b]" },
  error: { label: "에러", color: "text-[#f3727f]" },
};

function extractLiveProgress(
  result: Record<string, unknown> | null,
): LiveProgress | null {
  if (!result || result["live"] !== true) return null;
  const probes = result["probes"] as LiveProbes | undefined;
  const recent = result["recent"];
  if (!probes) return null;
  return {
    elapsed_s: Number(result["elapsed_s"] ?? 0),
    requested_rate: Number(result["requested_rate"] ?? 0),
    actual_rate: Number(result["actual_rate"] ?? 0),
    probes,
    recent: Array.isArray(recent) ? (recent as LiveRecent[]) : [],
  };
}

function LiveProgressView({ progress }: { progress: LiveProgress }) {
  const p = progress.probes;
  const mm = Math.floor(progress.elapsed_s / 60);
  const ss = Math.floor(progress.elapsed_s % 60);
  const elapsed = `${mm.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}`;
  
  return (
    <details className="group">
      <summary className="cursor-pointer list-none text-[13px] font-bold text-[#1ed760] hover:underline">
        <div className="flex flex-col gap-0.5">
          <span>{p.total}회 시도 중 · {elapsed} 경과</span>
          <span className="text-[11px] text-[#1ed760]/70">
            실측 {progress.actual_rate.toFixed(1)} / 설정 {progress.requested_rate.toFixed(1)} req/s
          </span>
        </div>
      </summary>
      <div className="mt-2 flex flex-col gap-2">
        <div className="flex flex-wrap gap-2 text-[11px] font-bold text-[#7c7c7c]">
          <span>try 300: <span className="text-white">{p.try_300}</span></span>
          <span>try 409: <span className="text-white">{p.try_409}</span></span>
          <span className={p.confirm_ok > 0 ? "text-[#1ed760]" : ""}>
            confirm ok: {p.confirm_ok}
          </span>
          {p.confirm_409 > 0 ? (
            <span className="text-[#ffa42b]">confirm 409: {p.confirm_409}</span>
          ) : null}
          {p.captcha_fail > 0 ? (
            <span className="text-[#ffa42b]">
              captcha fail: {p.captcha_fail}
            </span>
          ) : null}
          {p.error > 0 ? (
            <span className="text-[#f3727f]">err: {p.error}</span>
          ) : null}
        </div>
        
        {progress.recent.length > 0 ? (
          <div className="flex flex-col gap-1 text-[11px] font-bold">
            {progress.recent
              .slice()
              .reverse()
              .slice(0, 5)
              .map((ev, idx) => {
                const meta =
                  EVENT_LABEL[ev.kind] ?? {
                    label: ev.kind,
                    color: "text-[#cbcbcb]",
                  };
                const time = new Date(ev.t * 1000).toLocaleTimeString("ko-KR", { hour12: false });
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-[#7c7c7c]">{time}</span>
                    <span className={meta.color}>{meta.label}</span>
                    {ev.detail ? (
                      <span className="truncate text-[#7c7c7c]">· {ev.detail}</span>
                    ) : null}
                  </div>
                );
              })}
          </div>
        ) : null}
      </div>
    </details>
  );
}

function extractNickname(
  payload: Record<string, unknown> | null,
): string | null {
  if (!payload) return null;
  const value = payload["nickname"];
  if (typeof value === "string" && value.length > 0) return value;
  return null;
}

function extractUserId(
  payload: Record<string, unknown> | null,
): string | null {
  if (!payload) return null;
  const value = payload["user_id"];
  if (typeof value === "string" && value.length > 0) return value;
  return null;
}

function extractSlaveIndex(
  payload: Record<string, unknown> | null,
): number | null {
  if (!payload) return null;
  const value = payload["slave_index"];
  return typeof value === "number" ? value : null;
}

function summariseSuccess(result: Record<string, unknown> | null): string {
  if (!result) return "성공";
  const message = result["message"];
  if (typeof message === "string" && message.length > 0) return message;
  const tcpStatus = result["tcp_status"];
  if (typeof tcpStatus === "number" && tcpStatus === 0) return "선점 완료";
  const status = result["status"];
  if (typeof status === "string" && status.length > 0) return status;
  const summary = result["summary"];
  if (typeof summary === "string" && summary.length > 0) return summary;
  return "성공";
}

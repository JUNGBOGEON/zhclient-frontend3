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

const STATUS_COLOR: Record<MacroStatus, string> = {
  queued: "text-[#ffa42b]",
  running: "text-[#539df5]",
  succeeded: "text-[#1ed760]",
  failed: "text-[#f3727f]",
  cancelled: "text-[#7c7c7c]",
};

const OP_LABEL: Record<MacroOpType, string> = {
  badname: "미통디",
  rename: "닉변",
  character: "캐릭터",
  snipe: "스나이프",
  snipe_rename: "닉변",
  snipe_character: "캐릭터",
  snipe_badname: "미통디",
};

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
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <h2 className="text-[24px] font-bold tracking-tight text-white">현재 실행중</h2>
          <span className="text-[14px] text-[#7c7c7c]">
            {jobs.length}개
            {lastUpdated
              ? ` · ${new Date(lastUpdated).toLocaleTimeString("ko-KR")}`
              : ""}
          </span>
        </div>
        {onRefresh ? (
          <Button
            variant="ghost"
            size="sm"
            loading={refreshing}
            onClick={onRefresh}
          >
            새로고침
          </Button>
        ) : null}
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
      toast.show(`${res.removed}개 삭제됨`, "info");
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
    <section className="mt-10 flex flex-col gap-6">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-[24px] font-bold tracking-tight text-white">이전 로그</h2>
          <span className="text-[14px] text-[#7c7c7c]">총 {total}개</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {STATUS_FILTERS.map((f) => {
            const on = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-4 py-1.5 text-[13px] font-bold transition-colors ${
                  on
                    ? "bg-white text-black"
                    : "bg-[#1f1f1f] text-[#b3b3b3] hover:bg-[#2a2a2a] hover:text-white"
                }`}
              >
                {f.label}
              </button>
            );
          })}
          <div className="ml-2 w-48">
            <SearchInput
              placeholder="닉네임 검색"
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
            className="text-[#f3727f] hover:bg-[#f3727f]/10 hover:text-[#f3727f]"
          >
            일괄 삭제
          </Button>
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
        <div className="mt-4 flex items-center justify-center gap-4">
          <Button
            variant="ghost"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || loading}
          >
            이전
          </Button>
          <span className="text-[13px] font-bold text-[#b3b3b3]">
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

// ─── 공용 테이블 바디 (Tracklist Style) ────────────────────────────────

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
        <div className="w-20">상태</div>
        <div className="w-16">유형</div>
        <div className="w-32">대상</div>
        <div className="w-16">시도</div>
        <div className="w-28">업데이트</div>
        <div className="min-w-0 flex-1">결과</div>
        {deletable && <div className="w-10"></div>}
      </div>
      <div className="mb-2 h-[1px] w-full bg-[#272727]" />

      <div className="flex flex-col gap-1">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="group flex items-start gap-4 rounded-[6px] px-4 py-3 transition-colors hover:bg-[#1f1f1f]"
          >
            <div className="w-20 pt-0.5 text-[13px] font-bold">
              <span className={STATUS_COLOR[job.status]}>{STATUS_LABEL[job.status]}</span>
            </div>
            <div className="w-16 pt-0.5 text-[13px] text-[#cbcbcb]">
              {OP_LABEL[job.op_type]}
            </div>
            <div className="flex w-32 flex-col">
              <span className="truncate text-[14px] font-bold text-white">
                {extractNickname(job.payload) ?? "—"}
              </span>
              <span className="text-[11px] text-[#7c7c7c]">
                {job.id.slice(0, 8)}
              </span>
            </div>
            <div className="w-16 pt-0.5 text-[13px] text-[#cbcbcb]">
              {job.attempts} / {job.max_attempts}
            </div>
            <div className="flex w-28 flex-col pt-0.5 text-[12px] text-[#b3b3b3]">
              <span>{formatRelativeFromISO(job.updated_at)}</span>
              {job.status === "running" || job.status === "queued" ? (
                <div className="mt-1">
                  <CancelButton jobId={job.id} />
                </div>
              ) : null}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <JobResultCell job={job} />
            </div>
            {deletable && (
              <div className="w-10 pt-0.5 text-right">
                <button
                  type="button"
                  onClick={() => onDelete?.(job.id)}
                  className="text-[12px] text-[#7c7c7c] opacity-0 transition-opacity hover:text-[#f3727f] group-hover:opacity-100"
                >
                  삭제
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CancelButton({ jobId }: { jobId: string }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const onClick = async () => {
    setBusy(true);
    try {
      await api.cancelMacro(jobId);
      toast.show("중지 요청됨 — 곧 반영됩니다", "info");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "중지 실패", "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="rounded px-1.5 py-0.5 text-[11px] text-[#f3727f] hover:bg-[#f3727f]/10 disabled:opacity-50"
    >
      {busy ? "중지중…" : "중지"}
    </button>
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
      <span className="line-clamp-2 text-[12px] text-[#f3727f]">
        {job.error}
      </span>
    );
  }
  if (job.status === "succeeded") {
    return (
      <span className="text-[13px] font-bold text-[#1ed760]">
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
      <span className="text-[13px] font-bold text-[#b3b3b3]">실행 중…</span>
    );
  }
  return <span className="text-[13px] text-[#7c7c7c]">—</span>;
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
      <summary className="cursor-pointer list-none text-[13px] font-bold text-[#f3727f]">
        <span className="line-clamp-2">{error}</span>
        <span className="text-[11px] font-normal text-[#7c7c7c] group-open:hidden">
          클릭해서 체크 상세 보기
        </span>
      </summary>
      <div className="mt-1.5 flex flex-col gap-1 text-[11px] font-normal">
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
          <div className="mt-0.5 text-[#7c7c7c]">
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
    <details className="group" open>
      <summary className="cursor-pointer list-none text-[13px] font-bold text-[#539df5]">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            style={{ animation: "zh-pulse-dot 1.6s ease-in-out infinite" }}
            className="inline-block h-1.5 w-1.5 rounded-full bg-[#539df5]"
          />
          <span>
            시도 {p.total}회 · 실측 {progress.actual_rate.toFixed(1)} / 설정{" "}
            {progress.requested_rate.toFixed(1)} req/s · {elapsed}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap gap-3 text-[11px] font-normal text-[#7c7c7c]">
          <span>try 300: {p.try_300}</span>
          <span>try 409: {p.try_409}</span>
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
      </summary>
      {progress.recent.length > 0 ? (
        <div className="mt-2 flex flex-col gap-0.5 text-[11px] font-normal">
          {progress.recent
            .slice()
            .reverse()
            .slice(0, 12)
            .map((ev, idx) => {
               const meta =
                EVENT_LABEL[ev.kind] ?? {
                  label: ev.kind,
                  color: "text-[#cbcbcb]",
                };
              const time = new Date(ev.t * 1000).toLocaleTimeString("ko-KR");
              return (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-[#7c7c7c]">{time}</span>
                  <span className={meta.color}>{meta.label}</span>
                  {ev.detail ? (
                    <span className="text-[#7c7c7c]">· {ev.detail}</span>
                  ) : null}
                </div>
              );
            })}
        </div>
      ) : null}
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

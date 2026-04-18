"use client";

import { Badge, StatusDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelativeFromISO } from "@/lib/format";
import type { JobResponse, MacroOpType, MacroStatus } from "@/types/api";

const STATUS_TONE: Record<
  MacroStatus,
  "success" | "danger" | "warning" | "info" | "mute"
> = {
  queued: "warning",
  running: "info",
  succeeded: "success",
  failed: "danger",
  cancelled: "mute",
};

const STATUS_LABEL: Record<MacroStatus, string> = {
  queued: "대기",
  running: "실행중",
  succeeded: "성공",
  failed: "실패",
  cancelled: "취소",
};

const OP_LABEL: Record<MacroOpType, string> = {
  badname: "BADNAME",
  rename: "RENAME",
  character: "CHARACTER",
  snipe: "SNIPE",
};

export function JobTable({
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
    <section className="rounded-xl bg-[#181818]">
      <header className="flex items-center justify-between gap-3 border-b border-[#272727] px-6 py-4">
        <div>
          <h2 className="text-[16px] font-bold text-white">내 매크로 작업</h2>
          <p className="text-[12px] text-[#b3b3b3]">
            3초마다 자동 갱신 · {jobs.length}개
            {lastUpdated
              ? ` · 마지막 업데이트 ${new Date(lastUpdated).toLocaleTimeString("ko-KR")}`
              : ""}
          </p>
        </div>
        {onRefresh ? (
          <Button
            variant="secondary"
            size="sm"
            loading={refreshing}
            onClick={onRefresh}
            uppercase
          >
            새로고침
          </Button>
        ) : null}
      </header>
      <div className="overflow-x-auto">
        {loading ? (
          <div className="px-6 py-10 text-center text-[14px] text-[#b3b3b3]">
            불러오는 중…
          </div>
        ) : jobs.length === 0 ? (
          <div className="px-6 py-10 text-center text-[14px] text-[#b3b3b3]">
            아직 제출한 매크로가 없습니다.
          </div>
        ) : (
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="text-[11px] font-bold uppercase tracking-[1.6px] text-[#7c7c7c]">
                <th className="py-3 pl-6 pr-3 font-normal">상태</th>
                <th className="py-3 pr-3 font-normal">유형</th>
                <th className="py-3 pr-3 font-normal">대상</th>
                <th className="py-3 pr-3 font-normal">시도</th>
                <th className="py-3 pr-3 font-normal">업데이트</th>
                <th className="py-3 pr-6 font-normal">결과</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#272727]">
              {jobs.map((job) => (
                <tr key={job.id} className="align-top">
                  <td className="py-3 pl-6 pr-3">
                    <div className="flex items-center gap-2">
                      <StatusDot
                        tone={
                          job.status === "succeeded"
                            ? "success"
                            : job.status === "failed"
                              ? "danger"
                              : job.status === "running"
                                ? "info"
                                : job.status === "queued"
                                  ? "warning"
                                  : "neutral"
                        }
                        pulse={job.status === "running"}
                      />
                      <Badge tone={STATUS_TONE[job.status]}>
                        {STATUS_LABEL[job.status]}
                      </Badge>
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    <span className="text-[11px] font-bold uppercase tracking-[1.4px] text-[#cbcbcb]">
                      {OP_LABEL[job.op_type]}
                    </span>
                  </td>
                  <td className="py-3 pr-3 max-w-[220px]">
                    <p className="truncate text-[13px] font-semibold text-white">
                      {extractNickname(job.payload) ?? "—"}
                    </p>
                    <p className="truncate text-[11px] text-[#7c7c7c]">
                      job {job.id.slice(0, 8)}
                    </p>
                  </td>
                  <td className="py-3 pr-3 text-[13px] text-[#cbcbcb]">
                    {job.attempts} / {job.max_attempts}
                  </td>
                  <td className="py-3 pr-3 text-[12px] text-[#b3b3b3]">
                    {formatRelativeFromISO(job.updated_at)}
                  </td>
                  <td className="py-3 pr-6 max-w-[280px]">
                    <JobResultCell job={job} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function JobResultCell({ job }: { job: JobResponse }) {
  if (job.error) {
    return (
      <span className="line-clamp-2 text-[12px] text-[#f3727f]">
        {job.error}
      </span>
    );
  }
  if (job.status === "succeeded") {
    return (
      <span className="text-[12px] font-semibold text-[#1ed760]">
        {summariseResult(job.result)}
      </span>
    );
  }
  if (job.status === "running") {
    return (
      <span className="text-[12px] text-[#b3b3b3]">
        {summariseResult(job.result) || "실행 중…"}
      </span>
    );
  }
  return (
    <span className="text-[12px] text-[#7c7c7c]">
      {summariseResult(job.result) || "—"}
    </span>
  );
}

function extractNickname(payload: Record<string, unknown> | null): string | null {
  if (!payload) return null;
  const value = payload["nickname"];
  if (typeof value === "string" && value.length > 0) return value;
  return null;
}

function summariseResult(result: Record<string, unknown> | null): string {
  if (!result) return "";
  const message = result["message"];
  if (typeof message === "string") return message;
  const status = result["status"];
  if (typeof status === "string") return status;
  const summary = result["summary"];
  if (typeof summary === "string") return summary;
  return "완료";
}

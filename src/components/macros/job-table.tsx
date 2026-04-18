"use client";

import { StatusDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelativeFromISO } from "@/lib/format";
import type { JobResponse, MacroOpType, MacroStatus } from "@/types/api";

const STATUS_LABEL: Record<MacroStatus, string> = {
  queued: "대기",
  running: "실행중",
  succeeded: "성공",
  failed: "실패",
  cancelled: "취소",
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
  snipe_rename: "닉변 스나이프",
  snipe_character: "캐릭터 스나이프",
  snipe_badname: "미통디 스나이프",
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
    <section className="rounded-md border border-[#272727] bg-[#181818]">
      <header className="flex items-center justify-between gap-3 border-b border-[#272727] px-5 py-3">
        <div>
          <h2 className="text-[15px] font-semibold text-white">내 작업</h2>
          <p className="mt-0.5 text-[12px] text-[#7c7c7c]">
            {jobs.length}개
            {lastUpdated
              ? ` · ${new Date(lastUpdated).toLocaleTimeString("ko-KR")}`
              : ""}
          </p>
        </div>
        {onRefresh ? (
          <Button
            variant="secondary"
            size="sm"
            loading={refreshing}
            onClick={onRefresh}
          >
            새로고침
          </Button>
        ) : null}
      </header>
      <div className="overflow-x-auto">
        {loading ? (
          <div className="px-5 py-8 text-center text-[13px] text-[#7c7c7c]">
            불러오는 중…
          </div>
        ) : jobs.length === 0 ? (
          <div className="px-5 py-8 text-center text-[13px] text-[#7c7c7c]">
            아직 제출한 매크로가 없습니다.
          </div>
        ) : (
          <table className="w-full min-w-[680px] text-left">
            <thead>
              <tr className="text-[12px] text-[#7c7c7c]">
                <th className="py-2 pl-5 pr-3 font-normal">상태</th>
                <th className="py-2 pr-3 font-normal">유형</th>
                <th className="py-2 pr-3 font-normal">대상</th>
                <th className="py-2 pr-3 font-normal">시도</th>
                <th className="py-2 pr-3 font-normal">업데이트</th>
                <th className="py-2 pr-5 font-normal">결과</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#272727]">
              {jobs.map((job) => (
                <tr key={job.id} className="align-top">
                  <td className="py-2.5 pl-5 pr-3">
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
                      />
                      <span className={`text-[12px] ${STATUS_COLOR[job.status]}`}>
                        {STATUS_LABEL[job.status]}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 text-[13px] text-[#cbcbcb]">
                    {OP_LABEL[job.op_type]}
                  </td>
                  <td className="py-2.5 pr-3 max-w-[220px]">
                    <p className="truncate text-[13px] text-white">
                      {extractNickname(job.payload) ?? "—"}
                    </p>
                    <p className="truncate text-[11px] text-[#7c7c7c]">
                      {job.id.slice(0, 8)}
                    </p>
                  </td>
                  <td className="py-2.5 pr-3 text-[13px] text-[#cbcbcb]">
                    {job.attempts} / {job.max_attempts}
                  </td>
                  <td className="py-2.5 pr-3 text-[12px] text-[#b3b3b3]">
                    {formatRelativeFromISO(job.updated_at)}
                  </td>
                  <td className="py-2.5 pr-5 max-w-[280px]">
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
      <span className="text-[12px] text-[#1ed760]">
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

"use client";

import { useCallback, useEffect, useState } from "react";

import { StatusDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, SectionCard } from "@/components/ui/card";
import { ApiError, api } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import type { ModeStatus, ServerStatus } from "@/types/api";

export default function ServersPage() {
  const [servers, setServers] = useState<ServerStatus | null>(null);
  const [modes, setModes] = useState<ModeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchOnce = async () => {
      try {
        const [s, m] = await Promise.all([
          api.getServerStatus(),
          api.getModeStatus(),
        ]);
        if (cancelled) return;
        setServers(s);
        setModes(m);
        setLastUpdated(Date.now());
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError ? err.message : "서버 상태 조회 실패",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };
    void fetchOnce();
    const timer = window.setInterval(() => {
      void fetchOnce();
    }, 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [refreshTick]);

  const load = useCallback(() => {
    setRefreshing(true);
    setRefreshTick((t) => t + 1);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[20px] font-semibold text-white">서버 상태</h1>
        <div className="flex items-center gap-3 text-[12px] text-[#7c7c7c]">
          {lastUpdated ? (
            <span>
              업데이트 {new Date(lastUpdated).toLocaleTimeString("ko-KR")}
            </span>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            loading={refreshing}
            onClick={load}
          >
            새로고침
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-[8px] border border-[#f3727f]/30 bg-[#f3727f]/10 px-4 py-3 text-[13px] text-[#f3727f]">
          {error}
        </div>
      ) : null}

      {loading && !servers && !modes ? (
        <div className="rounded-[8px] bg-[#181818] p-8 text-center text-[13px] text-[#b3b3b3]">
          불러오는 중…
        </div>
      ) : null}

      {servers ? <ServerBoard data={servers} /> : null}
      {modes ? <ModeBoard data={modes} /> : null}
    </div>
  );
}

function ServerBoard({ data }: { data: ServerStatus }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric
          label="점검"
          value={data.under_maintenance ? "점검중" : "정상"}
          tone={data.under_maintenance ? "warning" : "success"}
        />
        <Metric
          label="입장 가능"
          value={`${formatNumber(data.joinable_count)}개`}
        />
        <Metric
          label="공지"
          value={`${formatNumber(data.inspection_messages.length)}건`}
        />
      </div>

      {data.inspection_messages.length ? (
        <SectionCard title="공지">
          <ul className="flex flex-col gap-2">
            {data.inspection_messages.map((msg, idx) => (
              <li
                key={idx}
                className="rounded border border-[#ffa42b]/20 bg-[#ffa42b]/5 px-3 py-2 text-[13px] text-[#ffa42b]"
              >
                {msg}
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      <SectionCard title="서버" bodyClassName="p-0">
        {data.servers.length === 0 ? (
          <EmptyState title="서버 정보가 없습니다" />
        ) : (
          <ul className="divide-y divide-[#272727]">
            {data.servers.map((server) => (
              <li
                key={server.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div className="flex items-center gap-3">
                  <StatusDot tone={server.joinable ? "success" : "danger"} />
                  <div>
                    <p className="text-[14px] text-white">{server.name}</p>
                    <p className="text-[12px] text-[#7c7c7c]">
                      {server.region ? `${server.region} · ` : ""}
                      {server.status}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[12px] text-[#7c7c7c]">
                  {typeof server.population === "number" ? (
                    <span>
                      {formatNumber(server.population)}
                      {typeof server.capacity === "number"
                        ? ` / ${formatNumber(server.capacity)}`
                        : ""}
                    </span>
                  ) : null}
                  <span
                    className={
                      server.joinable ? "text-[#1ed760]" : "text-[#f3727f]"
                    }
                  >
                    {server.joinable ? "가능" : "불가"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

function ModeBoard({ data }: { data: ModeStatus }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="전체 모드" value={`${formatNumber(data.total)}개`} />
        <Metric
          label="차단"
          value={`${formatNumber(data.blocked_count)}개`}
          tone="danger"
        />
        <Metric
          label="점검"
          value={`${formatNumber(data.inspected_count)}개`}
          tone="warning"
        />
      </div>

      <SectionCard title="모드" bodyClassName="p-0">
        {data.modes.length === 0 ? (
          <EmptyState title="모드 정보가 없습니다" />
        ) : (
          <ul className="divide-y divide-[#272727]">
            {data.modes.map((mode) => (
              <li
                key={mode.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div className="flex items-center gap-3">
                  <StatusDot
                    tone={
                      mode.blocked
                        ? "danger"
                        : mode.inspected
                          ? "warning"
                          : "success"
                    }
                  />
                  <div>
                    <p className="text-[14px] text-white">{mode.name}</p>
                    {mode.note ? (
                      <p className="text-[12px] text-[#7c7c7c]">{mode.note}</p>
                    ) : null}
                  </div>
                </div>
                <span
                  className={`text-[12px] ${
                    mode.blocked
                      ? "text-[#f3727f]"
                      : mode.inspected
                        ? "text-[#ffa42b]"
                        : "text-[#1ed760]"
                  }`}
                >
                  {mode.blocked ? "차단" : mode.inspected ? "점검" : "정상"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "success" | "danger" | "warning" | "neutral";
}) {
  const accent =
    tone === "success"
      ? "text-[#1ed760]"
      : tone === "danger"
        ? "text-[#f3727f]"
        : tone === "warning"
          ? "text-[#ffa42b]"
          : "text-white";
  return (
    <div className="rounded-[8px] bg-[#181818] px-4 py-3">
      <p className="text-[12px] text-[#b3b3b3]">{label}</p>
      <p className={`mt-0.5 text-[18px] font-semibold ${accent}`}>{value}</p>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";

import { Badge, StatusDot } from "@/components/ui/badge";
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
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[1.8px] text-[#1ed760]">
            SERVER STATUS
          </p>
          <h1 className="text-[32px] font-bold tracking-tight text-white sm:text-[40px]">
            서버 & 모드 현황
          </h1>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-[#b3b3b3]">
            서버 점검 공지와 모드 차단 상태를 20초 간격으로 자동 갱신합니다.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated ? (
            <span className="text-[12px] text-[#b3b3b3]">
              마지막 업데이트 {new Date(lastUpdated).toLocaleTimeString("ko-KR")}
            </span>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            uppercase
            loading={refreshing}
            onClick={load}
          >
            다시 불러오기
          </Button>
        </div>
      </header>

      {error ? (
        <div className="rounded-xl border border-[#f3727f]/30 bg-[#f3727f]/10 px-5 py-4 text-[13px] font-semibold text-[#f3727f]">
          {error}
        </div>
      ) : null}

      {loading && !servers && !modes ? (
        <div className="rounded-xl bg-[#181818] p-10 text-center text-[14px] text-[#b3b3b3]">
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
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric
          label="점검 상태"
          value={data.under_maintenance ? "점검중" : "정상"}
          tone={data.under_maintenance ? "warning" : "success"}
        />
        <Metric
          label="입장 가능 서버"
          value={`${formatNumber(data.joinable_count)}개`}
          tone="info"
        />
        <Metric
          label="공지 메시지"
          value={`${formatNumber(data.inspection_messages.length)}건`}
          tone="neutral"
        />
      </div>

      {data.inspection_messages.length ? (
        <SectionCard title="점검 / 공지 메시지">
          <ul className="flex flex-col gap-3">
            {data.inspection_messages.map((msg, idx) => (
              <li
                key={idx}
                className="rounded-lg border border-[#ffa42b]/20 bg-[#ffa42b]/5 px-4 py-3 text-[13px] text-[#ffa42b]"
              >
                {msg}
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      <SectionCard title="서버 목록" bodyClassName="p-0">
        {data.servers.length === 0 ? (
          <EmptyState title="서버 정보가 없습니다" />
        ) : (
          <ul className="divide-y divide-[#272727]">
            {data.servers.map((server) => (
              <li
                key={server.id}
                className="flex items-center justify-between gap-3 px-6 py-4"
              >
                <div className="flex items-center gap-3">
                  <StatusDot
                    tone={server.joinable ? "success" : "danger"}
                    pulse={server.joinable}
                  />
                  <div>
                    <p className="text-[14px] font-bold text-white">
                      {server.name}
                    </p>
                    <p className="text-[12px] text-[#b3b3b3]">
                      {server.region ? `${server.region} · ` : ""}
                      상태 {server.status}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {typeof server.population === "number" ? (
                    <Badge tone="mute">
                      {formatNumber(server.population)}
                      {typeof server.capacity === "number"
                        ? ` / ${formatNumber(server.capacity)}`
                        : ""}
                    </Badge>
                  ) : null}
                  <Badge tone={server.joinable ? "success" : "danger"}>
                    {server.joinable ? "입장 가능" : "입장 불가"}
                  </Badge>
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
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric
          label="전체 모드"
          value={`${formatNumber(data.total)}개`}
          tone="neutral"
        />
        <Metric
          label="차단된 모드"
          value={`${formatNumber(data.blocked_count)}개`}
          tone="danger"
        />
        <Metric
          label="점검중 모드"
          value={`${formatNumber(data.inspected_count)}개`}
          tone="warning"
        />
      </div>

      <SectionCard title="모드별 상태" bodyClassName="p-0">
        {data.modes.length === 0 ? (
          <EmptyState title="모드 정보가 없습니다" />
        ) : (
          <ul className="divide-y divide-[#272727]">
            {data.modes.map((mode) => (
              <li
                key={mode.id}
                className="flex items-center justify-between gap-3 px-6 py-4"
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
                    <p className="text-[14px] font-bold text-white">
                      {mode.name}
                    </p>
                    {mode.note ? (
                      <p className="text-[12px] text-[#b3b3b3]">{mode.note}</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex gap-2">
                  {mode.blocked ? <Badge tone="danger">차단</Badge> : null}
                  {mode.inspected ? (
                    <Badge tone="warning">점검중</Badge>
                  ) : null}
                  {!mode.blocked && !mode.inspected ? (
                    <Badge tone="success">정상</Badge>
                  ) : null}
                </div>
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
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "danger" | "warning" | "info" | "neutral";
}) {
  const accent =
    tone === "success"
      ? "text-[#1ed760]"
      : tone === "danger"
        ? "text-[#f3727f]"
        : tone === "warning"
          ? "text-[#ffa42b]"
          : tone === "info"
            ? "text-[#539df5]"
            : "text-white";
  return (
    <div className="rounded-xl bg-[#181818] px-5 py-4">
      <p className="text-[11px] font-bold uppercase tracking-[1.6px] text-[#7c7c7c]">
        {label}
      </p>
      <p className={`mt-1 text-[24px] font-bold ${accent}`}>{value}</p>
    </div>
  );
}

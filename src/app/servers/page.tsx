"use client";

import { useCallback, useEffect, useState } from "react";

import { StatusDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    <div className="flex flex-col gap-12 pb-20">
      <div className="flex flex-col gap-4">
        <h1 className="text-[48px] font-bold tracking-tight text-white md:text-[64px]">서버 상태</h1>
        <div className="flex items-center gap-4 text-[13px] font-bold text-[#b3b3b3]">
          {lastUpdated ? (
            <span>
              업데이트 {new Date(lastUpdated).toLocaleTimeString("ko-KR")}
            </span>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            loading={refreshing}
            onClick={load}
          >
            새로고침
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-full border border-[#f3727f]/30 bg-[#f3727f]/10 px-6 py-3 text-[14px] font-bold text-[#f3727f]">
          {error}
        </div>
      ) : null}

      {loading && !servers && !modes ? (
        <div className="py-20 text-center text-[15px] font-bold text-[#b3b3b3]">
          서버 상태를 불러오는 중입니다...
        </div>
      ) : null}

      {servers ? <ServerBoard data={servers} /> : null}
      {modes ? <ModeBoard data={modes} /> : null}
    </div>
  );
}

function ServerBoard({ data }: { data: ServerStatus }) {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-wrap items-center gap-x-8 gap-y-4 text-[14px] text-[#b3b3b3]">
        <span className={data.under_maintenance ? "font-bold text-[#ffa42b]" : "font-bold text-[#1ed760]"}>
          {data.under_maintenance ? "점검 중" : "전체 정상"}
        </span>
        <span className="font-bold text-white">입장 가능 {formatNumber(data.joinable_count)}개</span>
        {data.inspection_messages.length > 0 && (
          <span className="font-bold text-white">공지 {data.inspection_messages.length}건</span>
        )}
      </section>

      {data.inspection_messages.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[20px] font-bold text-white">공지</h2>
          <ul className="flex flex-col gap-2">
            {data.inspection_messages.map((msg, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-[14px] font-bold text-[#ffa42b]"
              >
                <span className="mt-0.5">⚠️</span>
                <span>{msg}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-6">
        <h2 className="text-[20px] font-bold text-white">서버 리스트</h2>
        {data.servers.length === 0 ? (
          <div className="py-10 text-center text-[14px] font-bold text-[#7c7c7c]">
            서버 정보가 없습니다.
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="flex items-center gap-4 px-4 py-2 text-[12px] font-bold uppercase tracking-[1.4px] text-[#b3b3b3]">
              <div className="flex-1">이름</div>
              <div className="hidden w-32 text-right md:block">상태</div>
              <div className="w-24 text-right">인원</div>
            </div>
            <div className="mb-2 h-[1px] w-full bg-[#272727]" />
            <div className="flex flex-col gap-1">
              {data.servers.map((server) => (
                <ServerRow key={server.server_id} server={server} />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function ServerRow({ server }: { server: import("@/types/api").ServerEntry }) {
  const entries = Object.entries(server.raw);
  return (
    <div className="group flex flex-col justify-center rounded-[6px] px-4 py-3 transition-colors hover:bg-[#1f1f1f]">
      <div className="flex items-center gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <StatusDot tone={server.joinable ? "success" : "danger"} />
          <div className="flex flex-col">
            <span className="truncate text-[15px] font-bold text-white transition-colors group-hover:text-[#1ed760]">
              {server.name}
            </span>
            <span className="truncate text-[12px] text-[#7c7c7c]">
              {server.server_id} · {server.ip}:{server.port}
            </span>
          </div>
        </div>
        <div className="hidden w-32 flex-col items-end pt-0.5 text-[13px] md:flex">
          <span
            className={`font-bold ${
              server.joinable ? "text-[#1ed760]" : "text-[#f3727f]"
            }`}
          >
            {server.joinable ? "입장 가능" : "입장 불가"}
          </span>
        </div>
        <div className="w-24 pt-0.5 text-right text-[13px] text-[#b3b3b3]">
          {formatNumber(server.user_count)}
          {server.max_user_count > 0 ? ` / ${formatNumber(server.max_user_count)}` : ""}
        </div>
      </div>
      {entries.length > 0 || (server.inspection && server.under_inspection) ? (
        <div className="ml-[28px] mt-2 flex flex-col gap-2">
          {entries.length > 0 ? (
            <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-0.5 text-[11px]">
              {entries.map(([key, value]) => (
                <RawField key={key} name={key} value={value} />
              ))}
            </dl>
          ) : null}
          {server.inspection && server.under_inspection ? (
            <p className="text-[12px] font-bold text-[#ffa42b]">
              공지: {server.inspection}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function RawField({ name, value }: { name: string; value: unknown }) {
  const rendered =
    value === null || value === undefined
      ? "—"
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  return (
    <>
      <dt className="text-[#7c7c7c]">{name}</dt>
      <dd className="break-all font-mono text-[#cbcbcb]">{rendered}</dd>
    </>
  );
}

function ModeBoard({ data }: { data: ModeStatus }) {
  return (
    <div className="mt-6 flex flex-col gap-10">
      <section className="flex flex-wrap items-center gap-x-8 gap-y-4 text-[14px] text-[#b3b3b3]">
        <span className="font-bold text-white">전체 모드 {formatNumber(data.total)}개</span>
        {data.blocked_count > 0 && <span className="font-bold text-[#f3727f]">차단 {formatNumber(data.blocked_count)}개</span>}
        {data.inspected_count > 0 && <span className="font-bold text-[#ffa42b]">점검 {formatNumber(data.inspected_count)}개</span>}
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-[20px] font-bold text-white">모드 리스트</h2>
        {data.modes.length === 0 ? (
          <div className="py-10 text-center text-[14px] font-bold text-[#7c7c7c]">
            모드 정보가 없습니다.
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="flex items-center gap-4 px-4 py-2 text-[12px] font-bold uppercase tracking-[1.4px] text-[#b3b3b3]">
              <div className="flex-1">이름</div>
              <div className="w-24 text-right">상태</div>
            </div>
            <div className="mb-2 h-[1px] w-full bg-[#272727]" />
            <div className="flex flex-col gap-1">
              {data.modes.map((mode) => (
                <div
                  key={mode.id}
                  className="group flex items-center gap-4 rounded-[6px] px-4 py-3 transition-colors hover:bg-[#1f1f1f]"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <StatusDot
                      tone={
                        mode.blocked
                          ? "danger"
                          : mode.inspected
                            ? "warning"
                            : "success"
                      }
                    />
                    <div className="flex flex-col">
                      <span className="truncate text-[15px] font-bold text-white transition-colors group-hover:text-[#1ed760]">
                        {mode.name}
                      </span>
                      {mode.note ? (
                        <span className="truncate text-[12px] text-[#7c7c7c]">
                          {mode.note}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex w-24 justify-end text-[13px] font-bold">
                    <span
                      className={
                        mode.blocked
                          ? "text-[#f3727f]"
                          : mode.inspected
                            ? "text-[#ffa42b]"
                            : "text-[#1ed760]"
                      }
                    >
                      {mode.blocked ? "차단" : mode.inspected ? "점검" : "정상"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

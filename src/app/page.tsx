"use client";

import { useState } from "react";

import { Badge, StatusDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, SectionCard } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/input";
import { ApiError, api } from "@/lib/api";
import { formatAbsolute, formatLastLogin, formatNumber } from "@/lib/format";
import type { PlayerProfile } from "@/types/api";

type ResultState =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "result"; data: PlayerProfile; queriedAt: number }
  | { state: "error"; message: string };

export default function PlayerSearchPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<ResultState>({ state: "idle" });

  const runSearch = async () => {
    const name = query.trim();
    if (!name) return;
    setResult({ state: "loading" });
    try {
      const data = await api.getPlayer(name);
      setResult({ state: "result", data, queriedAt: Date.now() });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 404
            ? "해당 닉네임의 유저를 찾을 수 없습니다."
            : err.message
          : "검색에 실패했습니다.";
      setResult({ state: "error", message });
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="text-[12px] font-bold uppercase tracking-[1.8px] text-[#1ed760]">
          USER SEARCH
        </p>
        <h1 className="text-[32px] font-bold tracking-tight text-white sm:text-[40px]">
          유저 프로필 조회
        </h1>
        <p className="max-w-xl text-[15px] leading-relaxed text-[#b3b3b3]">
          닉네임 하나로 레벨, 접속 상태, 클랜 소속, 채팅 프로필을 한 번에
          확인할 수 있습니다.
        </p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          runSearch();
        }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <div className="flex-1">
          <SearchInput
            aria-label="닉네임"
            placeholder="닉네임을 입력하세요"
            value={query}
            spellCheck={false}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          size="lg"
          uppercase
          disabled={!query.trim() || result.state === "loading"}
          loading={result.state === "loading"}
        >
          검색
        </Button>
      </form>

      <ResultView state={result} />
    </div>
  );
}

function ResultView({ state }: { state: ResultState }) {
  if (state.state === "idle") {
    return (
      <EmptyState
        title="닉네임을 검색해 주세요"
        description="검색 결과에는 접속 기록, 클랜, 챗 프로필이 포함됩니다."
      />
    );
  }
  if (state.state === "loading") {
    return (
      <div className="rounded-xl bg-[#181818] p-10 text-center text-[14px] text-[#b3b3b3]">
        조회 중…
      </div>
    );
  }
  if (state.state === "error") {
    return (
      <div className="rounded-xl border border-[#f3727f]/30 bg-[#f3727f]/10 px-6 py-5 text-[14px] font-semibold text-[#f3727f]">
        {state.message}
      </div>
    );
  }
  return <PlayerCard player={state.data} queriedAt={state.queriedAt} />;
}

function PlayerCard({
  player,
  queriedAt,
}: {
  player: PlayerProfile;
  queriedAt: number;
}) {
  const last = formatLastLogin(player.last_login_ms ?? null);
  const tone =
    last.tone === "online"
      ? "success"
      : last.tone === "recent"
        ? "info"
        : last.tone === "old"
          ? "mute"
          : "mute";
  const initials = player.name.slice(0, 1).toUpperCase();
  return (
    <div className="flex flex-col gap-5">
      <section
        className="relative overflow-hidden rounded-2xl p-8 sm:p-10"
        style={{
          background:
            "linear-gradient(135deg, #1d4b2d 0%, #181818 55%, #181818 100%)",
          boxShadow: "var(--shadow-medium)",
        }}
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-[#121212] text-[36px] font-bold uppercase text-[#1ed760] shadow-[0_8px_32px_rgba(0,0,0,0.5)] sm:h-28 sm:w-28">
              {initials}
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[1.8px] text-[#cbcbcb]">
                PROFILE
              </span>
              <h2 className="text-[36px] font-bold leading-none tracking-tight text-white sm:text-[48px]">
                {player.name}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-[#b3b3b3]">
                <Badge tone="success">Lv. {player.level}</Badge>
                {player.clan ? (
                  <Badge tone="neutral">소속 {player.clan}</Badge>
                ) : (
                  <Badge tone="mute">소속 없음</Badge>
                )}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1">
                  <StatusDot
                    tone={tone === "success" ? "success" : "info"}
                    pulse={tone === "success"}
                  />
                  {last.label}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1 text-right text-[12px] text-[#b3b3b3]">
            <span className="uppercase tracking-[1.6px] text-[#7c7c7c]">
              ACCOUNT ID
            </span>
            <span className="font-mono text-[14px] text-white">
              {formatNumber(player.account_id)}
            </span>
            <span className="mt-2 text-[11px] text-[#7c7c7c]">
              조회 시각 {new Date(queriedAt).toLocaleTimeString("ko-KR")}
            </span>
          </div>
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <SectionCard title="접속 정보">
          <dl className="flex flex-col divide-y divide-[#272727]">
            <ProfileRow
              label="마지막 접속"
              value={last.label}
              hint={formatAbsolute(player.last_login_ms ?? null)}
            />
            <ProfileRow
              label="레벨"
              value={`Lv. ${formatNumber(player.level)}`}
            />
            <ProfileRow
              label="클랜"
              value={player.clan ?? "소속 없음"}
              mute={!player.clan}
            />
          </dl>
        </SectionCard>

        <SectionCard title="채팅 · 상태">
          <dl className="flex flex-col divide-y divide-[#272727]">
            <ProfileRow
              label="STATUS MESSAGE"
              value={player.status_message ?? "—"}
              mute={!player.status_message}
            />
            <ProfileRow
              label="CHAT PROFILE"
              value={player.chat_profile ?? "—"}
              mute={!player.chat_profile}
            />
            <ProfileRow
              label="컬러 코드"
              value={player.color_code ?? "—"}
              mono
              mute={!player.color_code}
            />
          </dl>
        </SectionCard>
      </div>
    </div>
  );
}

function ProfileRow({
  label,
  value,
  hint,
  mono = false,
  mute = false,
}: {
  label: string;
  value: string;
  hint?: string;
  mono?: boolean;
  mute?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <dt className="text-[12px] font-semibold uppercase tracking-[1.4px] text-[#7c7c7c]">
        {label}
      </dt>
      <dd className="flex flex-col items-end gap-0.5 text-right">
        <span
          className={`max-w-[220px] truncate text-[14px] font-semibold ${
            mute ? "text-[#7c7c7c]" : "text-white"
          } ${mono ? "font-mono" : ""}`}
          title={value}
        >
          {value}
        </span>
        {hint ? (
          <span className="text-[11px] text-[#7c7c7c]">{hint}</span>
        ) : null}
      </dd>
    </div>
  );
}

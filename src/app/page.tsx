"use client";

import { useState } from "react";

import { StatusDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/card";
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
    <div className="flex flex-col gap-6">
      <h1 className="text-[20px] font-semibold text-white">유저 검색</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          runSearch();
        }}
        className="flex gap-2"
      >
        <div className="flex-1">
          <SearchInput
            aria-label="닉네임"
            placeholder="닉네임"
            value={query}
            spellCheck={false}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button
          type="submit"
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
    return null;
  }
  if (state.state === "loading") {
    return (
      <div className="rounded-md bg-[#181818] p-8 text-center text-[13px] text-[#b3b3b3]">
        조회 중…
      </div>
    );
  }
  if (state.state === "error") {
    return (
      <div className="rounded-md border border-[#f3727f]/30 bg-[#f3727f]/10 px-4 py-3 text-[13px] text-[#f3727f]">
        {state.message}
      </div>
    );
  }
  return <PlayerCard player={state.data} />;
}

function PlayerCard({ player }: { player: PlayerProfile }) {
  const last = formatLastLogin(player.last_login_ms ?? null);
  const online = last.tone === "online";
  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-md border border-[#272727] bg-[#181818] p-5">
        <div className="flex items-center gap-3">
          <h2 className="text-[22px] font-semibold text-white">
            {player.name}
          </h2>
          <StatusDot tone={online ? "success" : "neutral"} />
          <span className="text-[13px] text-[#b3b3b3]">{last.label}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[#b3b3b3]">
          <span>Lv.{player.level}</span>
          {player.clan ? <span>{player.clan}</span> : null}
          <span className="text-[#7c7c7c]">
            #{formatNumber(player.account_id)}
          </span>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="접속 정보">
          <dl className="flex flex-col divide-y divide-[#272727]">
            <Row
              label="마지막 접속"
              value={last.label}
              hint={formatAbsolute(player.last_login_ms ?? null)}
            />
            <Row label="레벨" value={`Lv.${formatNumber(player.level)}`} />
            <Row
              label="클랜"
              value={player.clan ?? "없음"}
              mute={!player.clan}
            />
          </dl>
        </SectionCard>

        <SectionCard title="프로필">
          <dl className="flex flex-col divide-y divide-[#272727]">
            <Row
              label="상태 메시지"
              value={player.status_message ?? "—"}
              mute={!player.status_message}
            />
            <Row
              label="채팅 프로필"
              value={player.chat_profile ?? "—"}
              mute={!player.chat_profile}
            />
            <Row
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

function Row({
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
    <div className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <dt className="text-[13px] text-[#b3b3b3]">{label}</dt>
      <dd className="flex flex-col items-end gap-0.5 text-right">
        <span
          className={`max-w-[240px] truncate text-[13px] ${
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

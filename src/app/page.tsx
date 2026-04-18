"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
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
    <div className="flex flex-col gap-10 pb-20">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runSearch();
        }}
        className="flex w-full max-w-2xl gap-3"
      >
        <div className="flex-1">
          <SearchInput
            aria-label="어떤 유저를 찾고 싶으신가요?"
            placeholder="어떤 유저를 찾고 싶으신가요?"
            value={query}
            spellCheck={false}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          size="md"
          disabled={!query.trim() || result.state === "loading"}
          loading={result.state === "loading"}
          className="px-8"
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
      <div className="py-20 text-center text-[15px] font-bold text-[#b3b3b3]">
        유저 정보를 검색하는 중입니다...
      </div>
    );
  }
  if (state.state === "error") {
    return (
      <div className="py-20 text-center text-[15px] font-bold text-[#f3727f]">
        {state.message}
      </div>
    );
  }
  return <PlayerCard player={state.data} />;
}

function PlayerCard({ player }: { player: PlayerProfile }) {
  const last = formatLastLogin(player.last_login_ms ?? null);
  const online = last.tone === "online";
  const clanName = player.clan?.name ?? null;

  return (
    <div className="flex flex-col gap-12">
      {/* Hero Section */}
      <section className="flex flex-col gap-4 px-2">
        <div className="flex flex-col gap-2">
          {online ? (
            <span className="text-[14px] font-bold uppercase tracking-[1.4px] text-[#1ed760]">
              온라인
            </span>
          ) : (
            <span className="text-[14px] font-bold uppercase tracking-[1.4px] text-[#7c7c7c]">
              오프라인
            </span>
          )}
          <h1 className="text-[48px] font-bold leading-tight tracking-tight text-white md:text-[64px]">
            {player.name}
          </h1>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-[14px] text-[#b3b3b3]">
          <span className="font-bold text-white">Lv. {formatNumber(player.level)}</span>
          {clanName ? <span className="font-medium text-[#e5e5e5]">{clanName} 클랜</span> : null}
          <span className="text-[#7c7c7c]">ID: {formatNumber(player.account_id)}</span>
          <span className="text-[#7c7c7c]">접속: {last.label}</span>
        </div>
      </section>

      {/* Dense Info Lists */}
      <div className="flex flex-col gap-8">
        <InfoSection title="상세 정보">
          <Row
            label="마지막 접속"
            value={last.label}
            hint={formatAbsolute(player.last_login_ms ?? null)}
          />
          <Row label="레벨" value={`Lv. ${formatNumber(player.level)}`} />
          <Row label="클랜" value={clanName ?? "없음"} mute={!clanName} />
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
        </InfoSection>
      </div>
    </div>
  );
}

function InfoSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-4 px-4 text-[18px] font-bold text-white">{title}</h2>
      <div className="flex flex-col">{children}</div>
    </section>
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
    <div className="group flex items-center justify-between gap-4 rounded-[6px] px-4 py-3 transition-colors hover:bg-[#1f1f1f]">
      <span className="text-[14px] text-[#b3b3b3]">{label}</span>
      <div className="flex flex-col items-end text-right">
        <span
          className={`max-w-[300px] truncate text-[14px] ${
            mute ? "text-[#7c7c7c]" : "text-white"
          } ${mono ? "font-mono" : "font-medium"}`}
          title={value}
        >
          {value}
        </span>
        {hint ? (
          <span className="text-[12px] text-[#7c7c7c]">{hint}</span>
        ) : null}
      </div>
    </div>
  );
}

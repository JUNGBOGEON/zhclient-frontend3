"use client";

import { useState } from "react";

import { Badge, StatusDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, SectionCard, Skeleton } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/input";
import { ApiError, api } from "@/lib/api";
import { formatLastLogin, formatNumber } from "@/lib/format";
import type { ClanDetail, ClanSummary } from "@/types/api";

type SearchState =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "result"; query: string; total: number; clans: ClanSummary[] }
  | { state: "error"; message: string };

type DetailState =
  | { state: "idle" }
  | { state: "loading"; publicCode: string }
  | { state: "ready"; data: ClanDetail }
  | { state: "error"; message: string };

export default function ClansPage() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState>({ state: "idle" });
  const [detail, setDetail] = useState<DetailState>({ state: "idle" });

  const runSearch = async () => {
    const name = query.trim();
    if (!name) return;
    setSearch({ state: "loading" });
    setDetail({ state: "idle" });
    try {
      const res = await api.searchClans(name);
      setSearch({
        state: "result",
        query: res.query,
        total: res.total,
        clans: res.clans,
      });
      if (res.clans.length === 1) {
        void openClan(res.clans[0]);
      }
    } catch (err) {
      setSearch({
        state: "error",
        message: err instanceof ApiError ? err.message : "클랜 검색 실패",
      });
    }
  };

  const openClan = async (clan: ClanSummary) => {
    setDetail({ state: "loading", publicCode: clan.public_code });
    try {
      const data = await api.getClan(clan.public_code);
      setDetail({ state: "ready", data });
    } catch (err) {
      setDetail({
        state: "error",
        message:
          err instanceof ApiError ? err.message : "클랜 상세 조회 실패",
      });
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="text-[12px] font-bold uppercase tracking-[1.8px] text-[#1ed760]">
          CLAN DIRECTORY
        </p>
        <h1 className="text-[32px] font-bold tracking-tight text-white sm:text-[40px]">
          클랜 검색
        </h1>
        <p className="max-w-xl text-[15px] leading-relaxed text-[#b3b3b3]">
          클랜 이름으로 검색한 뒤 상세 카드에서 가입 현황과 멤버 목록을
          확인하세요.
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
            aria-label="클랜 이름"
            placeholder="클랜 이름을 입력하세요"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          size="lg"
          uppercase
          disabled={!query.trim() || search.state === "loading"}
          loading={search.state === "loading"}
        >
          검색
        </Button>
      </form>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <ClanResults
          search={search}
          onSelect={openClan}
          selectedCode={
            detail.state === "loading"
              ? detail.publicCode
              : detail.state === "ready"
                ? detail.data.public_code
                : null
          }
        />
        <ClanDetailView detail={detail} />
      </div>
    </div>
  );
}

function ClanResults({
  search,
  onSelect,
  selectedCode,
}: {
  search: SearchState;
  onSelect: (clan: ClanSummary) => void;
  selectedCode: string | null;
}) {
  if (search.state === "idle") {
    return (
      <SectionCard
        title="검색 결과"
        description="검색 대기 중"
      >
        <EmptyState title="클랜 이름을 입력해 주세요" />
      </SectionCard>
    );
  }
  if (search.state === "loading") {
    return (
      <SectionCard title="검색 중">
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-16 w-full" />
          ))}
        </div>
      </SectionCard>
    );
  }
  if (search.state === "error") {
    return (
      <SectionCard title="검색 실패">
        <p className="text-[14px] text-[#f3727f]">{search.message}</p>
      </SectionCard>
    );
  }
  if (search.clans.length === 0) {
    return (
      <SectionCard
        title="검색 결과"
        description={`"${search.query}"에 해당하는 클랜이 없습니다.`}
      >
        <EmptyState
          title="검색 결과 없음"
          description="철자를 확인하거나 다른 키워드로 시도해 보세요."
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="검색 결과"
      description={`${formatNumber(search.total)}개 발견 · ${search.query}`}
      bodyClassName="p-0"
    >
      <ul className="divide-y divide-[#272727]">
        {search.clans.map((clan) => {
          const active = clan.public_code === selectedCode;
          return (
            <li key={clan.public_code}>
              <button
                type="button"
                onClick={() => onSelect(clan)}
                className={`flex w-full items-center gap-4 px-6 py-4 text-left transition-colors ${
                  active
                    ? "bg-[#1f1f1f]"
                    : "hover:bg-[#1f1f1f]/80"
                }`}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#121212] text-[16px] font-bold text-[#1ed760]">
                  {clan.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[15px] font-bold text-white">
                      {clan.name}
                    </p>
                    <Badge tone="neutral">Lv. {clan.level}</Badge>
                  </div>
                  <p className="text-[12px] text-[#b3b3b3]">
                    코드 {clan.public_code} · 멤버{" "}
                    {formatNumber(clan.member_count)}
                    {clan.max_members
                      ? ` / ${formatNumber(clan.max_members)}`
                      : ""}
                  </p>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                  className={`shrink-0 ${
                    active ? "text-[#1ed760]" : "text-[#7c7c7c]"
                  }`}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

function ClanDetailView({ detail }: { detail: DetailState }) {
  if (detail.state === "idle") {
    return (
      <SectionCard title="클랜 상세">
        <EmptyState
          title="클랜을 선택해 주세요"
          description="검색 결과에서 클랜을 클릭하면 상세 정보가 나타납니다."
        />
      </SectionCard>
    );
  }
  if (detail.state === "loading") {
    return (
      <SectionCard title="클랜 상세">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </SectionCard>
    );
  }
  if (detail.state === "error") {
    return (
      <SectionCard title="클랜 상세">
        <p className="text-[14px] text-[#f3727f]">{detail.message}</p>
      </SectionCard>
    );
  }
  const { data } = detail;
  return (
    <div className="flex flex-col gap-5">
      <section
        className="overflow-hidden rounded-2xl p-8"
        style={{
          background:
            "linear-gradient(135deg, #1d4b2d 0%, #181818 55%, #181818 100%)",
          boxShadow: "var(--shadow-medium)",
        }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="success">CLAN</Badge>
          <Badge tone="neutral">Lv. {data.level}</Badge>
          {data.owner_name ? (
            <Badge tone="mute">오너 · {data.owner_name}</Badge>
          ) : null}
        </div>
        <h2 className="mt-3 text-[36px] font-bold tracking-tight text-white sm:text-[44px]">
          {data.name}
        </h2>
        <p className="mt-1 text-[13px] uppercase tracking-[1.6px] text-[#7c7c7c]">
          {data.public_code}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4 text-[14px] text-[#b3b3b3] sm:grid-cols-3">
          <Metric
            label="멤버 수"
            value={`${formatNumber(data.member_count)}${
              data.max_members ? ` / ${formatNumber(data.max_members)}` : ""
            }`}
          />
          <Metric label="클랜 레벨" value={formatNumber(data.level)} />
          <Metric
            label="온라인"
            value={`${data.members.filter((m) => isOnline(m.last_login_ms)).length}명`}
          />
        </div>
        {data.introduction ? (
          <p className="mt-5 rounded-lg bg-black/25 px-4 py-3 text-[13px] leading-relaxed text-[#cbcbcb]">
            {data.introduction}
          </p>
        ) : null}
      </section>

      <SectionCard
        title="멤버 목록"
        description={`${formatNumber(data.members.length)}명`}
        bodyClassName="p-0"
      >
        <ul className="divide-y divide-[#272727]">
          {data.members.map((member) => {
            const last = formatLastLogin(member.last_login_ms ?? null);
            const online = last.tone === "online";
            return (
              <li
                key={member.account_id}
                className="flex items-center gap-3 px-6 py-3"
              >
                <StatusDot
                  tone={online ? "success" : "neutral"}
                  pulse={online}
                />
                <div className="flex flex-1 items-center justify-between gap-3">
                  <div>
                    <p className="text-[14px] font-bold text-white">
                      {member.name}
                    </p>
                    <p className="text-[12px] text-[#b3b3b3]">
                      Lv. {formatNumber(member.level)}
                      {member.role ? ` · ${member.role}` : ""}
                    </p>
                  </div>
                  <span
                    className={`text-[12px] ${
                      online ? "text-[#1ed760]" : "text-[#7c7c7c]"
                    }`}
                  >
                    {last.label}
                  </span>
                </div>
              </li>
            );
          })}
          {data.members.length === 0 ? (
            <li className="px-6 py-8 text-center text-[13px] text-[#b3b3b3]">
              멤버가 없습니다.
            </li>
          ) : null}
        </ul>
      </SectionCard>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-[1.6px] text-[#7c7c7c]">
        {label}
      </span>
      <span className="text-[20px] font-bold text-white">{value}</span>
    </div>
  );
}

function isOnline(ms: number | undefined | null) {
  if (!ms) return false;
  const diff = Date.now() - ms;
  return diff >= 0 && diff < 5 * 60 * 1000;
}

"use client";

import { useState } from "react";

import { StatusDot } from "@/components/ui/badge";
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
    <div className="flex flex-col gap-6">
      <h1 className="text-[20px] font-semibold text-white">클랜 검색</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          runSearch();
        }}
        className="flex gap-2"
      >
        <div className="flex-1">
          <SearchInput
            aria-label="클랜 이름"
            placeholder="클랜 이름"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          disabled={!query.trim() || search.state === "loading"}
          loading={search.state === "loading"}
        >
          검색
        </Button>
      </form>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
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
      <SectionCard title="검색 결과">
        <p className="text-[13px] text-[#7c7c7c]">검색어를 입력하세요.</p>
      </SectionCard>
    );
  }
  if (search.state === "loading") {
    return (
      <SectionCard title="검색 중">
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-14 w-full" />
          ))}
        </div>
      </SectionCard>
    );
  }
  if (search.state === "error") {
    return (
      <SectionCard title="검색 결과">
        <p className="text-[13px] text-[#f3727f]">{search.message}</p>
      </SectionCard>
    );
  }
  if (search.clans.length === 0) {
    return (
      <SectionCard title="검색 결과">
        <EmptyState
          title="결과 없음"
          description={`"${search.query}"에 해당하는 클랜이 없습니다.`}
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="검색 결과"
      description={`${formatNumber(search.total)}개`}
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
                className={`flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors ${
                  active ? "bg-[#1f1f1f]" : "hover:bg-[#1f1f1f]/60"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] text-white">
                    {clan.name}
                    <span className="ml-2 text-[12px] text-[#7c7c7c]">
                      Lv.{clan.level}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[12px] text-[#7c7c7c]">
                    {clan.public_code} · 멤버{" "}
                    {formatNumber(clan.member_count)}
                    {clan.max_members
                      ? ` / ${formatNumber(clan.max_members)}`
                      : ""}
                  </p>
                </div>
                {active ? (
                  <span className="text-[11px] text-[#1ed760]">선택됨</span>
                ) : null}
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
        <p className="text-[13px] text-[#7c7c7c]">
          결과에서 클랜을 선택하면 상세가 표시됩니다.
        </p>
      </SectionCard>
    );
  }
  if (detail.state === "loading") {
    return (
      <SectionCard title="클랜 상세">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </SectionCard>
    );
  }
  if (detail.state === "error") {
    return (
      <SectionCard title="클랜 상세">
        <p className="text-[13px] text-[#f3727f]">{detail.message}</p>
      </SectionCard>
    );
  }
  const { data } = detail;
  const onlineCount = data.members.filter((m) =>
    isOnline(m.last_login_ms),
  ).length;
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-[8px] bg-[#181818] p-5">
        <h2 className="text-[20px] font-semibold text-white">{data.name}</h2>
        <p className="mt-0.5 text-[12px] text-[#7c7c7c]">{data.public_code}</p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-[#b3b3b3]">
          <span>Lv.{data.level}</span>
          <span>
            멤버 {formatNumber(data.member_count)}
            {data.max_members ? ` / ${formatNumber(data.max_members)}` : ""}
          </span>
          <span>온라인 {onlineCount}명</span>
          {data.owner_name ? (
            <span className="text-[#7c7c7c]">오너 {data.owner_name}</span>
          ) : null}
        </div>
        {data.introduction ? (
          <p className="mt-4 text-[13px] leading-relaxed text-[#cbcbcb]">
            {data.introduction}
          </p>
        ) : null}
      </section>

      <SectionCard
        title="멤버"
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
                className="flex items-center gap-3 px-5 py-2.5"
              >
                <StatusDot tone={online ? "success" : "neutral"} />
                <div className="flex flex-1 items-center justify-between gap-3">
                  <div>
                    <p className="text-[14px] text-white">{member.name}</p>
                    <p className="text-[12px] text-[#7c7c7c]">
                      Lv.{formatNumber(member.level)}
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
            <li className="px-5 py-6 text-center text-[13px] text-[#7c7c7c]">
              멤버가 없습니다.
            </li>
          ) : null}
        </ul>
      </SectionCard>
    </div>
  );
}

function isOnline(ms: number | undefined | null) {
  if (!ms) return false;
  const diff = Date.now() - ms;
  return diff >= 0 && diff < 5 * 60 * 1000;
}

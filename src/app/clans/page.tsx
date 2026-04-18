"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/input";
import { ApiError, api } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import type { ClanDetail, ClanSummary } from "@/types/api";

type SearchState =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "result"; query: string; total: number; clans: ClanSummary[]; page: number }
  | { state: "error"; message: string };

type DetailState =
  | { state: "idle" }
  | { state: "loading"; publicCode: number; summaryName: string }
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
        page: 1,
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
    setDetail({ state: "loading", publicCode: clan.public_code, summaryName: clan.name });
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

  const goBack = () => {
    setDetail({ state: "idle" });
  };

  if (detail.state !== "idle") {
    return (
      <div className="flex flex-col gap-6 pb-20">
        <div>
          <button
            onClick={goBack}
            className="group flex items-center gap-2 rounded-full bg-transparent px-2 py-2 text-[14px] font-bold text-[#b3b3b3] transition-colors hover:text-white"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-translate-x-1">
              <path d="m15 18-6-6 6-6"/>
            </svg>
            검색 결과로 돌아가기
          </button>
        </div>
        <ClanDetailView detail={detail} />
      </div>
    );
  }

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
            aria-label="어떤 클랜을 찾고 싶으신가요?"
            placeholder="어떤 클랜을 찾고 싶으신가요?"
            value={query}
            spellCheck={false}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          size="md"
          disabled={!query.trim() || search.state === "loading"}
          loading={search.state === "loading"}
          className="px-8"
        >
          검색
        </Button>
      </form>

      <ClanResults
        search={search}
        onSelect={openClan}
        onChangePage={(newPage) => {
          if (search.state === "result") {
            setSearch({ ...search, page: newPage });
          }
        }}
      />
    </div>
  );
}

function ClanResults({
  search,
  onSelect,
  onChangePage,
}: {
  search: SearchState;
  onSelect: (clan: ClanSummary) => void;
  onChangePage: (page: number) => void;
}) {
  if (search.state === "idle") {
    return null;
  }
  if (search.state === "loading") {
    return (
      <div className="py-20 text-center text-[15px] font-bold text-[#b3b3b3]">
        클랜을 검색하는 중입니다...
      </div>
    );
  }
  if (search.state === "error") {
    return (
      <div className="py-20 text-center text-[15px] font-bold text-[#f3727f]">
        {search.message}
      </div>
    );
  }
  if (search.clans.length === 0) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-[24px] font-bold text-white">결과를 찾을 수 없습니다</h2>
        <p className="mt-2 text-[14px] text-[#b3b3b3]">&quot;{search.query}&quot;에 해당하는 클랜이 없습니다.</p>
      </div>
    );
  }

  const PAGE_SIZE = 10;
  const totalPages = Math.ceil(search.clans.length / PAGE_SIZE);
  const startIdx = (search.page - 1) * PAGE_SIZE;
  const currentClans = search.clans.slice(startIdx, startIdx + PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-[20px] font-bold text-white">검색 결과 ({formatNumber(search.total)})</h2>
      
      <div className="flex flex-col">
        <div className="flex items-center gap-4 px-4 py-2 text-[12px] font-bold uppercase tracking-[1.4px] text-[#b3b3b3]">
          <div className="w-8 text-right">#</div>
          <div className="flex-1">클랜명</div>
          <div className="hidden w-32 md:block">클랜 코드</div>
          <div className="w-20 text-right">멤버 수</div>
        </div>
        <div className="mb-2 h-[1px] w-full bg-[#272727]" />

        <div className="flex flex-col gap-1">
          {currentClans.map((clan, idx) => (
            <button
              key={clan.public_code}
              type="button"
              onClick={() => onSelect(clan)}
              className="group flex items-center gap-4 rounded-[6px] px-4 py-3 text-left transition-colors hover:bg-[#1f1f1f]"
            >
              <div className="w-8 text-right text-[14px] text-[#b3b3b3]">
                {startIdx + idx + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold text-white transition-colors group-hover:text-[#1ed760]">
                  {clan.name}
                  {clan.master_name ? (
                    <span className="ml-2 text-[12px] font-normal text-[#b3b3b3] group-hover:text-white/70">
                      오너 {clan.master_name}
                    </span>
                  ) : null}
                </p>
              </div>
              <div className="hidden w-32 text-[14px] text-[#b3b3b3] md:block">
                {clan.public_code}
              </div>
              <div className="w-20 text-right text-[14px] text-[#b3b3b3]">
                {formatNumber(clan.curr_players)}
                {clan.max_players ? ` / ${formatNumber(clan.max_players)}` : ""}
              </div>
            </button>
          ))}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <Button
            variant="ghost"
            onClick={() => onChangePage(search.page - 1)}
            disabled={search.page === 1}
          >
            이전
          </Button>
          <span className="text-[13px] font-bold text-[#b3b3b3]">
            {search.page} / {totalPages}
          </span>
          <Button
            variant="ghost"
            onClick={() => onChangePage(search.page + 1)}
            disabled={search.page === totalPages}
          >
            다음
          </Button>
        </div>
      )}
    </div>
  );
}

function ClanDetailView({ detail }: { detail: DetailState }) {
  if (detail.state === "idle") return null;
  if (detail.state === "loading") {
    return (
      <div className="py-20 text-center text-[15px] font-bold text-[#b3b3b3]">
        {detail.summaryName} 클랜 정보를 불러오는 중입니다...
      </div>
    );
  }
  if (detail.state === "error") {
    return (
      <div className="py-20 text-center text-[15px] font-bold text-[#f3727f]">
        {detail.message}
      </div>
    );
  }
  
  const { data } = detail;

  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col gap-4 px-2">
        <div className="flex flex-col gap-2">
          <span className="text-[14px] font-bold uppercase tracking-[1.4px] text-[#7c7c7c]">
            클랜
          </span>
          <h1 className="text-[48px] font-bold leading-tight tracking-tight text-white md:text-[64px] lg:text-[80px]">
            {data.name}
          </h1>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-[14px] text-[#b3b3b3]">
          <span className="text-[#7c7c7c]">코드 {data.public_code}</span>
          <span className="text-white">
            멤버 {formatNumber(data.active_members)}
            {data.max_members ? ` / ${formatNumber(data.max_members)}` : ""}
          </span>
          {data.master_name ? (
            <span className="font-bold text-white">오너 {data.master_name}</span>
          ) : null}
          {data.game_money > 0 ? (
            <span className="text-[#7c7c7c]">
              자금 {formatNumber(data.game_money)}
            </span>
          ) : null}
          {data.created_at_ms > 0 ? (
            <span className="text-[#7c7c7c]">
              창설 {formatDate(data.created_at_ms)}
            </span>
          ) : null}
        </div>
        {data.description ? (
          <p className="mt-4 max-w-3xl whitespace-pre-wrap text-[14px] leading-relaxed text-[#b3b3b3]">
            {data.description}
          </p>
        ) : null}
      </section>

      <div className="flex flex-col gap-6">
        <h2 className="text-[20px] font-bold text-white">멤버 목록</h2>

        <div className="flex flex-col">
          <div className="flex items-center gap-4 px-4 py-2 text-[12px] font-bold uppercase tracking-[1.4px] text-[#b3b3b3]">
            <div className="w-8 text-right">#</div>
            <div className="flex-1">이름</div>
            <div className="w-20 text-right">레벨</div>
          </div>
          <div className="mb-2 h-[1px] w-full bg-[#272727]" />

          <div className="flex flex-col gap-1">
            {data.members.map((member, idx) => (
              <div
                key={member.account_id}
                className="group flex items-center gap-4 rounded-[6px] px-4 py-3 transition-colors hover:bg-[#1f1f1f]"
              >
                <div className="w-8 text-right text-[14px] text-[#b3b3b3]">
                  {idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold text-white">
                    {member.name}
                  </p>
                </div>
                <div className="w-20 text-right text-[13px] text-[#b3b3b3]">
                  Lv.{formatNumber(member.level)}
                </div>
              </div>
            ))}
            {data.members.length === 0 ? (
              <div className="px-4 py-6 text-center text-[14px] text-[#7c7c7c]">
                멤버가 없습니다.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

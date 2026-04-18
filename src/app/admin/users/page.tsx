"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard, Skeleton } from "@/components/ui/card";
import { ApiError, api } from "@/lib/api";
import type { User, UserStatus } from "@/types/api";

type Filter = "all" | UserStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "pending", label: "승인 대기" },
  { key: "approved", label: "승인됨" },
  { key: "banned", label: "차단" },
  { key: "all", label: "전체" },
];

export default function AdminUsersPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("pending");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<number | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!isAdmin) {
      return;
    }
    let cancelled = false;
    const fetchUsers = async () => {
      try {
        const list = await api.adminListUsers(
          filter === "all" ? undefined : filter,
        );
        if (cancelled) return;
        setUsers(list);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setLoading(false);
        toast.show(
          err instanceof ApiError ? err.message : "유저 조회 실패",
          "error",
        );
      }
    };
    void fetchUsers();
    return () => {
      cancelled = true;
    };
  }, [filter, isAdmin, refreshTick, toast]);

  const triggerReload = useCallback(() => {
    setLoading(true);
    setRefreshTick((t) => t + 1);
  }, []);

  const approve = async (target: User) => {
    setActingId(target.id);
    try {
      await api.adminApproveUser(target.id);
      toast.show(`${target.name} 승인됨`, "success");
      triggerReload();
    } catch (err) {
      toast.show(
        err instanceof ApiError ? err.message : "승인 실패",
        "error",
      );
    } finally {
      setActingId(null);
    }
  };

  const ban = async (target: User) => {
    setActingId(target.id);
    try {
      await api.adminBanUser(target.id);
      toast.show(`${target.name} 차단됨`, "info");
      triggerReload();
    } catch (err) {
      toast.show(
        err instanceof ApiError ? err.message : "차단 실패",
        "error",
      );
    } finally {
      setActingId(null);
    }
  };

  const summary = useMemo(() => {
    const counts = { pending: 0, approved: 0, banned: 0 };
    users.forEach((u) => {
      counts[u.status] = (counts[u.status] ?? 0) + 1;
    });
    return counts;
  }, [users]);

  if (!user) {
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="rounded-xl bg-[#181818] p-10 text-center">
        <p className="text-[16px] font-bold text-white">접근 권한이 없습니다.</p>
        <p className="mt-2 text-[13px] text-[#b3b3b3]">
          관리자 계정으로 로그인해야 이 페이지에 접근할 수 있습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="text-[12px] font-bold uppercase tracking-[1.8px] text-[#1ed760]">
          ADMIN
        </p>
        <h1 className="text-[32px] font-bold tracking-tight text-white sm:text-[40px]">
          유저 관리
        </h1>
        <p className="max-w-xl text-[15px] leading-relaxed text-[#b3b3b3]">
          승인 대기, 승인, 차단 상태별로 유저를 필터링하고 상태를 변경할 수
          있습니다.
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const on = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-4 py-2 text-[13px] font-bold transition-colors ${
                  on
                    ? "bg-[#1ed760] text-black"
                    : "bg-[#1f1f1f] text-[#b3b3b3] hover:text-white"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <Button
          variant="secondary"
          size="sm"
          uppercase
          onClick={triggerReload}
          loading={loading}
        >
          새로고침
        </Button>
      </div>

      {filter === "all" ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="승인 대기" value={summary.pending} tone="warning" />
          <Metric label="승인" value={summary.approved} tone="success" />
          <Metric label="차단" value={summary.banned} tone="danger" />
        </div>
      ) : null}

      <SectionCard
        title="유저 목록"
        description={`${users.length}명`}
        bodyClassName="p-0"
      >
        {loading ? (
          <div className="flex flex-col gap-3 p-6">
            {Array.from({ length: 3 }).map((_, idx) => (
              <Skeleton key={idx} className="h-16 w-full" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="px-6 py-10 text-center text-[14px] text-[#b3b3b3]">
            조건에 해당하는 유저가 없습니다.
          </div>
        ) : (
          <ul className="divide-y divide-[#272727]">
            {users.map((target) => {
              const acting = actingId === target.id;
              return (
                <li
                  key={target.id}
                  className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center"
                >
                  <div className="flex flex-1 items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#121212] text-[14px] font-bold text-[#1ed760]">
                      {target.picture_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={target.picture_url}
                          alt=""
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        target.name.slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-white">
                        {target.name}
                        {target.role === "admin" ? (
                          <span className="ml-2 rounded-full bg-[#1ed760]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[1.2px] text-[#1ed760]">
                            admin
                          </span>
                        ) : null}
                      </p>
                      <p className="text-[12px] text-[#b3b3b3]">
                        {target.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      tone={
                        target.status === "approved"
                          ? "success"
                          : target.status === "pending"
                            ? "warning"
                            : "danger"
                      }
                    >
                      {target.status === "approved"
                        ? "APPROVED"
                        : target.status === "pending"
                          ? "PENDING"
                          : "BANNED"}
                    </Badge>
                    {target.status !== "approved" ? (
                      <Button
                        size="sm"
                        onClick={() => approve(target)}
                        loading={acting}
                      >
                        승인
                      </Button>
                    ) : null}
                    {target.status !== "banned" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => ban(target)}
                        loading={acting}
                      >
                        차단
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
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
  value: number;
  tone: "success" | "danger" | "warning";
}) {
  const accent =
    tone === "success"
      ? "text-[#1ed760]"
      : tone === "warning"
        ? "text-[#ffa42b]"
        : "text-[#f3727f]";
  return (
    <div className="rounded-xl bg-[#181818] px-5 py-4">
      <p className="text-[11px] font-bold uppercase tracking-[1.6px] text-[#7c7c7c]">
        {label}
      </p>
      <p className={`mt-1 text-[28px] font-bold ${accent}`}>
        {value.toLocaleString("ko-KR")}
      </p>
    </div>
  );
}

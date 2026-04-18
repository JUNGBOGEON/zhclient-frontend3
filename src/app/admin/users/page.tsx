"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { SectionCard, Skeleton } from "@/components/ui/card";
import { ApiError, api } from "@/lib/api";
import type { User, UserStatus } from "@/types/api";

type Filter = "all" | UserStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "pending", label: "대기" },
  { key: "approved", label: "승인" },
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
    if (!isAdmin) return;
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
      toast.show(err instanceof ApiError ? err.message : "승인 실패", "error");
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
      toast.show(err instanceof ApiError ? err.message : "차단 실패", "error");
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

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="rounded-[8px] bg-[#181818] p-8 text-center">
        <p className="text-[15px] text-white">접근 권한이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[20px] font-semibold text-white">유저 관리</h1>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => {
            const on = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`rounded px-3 py-1.5 text-[13px] transition-colors ${
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
          onClick={triggerReload}
          loading={loading}
        >
          새로고침
        </Button>
      </div>

      {filter === "all" ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="대기" value={summary.pending} tone="warning" />
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
          <div className="flex flex-col gap-2 p-5">
            {Array.from({ length: 3 }).map((_, idx) => (
              <Skeleton key={idx} className="h-14 w-full" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="px-5 py-8 text-center text-[13px] text-[#7c7c7c]">
            조건에 해당하는 유저가 없습니다.
          </div>
        ) : (
          <ul className="divide-y divide-[#272727]">
            {users.map((target) => {
              const acting = actingId === target.id;
              const statusLabel =
                target.status === "approved"
                  ? "승인"
                  : target.status === "pending"
                    ? "대기"
                    : "차단";
              const statusColor =
                target.status === "approved"
                  ? "text-[#1ed760]"
                  : target.status === "pending"
                    ? "text-[#ffa42b]"
                    : "text-[#f3727f]";
              return (
                <li
                  key={target.id}
                  className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center"
                >
                  <div className="flex flex-1 items-center gap-3">
                    {target.picture_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={target.picture_url}
                        alt=""
                        className="h-9 w-9 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-[#272727]" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-[14px] text-white">
                        {target.name}
                        {target.role === "admin" ? (
                          <span className="ml-2 text-[11px] text-[#1ed760]">
                            관리자
                          </span>
                        ) : null}
                      </p>
                      <p className="truncate text-[12px] text-[#7c7c7c]">
                        {target.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[12px] ${statusColor}`}>
                      {statusLabel}
                    </span>
                    {target.status !== "approved" ? (
                      <Button size="sm" onClick={() => approve(target)} loading={acting}>
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
    <div className="rounded-[8px] bg-[#181818] px-4 py-3">
      <p className="text-[12px] text-[#b3b3b3]">{label}</p>
      <p className={`mt-0.5 text-[20px] font-semibold ${accent}`}>
        {value.toLocaleString("ko-KR")}
      </p>
    </div>
  );
}

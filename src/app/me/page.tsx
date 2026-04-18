"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/card";
import { ApiError, api } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import type { PlayerWallet } from "@/types/api";

export default function MePage() {
  const { user, logout } = useAuth();
  const [wallet, setWallet] = useState<PlayerWallet | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletTick, setWalletTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchWallet = async () => {
      try {
        const data = await api.getMyWallet();
        if (cancelled) return;
        setWallet(data);
        setWalletError(null);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setWallet(null);
          setWalletError("연동된 캐릭터가 없습니다.");
        } else {
          setWalletError(
            err instanceof ApiError ? err.message : "지갑 조회 실패",
          );
        }
      } finally {
        if (!cancelled) setWalletLoading(false);
      }
    };
    void fetchWallet();
    return () => {
      cancelled = true;
    };
  }, [walletTick]);

  const loadWallet = useCallback(() => {
    setWalletLoading(true);
    setWalletTick((t) => t + 1);
  }, []);

  if (!user) return null;

  const statusLabel =
    user.status === "approved"
      ? "승인됨"
      : user.status === "pending"
        ? "대기"
        : "차단";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[20px] font-semibold text-white">내 프로필</h1>

      <section className="flex items-center gap-4 rounded-md border border-[#272727] bg-[#181818] p-5">
        {user.picture_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.picture_url}
            alt=""
            className="h-14 w-14 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : null}
        <div className="flex-1">
          <h2 className="text-[18px] font-semibold text-white">{user.name}</h2>
          <p className="text-[13px] text-[#b3b3b3]">{user.email}</p>
          <p className="mt-1 text-[12px] text-[#7c7c7c]">
            {statusLabel}
            {user.role === "admin" ? " · 관리자" : ""}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={logout}>
          로그아웃
        </Button>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="계정 정보">
          <dl className="flex flex-col divide-y divide-[#272727]">
            <Row label="사용자 ID" value={formatNumber(user.id)} mono />
            <Row label="권한" value={user.role === "admin" ? "관리자" : "일반"} />
            <Row label="상태" value={statusLabel} />
            {user.approved_at ? (
              <Row label="승인 일시" value={formatDateTime(user.approved_at)} mono />
            ) : null}
            {user.created_at ? (
              <Row label="가입 일시" value={formatDateTime(user.created_at)} mono />
            ) : null}
          </dl>
        </SectionCard>

        <SectionCard
          title="캐릭터 자원"
          action={
            <Button
              variant="secondary"
              size="sm"
              loading={walletLoading}
              onClick={loadWallet}
            >
              새로고침
            </Button>
          }
        >
          {walletError ? (
            <p className="text-[13px] text-[#7c7c7c]">{walletError}</p>
          ) : wallet ? (
            <dl className="flex flex-col divide-y divide-[#272727]">
              <Row label="캐릭터" value={wallet.slave_name} />
              <Row label="레벨" value={`Lv.${formatNumber(wallet.slave_level)}`} />
              <Row label="미네랄" value={formatNumber(wallet.mineral)} tone="success" />
              <Row label="가스" value={formatNumber(wallet.gas)} tone="info" />
            </dl>
          ) : (
            <p className="text-[13px] text-[#7c7c7c]">
              연동 후 미네랄/가스 자원이 표시됩니다.
            </p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono = false,
  tone,
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "success" | "info";
}) {
  const color =
    tone === "success"
      ? "text-[#1ed760]"
      : tone === "info"
        ? "text-[#539df5]"
        : "text-white";
  return (
    <div className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
      <dt className="text-[13px] text-[#b3b3b3]">{label}</dt>
      <dd className={`text-[13px] ${color} ${mono ? "font-mono" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function formatDateTime(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return new Date(t).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

"use client";

import { useEffect, useMemo, useState } from "react";

import {
  AccountManager,
  useStoredAccounts,
} from "@/components/macros/account-manager";
import { ActiveJobsCard, HistoryJobsCard } from "@/components/macros/job-table";
import { SnipeControls } from "@/components/macros/snipe-controls";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/input";
import { ApiError, api } from "@/lib/api";
import { generateIdempotencyKey } from "@/lib/format";
import type {
  AccountKind,
  JobResponse,
  MacroOpType,
  StoredAccount,
} from "@/types/api";

type TabKey = "snipe_badname" | "snipe_rename" | "snipe_character";

type TabDef = {
  key: TabKey;
  title: string;
  subtitle: string;
  requires: AccountKind;
  requiresSlave: boolean;
};

const TABS: TabDef[] = [
  {
    key: "snipe_badname",
    title: "미통디",
    subtitle: "미통합 계정의 닉네임을 타겟 닉으로 전환",
    requires: "non_integrated",
    requiresSlave: false,
  },
  {
    key: "snipe_rename",
    title: "닉네임 변경",
    subtitle: "통합 계정의 기존 캐릭터를 타겟 닉으로 변경",
    requires: "integrated",
    requiresSlave: true,
  },
  {
    key: "snipe_character",
    title: "캐릭터 생성",
    subtitle: "통합 계정에 타겟 닉의 새 캐릭터 생성",
    requires: "integrated",
    requiresSlave: false,
  },
];

const POLL_INTERVAL_MS = 2000;

export default function MacrosPage() {
  const toast = useToast();
  const accountsStore = useStoredAccounts();
  const { accounts } = accountsStore;
  const actions = useMemo(
    () => ({
      createAccount: accountsStore.createAccount,
      updateAccount: accountsStore.updateAccount,
      deleteAccount: accountsStore.deleteAccount,
      runCheck: accountsStore.runCheck,
    }),
    [
      accountsStore.createAccount,
      accountsStore.updateAccount,
      accountsStore.deleteAccount,
      accountsStore.runCheck,
    ],
  );
  const [activeTab, setActiveTab] = useState<TabKey>("snipe_badname");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [jobs, setJobs] = useState<JobResponse[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const hasActive = jobs.some(
    (j) => j.status === "running" || j.status === "queued",
  );

  useEffect(() => {
    let cancelled = false;
    const fetchOnce = async () => {
      try {
        const list = await api.listMyMacros();
        if (cancelled) return;
        setJobs(list);
        setLastUpdated(Date.now());
        setJobsLoading(false);
        setRefreshing(false);
      } catch {
        if (cancelled) return;
        setJobsLoading(false);
        setRefreshing(false);
      }
    };
    void fetchOnce();
    const interval = hasActive ? POLL_INTERVAL_MS : POLL_INTERVAL_MS * 2;
    const timer = window.setInterval(() => {
      void fetchOnce();
    }, interval);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [hasActive, refreshing]);

  const onManualRefresh = () => {
    setRefreshing(true);
  };

  const handleSubmitted = (job: JobResponse) => {
    setJobs((prev) => [job, ...prev.filter((p) => p.id !== job.id)]);
    toast.show(`등록됨 (${job.id.slice(0, 8)})`, "success");
  };

  return (
    <div className="flex flex-col gap-12 pb-20">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[32px] font-bold tracking-tight text-white">새 매크로 등록</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDrawerOpen(true)}
        >
          계정 관리 ({accounts.length})
        </Button>
      </div>

      <div className="flex flex-col gap-8">
        <TabBar active={activeTab} onChange={setActiveTab} />

        <MacroForm
          key={`${activeTab}-${accounts.length}`}
          tab={activeTab}
          accounts={accounts}
          onJob={handleSubmitted}
          onOpenAccounts={() => setDrawerOpen(true)}
        />
      </div>

      <div className="h-[1px] w-full bg-[#272727]" />

      <ActiveJobsCard
        jobs={jobs}
        loading={jobsLoading}
        refreshing={refreshing}
        onRefresh={onManualRefresh}
        lastUpdated={lastUpdated}
      />

      <HistoryJobsCard />

      <AccountManager
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        accounts={accounts}
        loading={accountsStore.loading}
        errorMessage={accountsStore.errorMessage}
        actions={actions}
      />
    </div>
  );
}

function TabBar({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (key: TabKey) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {TABS.map((tab) => {
        const on = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`rounded-full px-6 py-2.5 text-[14px] font-bold tracking-wide transition-colors ${
              on
                ? "bg-white text-black"
                : "bg-[#1f1f1f] text-[#b3b3b3] hover:bg-[#2a2a2a] hover:text-white"
            }`}
          >
            {tab.title}
          </button>
        );
      })}
    </div>
  );
}

function MacroForm({
  tab,
  accounts,
  onJob,
  onOpenAccounts,
}: {
  tab: TabKey;
  accounts: StoredAccount[];
  onJob: (job: JobResponse) => void;
  onOpenAccounts: () => void;
}) {
  const toast = useToast();
  const meta = useMemo(() => TABS.find((t) => t.key === tab)!, [tab]);
  const eligibleAccounts = useMemo(
    () => accounts.filter((a) => a.kind === meta.requires),
    [accounts, meta.requires],
  );

  const [accountId, setAccountId] = useState<string>(
    eligibleAccounts[0]?.id ?? "",
  );
  const [nickname, setNickname] = useState("");
  const [rate, setRate] = useState<number>(5);
  const [submitting, setSubmitting] = useState(false);

  const selected = eligibleAccounts.find((a) => a.id === accountId) ?? null;

  const onSubmit = async () => {
    if (!selected) {
      toast.show("계정을 먼저 선택하세요.", "error");
      return;
    }
    if (!nickname.trim()) {
      toast.show("닉네임을 입력해 주세요.", "error");
      return;
    }
    if (
      meta.requiresSlave &&
      (selected.selected_slave_index === undefined ||
        selected.selected_slave_index === null)
    ) {
      toast.show("계정 관리에서 캐릭터를 먼저 선택하세요.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const idempotency_key = generateIdempotencyKey();
      const base = {
        account_id: selected.id,
        nickname: nickname.trim(),
        idempotency_key,
      };
      let job: JobResponse;
      if (tab === "snipe_rename") {
        job = await api.macroSnipeRename({
          ...base,
          slave_index: selected.selected_slave_index ?? 0,
          rate_per_second: rate,
        });
      } else if (tab === "snipe_character") {
        job = await api.macroSnipeCharacter({ ...base, rate_per_second: rate });
      } else {
        job = await api.macroSnipeBadname({ ...base, rate_per_second: rate });
      }
      onJob(job);
      setNickname("");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "매크로 제출 실패";
      toast.show(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (eligibleAccounts.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 py-4">
        <h2 className="text-[20px] font-bold text-white">{meta.title}</h2>
        <p className="text-[14px] text-[#b3b3b3]">
          이 매크로에 사용할{" "}
          <span className="font-bold text-white">
            {meta.requires === "integrated" ? "통합 계정" : "미통합 계정"}
          </span>
          이 없습니다. 계정을 추가해 주세요.
        </p>
        <Button variant="secondary" size="md" onClick={onOpenAccounts}>
          계정 추가
        </Button>
      </div>
    );
  }

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-[20px] font-bold text-white">{meta.title}</h2>
        <p className="text-[14px] text-[#b3b3b3]">{meta.subtitle}</p>
      </div>

      <AccountPicker
        accounts={eligibleAccounts}
        selectedId={accountId}
        onChange={setAccountId}
        onManage={onOpenAccounts}
      />

      {meta.requiresSlave && selected ? (
        <SlaveReadout
          selected={selected}
          onManage={onOpenAccounts}
        />
      ) : null}

      <div className="flex flex-col gap-2">
        <label className="text-[14px] font-bold text-[#b3b3b3]">타겟 닉네임</label>
        <SearchInput
          aria-label="확보할 닉네임"
          placeholder="확보할 닉네임 입력"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
      </div>

      <SnipeControls rate={rate} onRateChange={setRate} />

      <div className="flex items-center justify-end gap-3 pt-4">
        <Button variant="outline" onClick={() => setNickname("")} className="px-8">
          초기화
        </Button>
        <Button size="lg" loading={submitting} onClick={onSubmit} className="px-10">
          실행
        </Button>
      </div>
    </div>
  );
}

function AccountPicker({
  accounts,
  selectedId,
  onChange,
  onManage,
}: {
  accounts: StoredAccount[];
  selectedId: string;
  onChange: (id: string) => void;
  onManage: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-bold text-[#b3b3b3]">계정 선택</span>
        <button
          type="button"
          onClick={onManage}
          className="text-[13px] font-bold text-[#1ed760] hover:underline"
        >
          계정 관리
        </button>
      </div>
      <div className="flex flex-col gap-1">
        {accounts.map((acct) => {
          const on = acct.id === selectedId;
          const verified = acct.last_check?.ok ?? false;
          return (
            <button
              key={acct.id}
              type="button"
              onClick={() => onChange(acct.id)}
              className={`group flex w-full cursor-pointer items-center justify-between rounded-[6px] px-4 py-3 text-left transition-colors ${
                on
                  ? "bg-[#1f1f1f]"
                  : "hover:bg-[#1f1f1f]/50"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`flex h-4 w-4 items-center justify-center rounded-full border-[2px] transition-colors ${on ? "border-[#1ed760]" : "border-[#7c7c7c]"}`}>
                  {on && <div className="h-2 w-2 rounded-full bg-[#1ed760]" />}
                </div>
                <div className="flex flex-col">
                  <span className={`text-[14px] font-bold transition-colors ${on ? "text-[#1ed760]" : "text-white group-hover:text-[#1ed760]"}`}>
                    {acct.label}
                  </span>
                  <span className="text-[12px] text-[#7c7c7c]">
                    {acct.game_user_id}
                  </span>
                </div>
              </div>
              <span className="text-[12px] font-bold uppercase tracking-wider">
                {verified ? (
                  <span className="text-[#1ed760]">검증됨</span>
                ) : (
                  <span className="text-[#7c7c7c]">미검사</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SlaveReadout({
  selected,
  onManage,
}: {
  selected: StoredAccount;
  onManage: () => void;
}) {
  const slaves = selected.last_check?.slaves ?? [];
  const picked = slaves.find(
    (s) => s.slave_index === selected.selected_slave_index,
  );
  return (
    <div className="flex items-center justify-between rounded-[6px] bg-[#1f1f1f] px-4 py-3">
      <div className="flex flex-col gap-1">
        <span className="text-[12px] font-bold uppercase tracking-wide text-[#7c7c7c]">대상 캐릭터</span>
        {picked ? (
          <span className="text-[14px] font-bold text-white">
            {picked.name}
            <span className="ml-2 font-normal text-[#7c7c7c]">Lv.{picked.level}</span>
          </span>
        ) : (
          <span className="text-[14px] font-bold text-[#ffa42b]">
            계정 관리에서 캐릭터 선택 필요
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onManage}
        className="text-[13px] font-bold text-[#1ed760] hover:underline"
      >
        변경
      </button>
    </div>
  );
}

export type _ = MacroOpType;

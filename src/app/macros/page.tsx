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
import { SectionCard } from "@/components/ui/card";
import { TextInput } from "@/components/ui/input";
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
    title: "닉네임변경",
    subtitle: "통합 계정의 기존 캐릭터를 타겟 닉으로 변경",
    requires: "integrated",
    requiresSlave: true,
  },
  {
    key: "snipe_character",
    title: "캐릭터생성",
    subtitle: "통합 계정에 타겟 닉의 새 캐릭터 생성",
    requires: "integrated",
    requiresSlave: false,
  },
];

const POLL_INTERVAL_MS = 2000;

export default function MacrosPage() {
  const toast = useToast();
  const { accounts, setAccounts } = useStoredAccounts();
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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[20px] font-semibold text-white">매크로</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDrawerOpen(true)}
        >
          계정 관리 ({accounts.length})
        </Button>
      </div>

      <TabBar active={activeTab} onChange={setActiveTab} />

      <MacroForm
        key={`${activeTab}-${accounts.length}`}
        tab={activeTab}
        accounts={accounts}
        onJob={handleSubmitted}
        onOpenAccounts={() => setDrawerOpen(true)}
      />

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
        onAccountsChange={setAccounts}
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
    <div className="flex flex-wrap gap-1 border-b border-[#272727]">
      {TABS.map((tab) => {
        const on = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`border-b-2 px-4 py-2 text-[14px] transition-colors ${
              on
                ? "border-[#1ed760] text-white"
                : "border-transparent text-[#b3b3b3] hover:text-white"
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
    if (meta.requiresSlave && selected.selected_slave_index === undefined) {
      toast.show("계정 관리에서 캐릭터를 먼저 선택하세요.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const idempotency_key = generateIdempotencyKey();
      const base = {
        user_id: selected.user_id,
        password: selected.password,
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
        // snipe_badname
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
      <SectionCard title={meta.title} description={meta.subtitle}>
        <div className="flex flex-col items-start gap-3 rounded-[8px] border border-dashed border-[#2a2a2a] p-5">
          <p className="text-[13px] text-[#b3b3b3]">
            이 매크로에 사용할{" "}
            <span className="text-white">
              {meta.requires === "integrated" ? "통합 계정" : "미통합 계정"}
            </span>
            이 없습니다.
          </p>
          <Button variant="secondary" size="sm" onClick={onOpenAccounts}>
            계정 추가
          </Button>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title={meta.title} description={meta.subtitle}>
      <div className="flex flex-col gap-5">
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

        <TextInput
          label="타겟 닉네임"
          placeholder="확보할 닉네임"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />

        <SnipeControls rate={rate} onRateChange={setRate} />

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => setNickname("")}>
            초기화
          </Button>
          <Button loading={submitting} onClick={onSubmit}>
            실행
          </Button>
        </div>
      </div>
    </SectionCard>
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
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-[#b3b3b3]">계정</span>
        <button
          type="button"
          onClick={onManage}
          className="text-[12px] text-[#1ed760] hover:underline"
        >
          계정 관리
        </button>
      </div>
      <div className="flex flex-col gap-1">
        {accounts.map((acct) => {
          const on = acct.id === selectedId;
          const verified = acct.last_check?.ok ?? false;
          return (
            <label
              key={acct.id}
              className={`flex cursor-pointer items-center justify-between rounded-[8px] px-3 py-2 text-[13px] transition-colors ${
                on
                  ? "bg-[#1f1f1f] text-white"
                  : "bg-[#181818] text-[#cbcbcb] hover:bg-[#1f1f1f]"
              }`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="account-select"
                  checked={on}
                  onChange={() => onChange(acct.id)}
                  className="accent-[#1ed760]"
                />
                <span>{acct.label}</span>
                <span className="text-[11px] text-[#7c7c7c]">
                  {acct.user_id}
                </span>
              </span>
              <span className="text-[11px]">
                {verified ? (
                  <span className="text-[#1ed760]">검증됨</span>
                ) : (
                  <span className="text-[#7c7c7c]">미검사</span>
                )}
              </span>
            </label>
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
    <div className="flex items-center justify-between rounded-[8px] bg-[#181818] px-3 py-2">
      <div className="flex flex-col gap-0.5">
        <span className="text-[12px] text-[#7c7c7c]">대상 캐릭터</span>
        {picked ? (
          <span className="text-[13px] text-white">
            {picked.name}
            <span className="ml-2 text-[#7c7c7c]">Lv.{picked.level}</span>
          </span>
        ) : (
          <span className="text-[13px] text-[#ffa42b]">
            계정 관리에서 캐릭터 선택 필요
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onManage}
        className="text-[12px] text-[#1ed760] hover:underline"
      >
        변경
      </button>
    </div>
  );
}

// MacroOpType referenced for forward compat with listing endpoint.
export type _ = MacroOpType;

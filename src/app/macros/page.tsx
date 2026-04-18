"use client";

import { useEffect, useMemo, useState } from "react";

import {
  AccountManager,
  useStoredAccounts,
} from "@/components/macros/account-manager";
import {
  CREDENTIAL_MANUAL,
  CredentialFields,
} from "@/components/macros/credential-fields";
import { JobTable } from "@/components/macros/job-table";
import { SnipeControls } from "@/components/macros/snipe-controls";
import { useToast } from "@/components/providers/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/card";
import { TextInput } from "@/components/ui/input";
import { ApiError, api } from "@/lib/api";
import { generateIdempotencyKey } from "@/lib/format";
import type { JobResponse, MacroOpType } from "@/types/api";

type TabKey = MacroOpType;

type TabDef = {
  key: TabKey;
  title: string;
  subtitle: string;
  accent: string;
};

const TABS: TabDef[] = [
  {
    key: "badname",
    title: "BADNAME",
    subtitle: "욕설/금칙 닉네임 자동 전환",
    accent: "#1ed760",
  },
  {
    key: "rename",
    title: "RENAME",
    subtitle: "선택한 부캐 닉네임 변경",
    accent: "#539df5",
  },
  {
    key: "character",
    title: "CHARACTER",
    subtitle: "새 캐릭터 생성",
    accent: "#ffa42b",
  },
  {
    key: "snipe",
    title: "SNIPE",
    subtitle: "타겟 닉네임 스나이프",
    accent: "#f3727f",
  },
];

const POLL_INTERVAL_MS = 3500;

export default function MacrosPage() {
  const toast = useToast();
  const { accounts, setAccounts } = useStoredAccounts();
  const [activeTab, setActiveTab] = useState<TabKey>("badname");
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
    toast.show(`매크로 제출 완료 (${job.id.slice(0, 8)})`, "success");
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="text-[12px] font-bold uppercase tracking-[1.8px] text-[#1ed760]">
          MACRO CONSOLE
        </p>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-[32px] font-bold tracking-tight text-white sm:text-[40px]">
              매크로 실행
            </h1>
            <p className="max-w-xl text-[15px] leading-relaxed text-[#b3b3b3]">
              저장된 계정을 선택하거나 직접 입력해 네 가지 매크로를 실행할 수
              있습니다. 모든 작업은 백엔드 큐에 등록된 뒤 비동기로 처리됩니다.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              uppercase
              onClick={() => setDrawerOpen(true)}
            >
              저장된 계정 ({accounts.length})
            </Button>
          </div>
        </div>
      </header>

      <TabBar active={activeTab} onChange={setActiveTab} />

      <MacroForm
        key={`${activeTab}-${accounts.length > 0 ? accounts[0].id : "manual"}`}
        tab={activeTab}
        accounts={accounts}
        onJob={handleSubmitted}
      />

      <JobTable
        jobs={jobs}
        loading={jobsLoading}
        refreshing={refreshing}
        onRefresh={onManualRefresh}
        lastUpdated={lastUpdated}
      />

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
    <div className="flex flex-wrap gap-2">
      {TABS.map((tab) => {
        const on = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`group flex min-w-[160px] flex-col items-start gap-1 rounded-2xl px-5 py-4 text-left transition-colors ${
              on
                ? "bg-[#1f1f1f]"
                : "bg-[#181818] hover:bg-[#1f1f1f]"
            }`}
            style={{
              borderLeft: on
                ? `4px solid ${tab.accent}`
                : "4px solid transparent",
            }}
          >
            <span className="text-[13px] font-bold uppercase tracking-[1.8px] text-white">
              {tab.title}
            </span>
            <span className="text-[12px] text-[#b3b3b3]">{tab.subtitle}</span>
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
}: {
  tab: TabKey;
  accounts: { id: string; user_id: string; password: string; slave_index: number; label: string; created_at: string }[];
  onJob: (job: JobResponse) => void;
}) {
  const toast = useToast();
  const initialAccount = accounts[0];
  const [selectedId, setSelectedId] = useState<string>(
    initialAccount ? initialAccount.id : CREDENTIAL_MANUAL,
  );
  const [userId, setUserId] = useState(initialAccount?.user_id ?? "");
  const [password, setPassword] = useState(initialAccount?.password ?? "");
  const [nickname, setNickname] = useState("");
  const [slaveIndex, setSlaveIndex] = useState<number>(
    initialAccount?.slave_index ?? 0,
  );
  const [rate, setRate] = useState<number>(5);
  const [duration, setDuration] = useState<number>(30 * 60);
  const [submitting, setSubmitting] = useState(false);
  const [submittedJob, setSubmittedJob] = useState<JobResponse | null>(null);

  const showSlaveIndex = tab === "rename" || tab === "snipe";

  const formMeta = useMemo(() => TABS.find((t) => t.key === tab)!, [tab]);

  const onSubmit = async () => {
    if (!userId.trim() || !password) {
      toast.show("User ID와 비밀번호가 필요합니다.", "error");
      return;
    }
    if (!nickname.trim()) {
      toast.show("닉네임을 입력해 주세요.", "error");
      return;
    }
    setSubmitting(true);
    setSubmittedJob(null);
    try {
      const idempotency_key = generateIdempotencyKey();
      const basePayload = {
        user_id: userId.trim(),
        password,
        nickname: nickname.trim(),
        idempotency_key,
      };
      let job: JobResponse;
      if (tab === "badname") {
        job = await api.macroBadname(basePayload);
      } else if (tab === "character") {
        job = await api.macroCharacter(basePayload);
      } else if (tab === "rename") {
        job = await api.macroRename({
          ...basePayload,
          slave_index: slaveIndex,
        });
      } else {
        job = await api.macroSnipe({
          ...basePayload,
          slave_index: slaveIndex,
          rate_per_second: rate,
          max_duration_seconds: duration,
        });
      }
      setSubmittedJob(job);
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

  return (
    <SectionCard
      title={
        <span className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: formMeta.accent }}
          />
          {formMeta.title}
        </span>
      }
      description={formMeta.subtitle}
    >
      <div className="flex flex-col gap-6">
        <CredentialFields
          accounts={accounts}
          selectedId={selectedId}
          onSelectedIdChange={setSelectedId}
          userId={userId}
          onUserIdChange={setUserId}
          password={password}
          onPasswordChange={setPassword}
          slaveIndex={slaveIndex}
          onSlaveIndexChange={setSlaveIndex}
          showSlaveIndex={showSlaveIndex}
        />

        <TextInput
          label="닉네임"
          placeholder="타겟 닉네임을 입력하세요"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />

        {tab === "snipe" ? (
          <SnipeControls
            rate={rate}
            onRateChange={setRate}
            duration={duration}
            onDurationChange={setDuration}
          />
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] text-[#b3b3b3]">
            모든 요청은 idempotency key 와 함께 전송됩니다. 동일한 요청은 중복
            실행되지 않습니다.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setNickname("");
                setSubmittedJob(null);
              }}
            >
              초기화
            </Button>
            <Button
              uppercase
              size="lg"
              loading={submitting}
              onClick={onSubmit}
            >
              {formMeta.title} 실행
            </Button>
          </div>
        </div>

        {submittedJob ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#1ed760]/30 bg-[#1ed760]/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <Badge tone="success">QUEUED</Badge>
              <p className="text-[13px] font-semibold text-white">
                작업 {submittedJob.id.slice(0, 8)} 이(가) 큐에 등록되었습니다.
              </p>
            </div>
            <p className="text-[12px] text-[#b3b3b3]">
              아래 목록에서 진행 상태를 확인할 수 있습니다.
            </p>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}

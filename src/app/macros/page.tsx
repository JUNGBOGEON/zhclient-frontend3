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
import { SlavePicker } from "@/components/macros/slave-picker";
import { SnipeControls } from "@/components/macros/snipe-controls";
import { useToast } from "@/components/providers/toast-provider";
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
};

const TABS: TabDef[] = [
  { key: "badname", title: "미통디", subtitle: "욕설/금칙 닉네임 자동 전환" },
  {
    key: "snipe_badname",
    title: "미통디 전용 스나이프",
    subtitle: "타겟 닉네임 열리면 미통디 전환",
  },
  { key: "rename", title: "닉변", subtitle: "선택한 부캐 닉네임 변경" },
  {
    key: "snipe_rename",
    title: "닉변 전용 스나이프",
    subtitle: "타겟 닉네임 열리면 부캐 닉변",
  },
  { key: "character", title: "캐릭터", subtitle: "새 캐릭터 생성" },
  {
    key: "snipe_character",
    title: "캐릭터 전용 스나이프",
    subtitle: "타겟 닉네임 열리면 캐릭터 생성",
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
          저장된 계정 ({accounts.length})
        </Button>
      </div>

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
}: {
  tab: TabKey;
  accounts: { id: string; user_id: string; password: string; label: string; created_at: string }[];
  onJob: (job: JobResponse) => void;
}) {
  const toast = useToast();
  const initialAccount = accounts[0];
  const [selectedId, setSelectedId] = useState<string>(
    initialAccount ? initialAccount.id : CREDENTIAL_MANUAL,
  );
  const [userId, setUserIdState] = useState(initialAccount?.user_id ?? "");
  const [password, setPasswordState] = useState(initialAccount?.password ?? "");
  const [nickname, setNickname] = useState("");
  const [rate, setRate] = useState<number>(5);
  const [slaveIndex, setSlaveIndex] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Credentials can change via manual edit or saved-account selection.
  // Clear the probed slave whenever either changes so we never submit a
  // slave_index from a previous account.
  const setUserId = (value: string) => {
    setUserIdState(value);
    setSlaveIndex(null);
  };
  const setPassword = (value: string) => {
    setPasswordState(value);
    setSlaveIndex(null);
  };

  const formMeta = useMemo(() => TABS.find((t) => t.key === tab)!, [tab]);
  const needsSlave = tab === "rename" || tab === "snipe_rename";
  const isSnipe =
    tab === "snipe_rename" ||
    tab === "snipe_character" ||
    tab === "snipe_badname";

  const onSubmit = async () => {
    if (!userId.trim() || !password) {
      toast.show("User ID와 비밀번호가 필요합니다.", "error");
      return;
    }
    if (!nickname.trim()) {
      toast.show("닉네임을 입력해 주세요.", "error");
      return;
    }
    if (needsSlave && slaveIndex === null) {
      toast.show("대상 캐릭터를 먼저 선택하세요.", "error");
      return;
    }
    setSubmitting(true);
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
          slave_index: slaveIndex ?? 0,
        });
      } else if (tab === "snipe_rename") {
        job = await api.macroSnipeRename({
          ...basePayload,
          slave_index: slaveIndex ?? 0,
          rate_per_second: rate,
        });
      } else if (tab === "snipe_character") {
        job = await api.macroSnipeCharacter({
          ...basePayload,
          rate_per_second: rate,
        });
      } else {
        // snipe_badname
        job = await api.macroSnipeBadname({
          ...basePayload,
          rate_per_second: rate,
        });
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

  return (
    <SectionCard title={formMeta.title} description={formMeta.subtitle}>
      <div className="flex flex-col gap-5">
        <CredentialFields
          accounts={accounts}
          selectedId={selectedId}
          onSelectedIdChange={setSelectedId}
          userId={userId}
          onUserIdChange={setUserId}
          password={password}
          onPasswordChange={setPassword}
        />

        {needsSlave ? (
          <SlavePicker
            key={`${userId}|${password}`}
            userId={userId}
            password={password}
            selectedSlaveIndex={slaveIndex}
            onSelectedSlaveIndexChange={setSlaveIndex}
          />
        ) : null}

        <TextInput
          label="닉네임"
          placeholder="타겟 닉네임"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />

        {isSnipe ? (
          <SnipeControls rate={rate} onRateChange={setRate} />
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setNickname("")}
          >
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

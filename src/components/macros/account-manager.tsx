"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { PasswordInput, TextInput } from "@/components/ui/input";
import { ApiError, api } from "@/lib/api";
import {
  loadAccounts,
  newAccountId,
  removeAccount,
  saveAccounts,
  upsertAccount,
} from "@/lib/accounts";
import { formatNumber } from "@/lib/format";
import type {
  AccountCheckResponse,
  AccountKind,
  StoredAccount,
} from "@/types/api";

const CHECK_LABEL: Record<string, string> = {
  client_version: "클라 버전",
  xigncode_cookie: "XIGNCODE 쿠키",
  integrated_account: "통합 계정 여부",
  legacy_account: "미통합 계정 여부",
  account_not_banned: "계정 정지 여부",
  credentials: "아이디/비번",
  character_exists: "캐릭터 존재",
};

type AccountManagerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: StoredAccount[];
  onAccountsChange: (next: StoredAccount[]) => void;
};

export function AccountManager({
  open,
  onOpenChange,
  accounts,
  onAccountsChange,
}: AccountManagerProps) {
  if (!open) return null;
  return (
    <AccountManagerBody
      accounts={accounts}
      onOpenChange={onOpenChange}
      onAccountsChange={onAccountsChange}
    />
  );
}

function AccountManagerBody({
  accounts,
  onOpenChange,
  onAccountsChange,
}: Omit<AccountManagerProps, "open">) {
  const toast = useToast();
  const [label, setLabel] = useState("");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [kind, setKind] = useState<AccountKind>("integrated");

  const handleAdd = () => {
    if (!userId.trim() || !password) {
      toast.show("아이디와 비밀번호를 입력해 주세요.", "error");
      return;
    }
    const next: StoredAccount = {
      id: newAccountId(),
      label: label.trim() || userId.trim(),
      user_id: userId.trim(),
      password,
      kind,
      created_at: new Date().toISOString(),
    };
    onAccountsChange(upsertAccount(accounts, next));
    setLabel("");
    setUserId("");
    setPassword("");
    setKind("integrated");
    toast.show(`${next.label} 저장됨`, "success");
  };

  const handleRemove = (id: string) => {
    onAccountsChange(removeAccount(accounts, id));
    toast.show("계정을 삭제했습니다.", "info");
  };

  const handleUpdate = (updated: StoredAccount) => {
    onAccountsChange(upsertAccount(accounts, updated));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-10">
      <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[8px] bg-[#181818] p-6">
        <button
          type="button"
          aria-label="닫기"
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded text-[#b3b3b3] hover:text-white"
        >
          ×
        </button>
        <h2 className="text-[17px] font-semibold text-white">계정 관리</h2>
        <p className="mt-1 text-[12px] text-[#7c7c7c]">
          비밀번호는 이 브라우저의 localStorage 에만 저장됩니다.
        </p>

        <div className="mt-5 flex flex-col gap-3">
          <TextInput
            label="라벨"
            placeholder="예: 부캐 1 / 메인"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <KindPicker value={kind} onChange={setKind} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="게임 아이디"
              placeholder="user_id"
              value={userId}
              autoComplete="off"
              onChange={(e) => setUserId(e.target.value)}
            />
            <PasswordInput
              label="비밀번호"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleAdd}>저장</Button>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-[13px] text-[#b3b3b3]">
            저장된 계정 ({accounts.length})
          </h3>
          <div className="mt-2 flex flex-col gap-3">
            {accounts.length === 0 ? (
              <p className="rounded border border-dashed border-[#2a2a2a] px-4 py-6 text-center text-[13px] text-[#7c7c7c]">
                저장된 계정이 없습니다.
              </p>
            ) : (
              accounts.map((acct) => (
                <AccountRow
                  key={acct.id}
                  account={acct}
                  onUpdate={handleUpdate}
                  onRemove={() => handleRemove(acct.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KindPicker({
  value,
  onChange,
}: {
  value: AccountKind;
  onChange: (v: AccountKind) => void;
}) {
  const opts: Array<{ key: AccountKind; label: string }> = [
    { key: "integrated", label: "통합 계정" },
    { key: "non_integrated", label: "미통합 계정" },
  ];
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[13px] text-[#b3b3b3]">계정 종류</span>
      <div className="flex gap-2">
        {opts.map((o) => {
          const on = o.key === value;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => onChange(o.key)}
              className={`flex-1 rounded-full px-3 py-2 text-[13px] transition-colors ${
                on
                  ? "bg-[#1ed760] text-black"
                  : "bg-[#1f1f1f] text-[#b3b3b3] hover:text-white"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type CheckState =
  | { kind: "idle" }
  | { kind: "running"; shown: AccountCheckResponse["checks"] }
  | {
      kind: "done";
      response: AccountCheckResponse;
    }
  | { kind: "error"; message: string };

function AccountRow({
  account,
  onUpdate,
  onRemove,
}: {
  account: StoredAccount;
  onUpdate: (a: StoredAccount) => void;
  onRemove: () => void;
}) {
  const toast = useToast();
  const initialState: CheckState = account.last_check
    ? { kind: "done", response: account.last_check }
    : { kind: "idle" };
  const [state, setState] = useState<CheckState>(initialState);

  const runCheck = useCallback(async () => {
    setState({ kind: "running", shown: [] });
    try {
      const res = await api.checkAccount({
        user_id: account.user_id,
        password: account.password,
        kind: account.kind,
      });
      // Staggered reveal to give the "Process" feel.
      for (let i = 0; i <= res.checks.length; i += 1) {
        setState({ kind: "running", shown: res.checks.slice(0, i) });
        await new Promise((r) => setTimeout(r, 160));
      }
      setState({ kind: "done", response: res });

      // Pick default slave if only one, keep existing selection if still valid.
      let nextSelected = account.selected_slave_index;
      if (res.slaves.length === 1) {
        nextSelected = res.slaves[0].slave_index;
      } else if (
        nextSelected !== undefined &&
        !res.slaves.some((s) => s.slave_index === nextSelected)
      ) {
        nextSelected = undefined;
      }
      onUpdate({
        ...account,
        last_checked_at: new Date().toISOString(),
        last_check: res,
        selected_slave_index: nextSelected,
      });
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? `${err.status || "ERR"} ${err.message}`
          : "검사 실패";
      setState({ kind: "error", message: msg });
      toast.show(msg, "error");
    }
  }, [account, onUpdate, toast]);

  const selectSlave = (slave_index: number) => {
    onUpdate({ ...account, selected_slave_index: slave_index });
  };

  const kindLabel = account.kind === "integrated" ? "통합" : "미통합";
  const kindColor =
    account.kind === "integrated" ? "text-[#1ed760]" : "text-[#ffa42b]";

  return (
    <div className="rounded-[8px] border border-[#272727] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] text-white">
            {account.label}
            <span className={`ml-2 text-[11px] ${kindColor}`}>{kindLabel}</span>
          </p>
          <p className="truncate text-[12px] text-[#7c7c7c]">
            {account.user_id}
            {account.last_checked_at
              ? ` · 최근 검사 ${formatRelative(account.last_checked_at)}`
              : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            loading={state.kind === "running"}
            onClick={runCheck}
          >
            {state.kind === "done" ? "재검사" : "검사"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onRemove}>
            삭제
          </Button>
        </div>
      </div>

      {state.kind === "running" || state.kind === "done" ? (
        <CheckList
          checks={
            state.kind === "running" ? state.shown : state.response.checks
          }
          pending={state.kind === "running"}
        />
      ) : null}

      {state.kind === "done" && state.response.slaves.length > 0 ? (
        <SlaveList
          slaves={state.response.slaves}
          selected={account.selected_slave_index ?? null}
          onSelect={selectSlave}
        />
      ) : null}

      {state.kind === "error" ? (
        <p className="mt-2 text-[12px] text-[#f3727f]">{state.message}</p>
      ) : null}
    </div>
  );
}

function CheckList({
  checks,
  pending,
}: {
  checks: AccountCheckResponse["checks"];
  pending: boolean;
}) {
  return (
    <ul className="mt-2 flex flex-col gap-0.5 text-[12px]">
      {checks.map((c) => (
        <li key={c.name} className="flex items-start gap-1.5">
          <span
            className={c.passed ? "text-[#1ed760]" : "text-[#f3727f]"}
            aria-hidden
          >
            {c.passed ? "✓" : "✗"}
          </span>
          <span className={c.passed ? "text-[#cbcbcb]" : "text-[#f3727f]"}>
            {CHECK_LABEL[c.name] ?? c.name}
          </span>
          {c.detail ? (
            <span className="ml-1 text-[#7c7c7c]">· {c.detail}</span>
          ) : null}
        </li>
      ))}
      {pending ? (
        <li className="flex items-center gap-1.5 text-[#7c7c7c]">
          <span
            aria-hidden
            style={{ animation: "zh-spin 0.75s linear infinite" }}
            className="inline-block h-3 w-3 rounded-full border-2 border-[#7c7c7c] border-t-[#1ed760]"
          />
          검사 중…
        </li>
      ) : null}
    </ul>
  );
}

function SlaveList({
  slaves,
  selected,
  onSelect,
}: {
  slaves: AccountCheckResponse["slaves"];
  selected: number | null;
  onSelect: (slave_index: number) => void;
}) {
  if (slaves.length === 1) {
    const only = slaves[0];
    return (
      <p className="mt-2 text-[12px] text-[#cbcbcb]">
        캐릭터: <span className="text-white">{only.name}</span>{" "}
        <span className="text-[#7c7c7c]">Lv.{formatNumber(only.level)}</span>
      </p>
    );
  }
  return (
    <div className="mt-2">
      <p className="text-[12px] text-[#b3b3b3]">캐릭터 선택</p>
      <div className="mt-1 flex flex-col gap-0.5">
        {slaves.map((s) => {
          const on = s.slave_index === selected;
          return (
            <label
              key={s.slave_index}
              className={`flex cursor-pointer items-center justify-between rounded px-2 py-1 text-[12px] transition-colors ${
                on
                  ? "bg-[#1f1f1f] text-white"
                  : "text-[#cbcbcb] hover:bg-[#1f1f1f]"
              }`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`slave-${s.slave_index}`}
                  checked={on}
                  onChange={() => onSelect(s.slave_index)}
                  className="accent-[#1ed760]"
                />
                <span>{s.name}</span>
              </span>
              <span className="text-[#7c7c7c]">Lv.{formatNumber(s.level)}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function formatRelative(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const days = Math.floor(hr / 24);
  return `${days}일 전`;
}

const STORAGE_EVENT = "zh_accounts_change";

const subscribers = new Set<() => void>();
const serverSnapshot: StoredAccount[] = [];
let cachedSnapshot: StoredAccount[] | null = null;

function subscribe(listener: () => void) {
  subscribers.add(listener);
  const handleStorage = () => {
    cachedSnapshot = null;
    listener();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
    window.addEventListener(STORAGE_EVENT, handleStorage);
  }
  return () => {
    subscribers.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(STORAGE_EVENT, handleStorage);
    }
  };
}

function getSnapshot(): StoredAccount[] {
  if (cachedSnapshot) return cachedSnapshot;
  cachedSnapshot = loadAccounts();
  return cachedSnapshot;
}

function getServerSnapshot(): StoredAccount[] {
  return serverSnapshot;
}

function notifyAccountsChanged() {
  cachedSnapshot = null;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(STORAGE_EVENT));
  }
}

export function useStoredAccounts() {
  const accounts = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const setAccounts = useCallback((next: StoredAccount[]) => {
    saveAccounts(next);
    notifyAccountsChanged();
  }, []);
  return { accounts, setAccounts };
}

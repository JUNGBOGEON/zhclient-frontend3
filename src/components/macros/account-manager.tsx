"use client";

import { useCallback, useState } from "react";

import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { PasswordInput, TextInput } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import type {
  AccountCheckResponse,
  AccountKind,
  CreateAccountPayload,
  StoredAccount,
  UpdateAccountPayload,
} from "@/types/api";

export { useStoredAccounts } from "@/lib/accounts";

const CHECK_LABEL: Record<string, string> = {
  client_version: "클라 버전",
  xigncode_cookie: "XIGNCODE 쿠키",
  integrated_account: "통합 계정 여부",
  legacy_account: "미통합 계정 여부",
  account_not_banned: "계정 정지 여부",
  credentials: "아이디/비번",
  character_exists: "캐릭터 존재",
};

export type AccountActions = {
  createAccount: (payload: CreateAccountPayload) => Promise<StoredAccount>;
  updateAccount: (
    id: string,
    payload: UpdateAccountPayload,
  ) => Promise<StoredAccount>;
  deleteAccount: (id: string) => Promise<void>;
  runCheck: (id: string) => Promise<AccountCheckResponse>;
};

type AccountManagerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: StoredAccount[];
  loading: boolean;
  errorMessage: string | null;
  actions: AccountActions;
};

export function AccountManager({
  open,
  onOpenChange,
  accounts,
  loading,
  errorMessage,
  actions,
}: AccountManagerProps) {
  if (!open) return null;
  return (
    <AccountManagerBody
      accounts={accounts}
      loading={loading}
      errorMessage={errorMessage}
      actions={actions}
      onOpenChange={onOpenChange}
    />
  );
}

function AccountManagerBody({
  accounts,
  loading,
  errorMessage,
  actions,
  onOpenChange,
}: Omit<AccountManagerProps, "open">) {
  const toast = useToast();
  const [label, setLabel] = useState("");
  const [gameUserId, setGameUserId] = useState("");
  const [password, setPassword] = useState("");
  const [kind, setKind] = useState<AccountKind>("integrated");
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async () => {
    if (!gameUserId.trim() || !password) {
      toast.show("아이디와 비밀번호를 입력해 주세요.", "error");
      return;
    }
    setSubmitting(true);
    try {
      await actions.createAccount({
        label: label.trim() || gameUserId.trim(),
        game_user_id: gameUserId.trim(),
        password,
        kind,
      });
      setLabel("");
      setGameUserId("");
      setPassword("");
      setKind("integrated");
      toast.show("저장됨", "success");
    } catch (err) {
      toast.show(errorToMessage(err, "저장 실패"), "error");
    } finally {
      setSubmitting(false);
    }
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
          계정은 서버 계정과 연결된 DB 에 저장됩니다. 비밀번호는 UI 로 다시 노출되지 않습니다.
        </p>
        {errorMessage ? (
          <p className="mt-3 rounded border border-[#f3727f]/30 bg-[#f3727f]/10 px-3 py-2 text-[12px] text-[#f3727f]">
            {errorMessage}
          </p>
        ) : null}

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
              placeholder="game_user_id"
              value={gameUserId}
              autoComplete="off"
              onChange={(e) => setGameUserId(e.target.value)}
            />
            <PasswordInput
              label="비밀번호"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button loading={submitting} onClick={handleAdd}>
              저장
            </Button>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-[13px] text-[#b3b3b3]">
            저장된 계정 ({accounts.length})
            {loading ? <span className="ml-2 text-[#7c7c7c]">불러오는 중…</span> : null}
          </h3>
          <div className="mt-2 flex flex-col gap-3">
            {!loading && accounts.length === 0 ? (
              <p className="rounded border border-dashed border-[#2a2a2a] px-4 py-6 text-center text-[13px] text-[#7c7c7c]">
                저장된 계정이 없습니다.
              </p>
            ) : (
              accounts.map((acct) => (
                <AccountRow key={acct.id} account={acct} actions={actions} />
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
  | { kind: "done"; response: AccountCheckResponse }
  | { kind: "error"; message: string };

function AccountRow({
  account,
  actions,
}: {
  account: StoredAccount;
  actions: AccountActions;
}) {
  const toast = useToast();
  const initialState: CheckState = account.last_check
    ? { kind: "done", response: account.last_check }
    : { kind: "idle" };
  const [state, setState] = useState<CheckState>(initialState);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const runCheck = useCallback(async () => {
    setState({ kind: "running", shown: [] });
    try {
      const res = await actions.runCheck(account.id);
      for (let i = 0; i <= res.checks.length; i += 1) {
        setState({ kind: "running", shown: res.checks.slice(0, i) });
        await new Promise((r) => setTimeout(r, 160));
      }
      setState({ kind: "done", response: res });

      // Auto-select the only slave, clear stale selections.
      let nextSelected: number | null | undefined = account.selected_slave_index;
      if (res.slaves.length === 1) {
        nextSelected = res.slaves[0].slave_index;
      } else if (
        nextSelected !== undefined &&
        nextSelected !== null &&
        !res.slaves.some((s) => s.slave_index === nextSelected)
      ) {
        nextSelected = null;
      }
      if (nextSelected !== account.selected_slave_index) {
        try {
          await actions.updateAccount(account.id, {
            selected_slave_index: nextSelected ?? null,
          });
        } catch {
          // Selection persistence is best-effort; the check result itself is already saved.
        }
      }
    } catch (err) {
      const msg = errorToMessage(err, "검사 실패");
      setState({ kind: "error", message: msg });
      toast.show(msg, "error");
    }
  }, [account, actions, toast]);

  const selectSlave = async (slave_index: number) => {
    try {
      await actions.updateAccount(account.id, { selected_slave_index: slave_index });
    } catch (err) {
      toast.show(errorToMessage(err, "선택 저장 실패"), "error");
    }
  };

  const handleRemove = async () => {
    if (!window.confirm(`${account.label} 삭제하시겠어요?`)) return;
    setDeleting(true);
    try {
      await actions.deleteAccount(account.id);
      toast.show("삭제됨", "info");
    } catch (err) {
      toast.show(errorToMessage(err, "삭제 실패"), "error");
    } finally {
      setDeleting(false);
    }
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
            {account.game_user_id}
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
          <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
            수정
          </Button>
          <Button
            variant="ghost"
            size="sm"
            loading={deleting}
            onClick={handleRemove}
          >
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

      {editOpen ? (
        <EditAccountForm
          account={account}
          onCancel={() => setEditOpen(false)}
          onSave={async (payload) => {
            try {
              await actions.updateAccount(account.id, payload);
              toast.show("수정됨", "success");
              setEditOpen(false);
            } catch (err) {
              toast.show(errorToMessage(err, "수정 실패"), "error");
            }
          }}
        />
      ) : null}
    </div>
  );
}

function EditAccountForm({
  account,
  onCancel,
  onSave,
}: {
  account: StoredAccount;
  onCancel: () => void;
  onSave: (payload: UpdateAccountPayload) => Promise<void>;
}) {
  const [label, setLabel] = useState(account.label);
  const [password, setPassword] = useState("");
  const [kind, setKind] = useState<AccountKind>(account.kind);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const payload: UpdateAccountPayload = {};
    if (label.trim() && label.trim() !== account.label) payload.label = label.trim();
    if (password.length > 0) payload.password = password;
    if (kind !== account.kind) payload.kind = kind;
    if (Object.keys(payload).length === 0) {
      onCancel();
      return;
    }
    setSaving(true);
    try {
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 flex flex-col gap-3 rounded border border-[#2a2a2a] bg-[#121212] p-3">
      <TextInput
        label="라벨"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <KindPicker value={kind} onChange={setKind} />
      <PasswordInput
        label="새 비밀번호 (비우면 유지)"
        placeholder="변경하지 않음"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          취소
        </Button>
        <Button size="sm" loading={saving} onClick={submit}>
          저장
        </Button>
      </div>
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

function errorToMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return `${err.status || "ERR"} ${err.message}`;
  if (err instanceof Error) return err.message;
  return fallback;
}

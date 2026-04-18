"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { PasswordInput, TextInput } from "@/components/ui/input";
import { useToast } from "@/components/providers/toast-provider";
import {
  loadAccounts,
  newAccountId,
  removeAccount,
  saveAccounts,
  upsertAccount,
} from "@/lib/accounts";
import type { StoredAccount } from "@/types/api";

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
      created_at: new Date().toISOString(),
    };
    const updated = upsertAccount(accounts, next);
    onAccountsChange(updated);
    setLabel("");
    setUserId("");
    setPassword("");
    toast.show(`${next.label} 저장됨`, "success");
  };

  const handleRemove = (id: string) => {
    const updated = removeAccount(accounts, id);
    onAccountsChange(updated);
    toast.show("저장된 계정을 삭제했습니다.", "info");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-10">
      <div className="relative w-full max-w-lg rounded-[8px] bg-[#181818] p-6">
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
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              닫기
            </Button>
            <Button onClick={handleAdd}>저장</Button>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-[13px] text-[#b3b3b3]">
            저장된 계정 ({accounts.length})
          </h3>
          <div className="mt-2">
            {accounts.length === 0 ? (
              <p className="rounded border border-dashed border-[#2a2a2a] px-4 py-6 text-center text-[13px] text-[#7c7c7c]">
                저장된 계정이 없습니다.
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {accounts.map((acct) => (
                  <li
                    key={acct.id}
                    className="flex items-center justify-between gap-3 rounded px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] text-white">
                        {acct.label}
                      </p>
                      <p className="truncate text-[12px] text-[#7c7c7c]">
                        {acct.user_id} · {formatSince(acct.created_at)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(acct.id)}
                    >
                      삭제
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatSince(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const days = Math.floor(diff / 86_400_000);
  if (days >= 1) return `${days}일 전 추가`;
  const hours = Math.floor(diff / 3_600_000);
  if (hours >= 1) return `${hours}시간 전`;
  const min = Math.floor(diff / 60_000);
  if (min >= 1) return `${min}분 전`;
  return "방금 추가";
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

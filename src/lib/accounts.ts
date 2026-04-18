import type { StoredAccount } from "@/types/api";

const STORAGE_KEY = "zh_saved_accounts";

export function loadAccounts(): StoredAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v): v is StoredAccount =>
        v &&
        typeof v.id === "string" &&
        typeof v.user_id === "string" &&
        typeof v.password === "string",
    );
  } catch {
    return [];
  }
}

export function saveAccounts(accounts: StoredAccount[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

export function upsertAccount(
  accounts: StoredAccount[],
  incoming: StoredAccount,
): StoredAccount[] {
  const existing = accounts.findIndex((a) => a.id === incoming.id);
  if (existing >= 0) {
    const next = accounts.slice();
    next[existing] = incoming;
    return next;
  }
  return [...accounts, incoming];
}

export function removeAccount(
  accounts: StoredAccount[],
  id: string,
): StoredAccount[] {
  return accounts.filter((a) => a.id !== id);
}

export function newAccountId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `acct-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

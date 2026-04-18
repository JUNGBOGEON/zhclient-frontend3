import type { AccountKind, StoredAccount } from "@/types/api";

const STORAGE_KEY = "zh_saved_accounts";

function coerceKind(value: unknown): AccountKind {
  return value === "non_integrated" ? "non_integrated" : "integrated";
}

export function loadAccounts(): StoredAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (v) =>
          v &&
          typeof v.id === "string" &&
          typeof v.user_id === "string" &&
          typeof v.password === "string",
      )
      .map((v): StoredAccount => ({
        id: String(v.id),
        label: typeof v.label === "string" ? v.label : String(v.user_id),
        user_id: String(v.user_id),
        password: String(v.password),
        kind: coerceKind(v.kind),
        created_at:
          typeof v.created_at === "string"
            ? v.created_at
            : new Date().toISOString(),
        last_checked_at:
          typeof v.last_checked_at === "string" ? v.last_checked_at : undefined,
        last_check:
          v.last_check && typeof v.last_check === "object"
            ? v.last_check
            : undefined,
        selected_slave_index:
          typeof v.selected_slave_index === "number"
            ? v.selected_slave_index
            : undefined,
      }));
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

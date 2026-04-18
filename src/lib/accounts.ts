import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

import { api } from "@/lib/api";
import type {
  CreateAccountPayload,
  StoredAccount,
  UpdateAccountPayload,
} from "@/types/api";

const LEGACY_STORAGE_KEY = "zh_saved_accounts";
const MIGRATION_FLAG_KEY = "zh_saved_accounts_migrated_v2";

type StoreState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; accounts: StoredAccount[] }
  | { status: "error"; message: string; accounts: StoredAccount[] };

let state: StoreState = { status: "idle" };
let inflight: Promise<void> | null = null;
const subscribers = new Set<() => void>();
const emptyServerSnapshot: StoredAccount[] = [];

function emit() {
  for (const fn of subscribers) fn();
}

function setState(next: StoreState) {
  state = next;
  emit();
}

function subscribe(listener: () => void) {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

function getSnapshot(): StoreState {
  return state;
}

function getServerSnapshot(): StoreState {
  return { status: "loading" };
}

async function refresh(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    if (state.status === "idle") setState({ status: "loading" });
    try {
      const accounts = await api.listMyAccounts();
      setState({ status: "ready", accounts });
    } catch (err) {
      const message = err instanceof Error ? err.message : "계정 목록 로드 실패";
      const prev =
        state.status === "ready" ? state.accounts : emptyServerSnapshot;
      setState({ status: "error", message, accounts: prev });
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/**
 * One-shot migration: move pre-DB localStorage accounts to the server,
 * then delete the legacy key. Safe to call on every mount — guarded by
 * a separate flag key so repeat calls are no-ops.
 */
async function migrateLegacyAccounts(): Promise<void> {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(MIGRATION_FLAG_KEY) === "1") return;
  const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(MIGRATION_FLAG_KEY, "1");
    return;
  }
  let legacy: unknown;
  try {
    legacy = JSON.parse(raw);
  } catch {
    localStorage.setItem(MIGRATION_FLAG_KEY, "1");
    return;
  }
  if (!Array.isArray(legacy) || legacy.length === 0) {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    localStorage.setItem(MIGRATION_FLAG_KEY, "1");
    return;
  }
  for (const item of legacy) {
    if (
      !item ||
      typeof item !== "object" ||
      typeof (item as { user_id?: unknown }).user_id !== "string" ||
      typeof (item as { password?: unknown }).password !== "string"
    ) {
      continue;
    }
    const row = item as {
      user_id: string;
      password: string;
      label?: unknown;
      kind?: unknown;
    };
    try {
      await api.createMyAccount({
        label:
          typeof row.label === "string" && row.label.trim().length > 0
            ? row.label.trim()
            : row.user_id,
        game_user_id: row.user_id,
        password: row.password,
        kind: row.kind === "non_integrated" ? "non_integrated" : "integrated",
      });
    } catch {
      // Skip the individual row but keep migrating the rest.
    }
  }
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  localStorage.setItem(MIGRATION_FLAG_KEY, "1");
}

export function useStoredAccounts() {
  const storeState = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    void (async () => {
      await migrateLegacyAccounts();
      await refresh();
    })();
  }, []);

  const accounts =
    storeState.status === "ready" || storeState.status === "error"
      ? storeState.accounts
      : emptyServerSnapshot;

  const loading =
    storeState.status === "idle" || storeState.status === "loading";

  const errorMessage =
    storeState.status === "error" ? storeState.message : null;

  const reload = useCallback(() => refresh(), []);

  const createAccount = useCallback(async (payload: CreateAccountPayload) => {
    const acct = await api.createMyAccount(payload);
    await refresh();
    return acct;
  }, []);

  const updateAccount = useCallback(
    async (id: string, payload: UpdateAccountPayload) => {
      const acct = await api.updateMyAccount(id, payload);
      await refresh();
      return acct;
    },
    [],
  );

  const deleteAccount = useCallback(async (id: string) => {
    await api.deleteMyAccount(id);
    await refresh();
  }, []);

  const runCheck = useCallback(async (id: string) => {
    const result = await api.runMyAccountCheck(id);
    await refresh();
    return result;
  }, []);

  return {
    accounts,
    loading,
    errorMessage,
    reload,
    createAccount,
    updateAccount,
    deleteAccount,
    runCheck,
  };
}
